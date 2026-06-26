/**
 * lib/queue.js — Basic in-memory message queue with retry logic
 *
 * Handles transient WhatsApp API failures by retrying failed sends.
 * In production, swap backing store for Redis / BullMQ for persistence.
 *
 * Usage:
 *   import { enqueue } from '../lib/queue';
 *   await enqueue({ to, text, sendFn });
 */

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000; // 2s between retries

// In-memory queue: Array<{ id, to, text, sendFn, attempts, status }>
const _queue = [];
let _processing = false;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Add a message to the send queue.
 * @param {{ to: string, text: string, sendFn: Function }} job
 */
export async function enqueue(job) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    to: job.to,
    text: job.text,
    sendFn: job.sendFn,
    attempts: 0,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  _queue.push(entry);

  // Process immediately if not already running
  if (!_processing) {
    processQueue();
  }
}

async function processQueue() {
  if (_processing) return;
  _processing = true;

  while (_queue.some((j) => j.status === "pending" || j.status === "retrying")) {
    const job = _queue.find((j) => j.status === "pending" || j.status === "retrying");
    if (!job) break;

    job.status = "processing";
    job.attempts++;

    try {
      await job.sendFn(job.to, job.text);
      job.status = "done";
      console.log(`[Queue] ✅ Message sent to ${job.to} (attempt ${job.attempts})`);
    } catch (err) {
      console.error(`[Queue] ❌ Failed (attempt ${job.attempts}/${MAX_ATTEMPTS}):`, err.message);

      if (job.attempts < MAX_ATTEMPTS) {
        job.status = "retrying";
        await sleep(RETRY_DELAY_MS * job.attempts); // exponential backoff
      } else {
        job.status = "failed";
        console.error(`[Queue] 💀 Message to ${job.to} permanently failed after ${job.attempts} attempts`);
      }
    }
  }

  // Cleanup done/failed jobs older than 5 minutes
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (let i = _queue.length - 1; i >= 0; i--) {
    if (
      (_queue[i].status === "done" || _queue[i].status === "failed") &&
      new Date(_queue[i].createdAt).getTime() < cutoff
    ) {
      _queue.splice(i, 1);
    }
  }

  _processing = false;
}

/** Get queue status for monitoring */
export function getQueueStatus() {
  return {
    total: _queue.length,
    pending: _queue.filter((j) => j.status === "pending").length,
    processing: _queue.filter((j) => j.status === "processing").length,
    retrying: _queue.filter((j) => j.status === "retrying").length,
    done: _queue.filter((j) => j.status === "done").length,
    failed: _queue.filter((j) => j.status === "failed").length,
  };
}
