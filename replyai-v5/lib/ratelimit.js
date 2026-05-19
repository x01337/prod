/**
 * lib/ratelimit.js  —  Simple in-memory rate limiter
 *
 * No Redis required. Resets on server restart (fine for MVP).
 * For production at scale, swap with Upstash Redis.
 *
 * Usage:
 *   import { rateLimit } from '../lib/ratelimit';
 *   const allowed = rateLimit(req, { limit: 20, window: 60 });
 *   if (!allowed) return res.status(429).json({ error: 'Too many requests' });
 */

const store = new Map(); // ip → [timestamps]

/**
 * @param {object} req        — Next.js request
 * @param {object} opts
 * @param {number} opts.limit  — max requests per window (default: 30)
 * @param {number} opts.window — window in seconds (default: 60)
 * @returns {boolean} true = allowed, false = rate-limited
 */
export function rateLimit(req, { limit = 30, window = 60 } = {}) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const windowMs = window * 1000;
  const cutoff = now - windowMs;

  const hits = (store.get(ip) || []).filter((t) => t > cutoff);
  hits.push(now);
  store.set(ip, hits);

  // Cleanup old IPs every ~500 requests to prevent memory leak
  if (store.size > 500) {
    for (const [key, times] of store) {
      if (Math.max(...times) < cutoff) store.delete(key);
    }
  }

  return hits.length <= limit;
}

/**
 * Sanitise and validate an incoming question string.
 * Returns { ok, question } or { ok: false, error }
 */
export function sanitiseQuestion(raw) {
  if (typeof raw !== "string") return { ok: false, error: "question must be a string" };
  const q = raw.trim().slice(0, 500); // hard cap at 500 chars
  if (!q) return { ok: false, error: "question is required" };
  if (q.length < 2) return { ok: false, error: "question is too short" };
  return { ok: true, question: q };
}
