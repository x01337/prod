/**
 * lib/messageProcessor.js — Central message processing pipeline
 *
 * Used by ALL channels: WhatsApp, Instagram, web chat.
 * Single source of truth for message logic.
 *
 * Flow:
 *   1. Detect language
 *   2. Detect intent (greeting | booking | cancel | unknown)
 *   3. Route to handler
 *   4. Return { reply, intent, lang }
 */

import { detectLanguage, t } from "./i18n";
import { detectIntent } from "./intents";
import { processBookingMessage } from "./bookingFlow";
import { findBestMatch } from "./matcher";
import { getAIAnswer } from "./ai";
import { logMessage, logMissedMessage } from "./db";
import getDb, { dbAll } from "./db";

/**
 * Process one incoming message.
 *
 * @param {object} opts
 * @param {string} opts.senderId  - unique sender ID (phone, web session, etc.)
 * @param {string} opts.text      - raw message text
 * @param {number} opts.userId    - business owner ID
 * @param {string} opts.source    - "whatsapp" | "instagram" | "web" | "dashboard"
 * @param {string} [opts.lang]    - pre-detected language (optional override)
 *
 * @returns {Promise<{ reply: string, intent: string, lang: string }>}
 */
export async function processMessage({ senderId, text, userId, source, lang: forceLang }) {
  if (!text || typeof text !== "string") {
    return { reply: null, intent: "invalid", lang: "en" };
  }

  const clean = text.trim().slice(0, 2000);
  const lang  = forceLang || detectLanguage(clean);
  const { intent, confidence } = detectIntent(clean, lang);

  // ── 1. Greeting ──────────────────────────────────────────────────────────
  if (intent === "greeting" && confidence > 0.2) {
    await logMessage({ userId, phone: senderId, text: clean, type: "incoming", language: lang, intent: "greeting", source });
    const reply = source === "whatsapp" || source === "instagram"
      ? t("welcome_dm", lang)
      : t("greeting", lang);
    return { reply, intent: "greeting", lang };
  }

  // ── 2. Booking flow (handles cancel internally) ──────────────────────────
  const booking = await processBookingMessage(senderId, clean, lang, userId, source);
  if (booking.isBooking || booking.intent === "cancel") {
    return { reply: booking.reply, intent: booking.intent, lang };
  }

  // ── 3. FAQ matcher + AI fallback ─────────────────────────────────────────
  await logMessage({ userId, phone: senderId, text: clean, type: "incoming", language: lang, intent, source });

  const db   = await getDb();
  const faqs = await dbAll(db, "SELECT * FROM faqs WHERE user_id=$1", [userId]);
  const matcherResult = findBestMatch(clean, faqs);
  const result = await getAIAnswer(clean, faqs, matcherResult, lang);

  if (result.source === "fallback") {
    await logMissedMessage({ userId, phone: senderId, text: clean, language: lang, source });
    return { reply: t("fallback", lang), intent: "unknown", lang };
  }

  return { reply: result.answer, intent: "faq", lang };
}
