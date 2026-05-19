/**
 * pages/api/whatsapp/webhook.js
 *
 * Security:
 *   - GET:  verify Meta hub.verify_token
 *   - POST: verify X-Hub-Signature-256 HMAC (REQUIRED for production)
 *
 * Uses messageProcessor.js as the single processing pipeline.
 */

import crypto from "crypto";
import { processMessage } from "../../../lib/messageProcessor";
import { logMessage } from "../../../lib/db";
import { enqueue } from "../../../lib/queue";

export const config = { api: { bodyParser: false } }; // raw body for signature check

// ── Read raw body ─────────────────────────────────────────────────────────
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// ── Verify Meta signature ─────────────────────────────────────────────────
function verifySignature(rawBody, signature) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    // Dev mode: skip signature check (warn loudly)
    console.warn("[WhatsApp] ⚠️  WHATSAPP_APP_SECRET not set — skipping signature check. Set it in production!");
    return true;
  }
  if (!signature) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ── Deduplication ────────────────────────────────────────────────────────
const _seen = new Set();
function isDuplicate(msgId) {
  if (!msgId) return false;
  if (_seen.has(msgId)) return true;
  _seen.add(msgId);
  setTimeout(() => _seen.delete(msgId), 5 * 60 * 1000);
  return false;
}

// ── Send via WhatsApp Cloud API ──────────────────────────────────────────
async function sendWhatsAppMessage(to, text) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN");

  const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("[WhatsApp] Send failed:", JSON.stringify(data));
    throw new Error(data?.error?.message || "WhatsApp send failed");
  }
  return data;
}

// ── Resolve userId from phone number ID (multi-tenant ready) ─────────────
async function resolveUserId(phoneNumberId) {
  if (!phoneNumberId) return 1;
  try {
    const { default: getDb, dbGet } = await import("../../../lib/db");
    const db = await getDb();
    const user = await dbGet(db, "SELECT id FROM users WHERE whatsapp_phone_id=$1", [phoneNumberId]);
    return user?.id || 1;
  } catch { return 1; }
}

// ── Main handler ─────────────────────────────────────────────────────────
export default async function handler(req, res) {

  // GET — webhook verification
  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("[WhatsApp] ✅ Webhook verified");
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: "Forbidden" });
  }

  // POST — incoming messages
  if (req.method === "POST") {
    const rawBody = await getRawBody(req);
    const signature = req.headers["x-hub-signature-256"] || "";

    // Verify signature BEFORE processing anything
    if (!verifySignature(rawBody, signature)) {
      console.error("[WhatsApp] ❌ Invalid signature — request rejected");
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Respond immediately — Meta retries if we're slow
    res.status(200).json({ ok: true });

    try {
      const body = JSON.parse(rawBody.toString());
      if (body?.object !== "whatsapp_business_account") return;

      for (const entry of (body?.entry || [])) {
        for (const change of (entry?.changes || [])) {
          const value = change?.value;
          for (const msg of (value?.messages || [])) {
            if (msg?.type !== "text") continue;
            if (isDuplicate(msg?.id)) continue;

            const from = msg?.from;
            const text = msg?.text?.body?.trim();
            if (!from || !text || text.length > 2000) continue;

            const userId = await resolveUserId(value?.metadata?.phone_number_id);
            const { reply, intent, lang } = await processMessage({ senderId: from, text, userId, source: "whatsapp" });

            if (reply) {
              await enqueue({ to: from, text: reply, sendFn: sendWhatsAppMessage });
              await logMessage({ userId, phone: from, text: reply, type: "outgoing", language: lang, intent, source: "whatsapp" });
            }
          }
        }
      }
    } catch (err) {
      console.error("[WhatsApp] Processing error:", err.message);
    }
    return;
  }

  return res.status(405).json({ error: "Method not allowed" });
}
