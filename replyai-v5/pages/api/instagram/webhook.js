// pages/api/instagram/webhook.js
//
// Instagram DM webhook — multi-language auto-reply + booking flow
//
// GET  → Meta webhook verification
// POST → Incoming DM → detect lang → booking flow OR welcome reply
//
// Required env vars:
//   INSTAGRAM_VERIFY_TOKEN
//   INSTAGRAM_PAGE_ACCESS_TOKEN

export const config = { api: { bodyParser: true } };

import { detectLanguage, t } from "../../../lib/i18n";
import { processBookingMessage } from "../../../lib/bookingFlow";

// ── Send Instagram DM via Graph API ──────────────────────────────────────────
async function sendInstagramMessage(recipientId, text) {
  const token = process.env.INSTAGRAM_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_PAGE_ACCESS_TOKEN is not set");

  const res = await fetch("https://graph.facebook.com/v18.0/me/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[Instagram] Send failed:", JSON.stringify(data));
    throw new Error(data?.error?.message || "Instagram send failed");
  }

  console.log(`[Instagram] Sent to ${recipientId} → message_id:`, data.message_id);
  return data;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {

  // ── GET: Webhook verification ─────────────────────────────────────────────
  if (req.method === "GET") {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
      console.log("[Instagram] Webhook verified ✅");
      return res.status(200).send(challenge);
    }
    console.warn("[Instagram] Verification failed");
    return res.status(403).json({ error: "Forbidden" });
  }

  // ── POST: Incoming event ──────────────────────────────────────────────────
  if (req.method === "POST") {
    res.status(200).json({ ok: true });

    try {
      const body = req.body;
      if (body?.object !== "instagram" && body?.object !== "page") return;

      for (const entry of (body?.entry || [])) {
        for (const event of (entry?.messaging || [])) {
          const senderId = event?.sender?.id;
          const pageId   = event?.recipient?.id;
          const message  = event?.message;

          if (!senderId) continue;
          if (senderId === pageId) continue;       // ignore our own echoes
          if (event?.message?.is_echo) continue;

          const text = message?.text?.trim();
          if (!text) continue;

          console.log(`[Instagram] DM from ${senderId}: "${text}"`);

          const lang    = detectLanguage(text);
          const booking = await processBookingMessage(senderId, text, lang, 1, "instagram");

          if (booking.isBooking) {
            await sendInstagramMessage(senderId, booking.reply);
            continue;
          }

          await sendInstagramMessage(senderId, t("welcome_dm", lang));
        }
      }
    } catch (err) {
      console.error("[Instagram] Processing error:", err.message);
    }

    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
