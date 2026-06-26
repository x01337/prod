/**
 * pages/api/public/ask.js
 * Public chat endpoint — no auth needed, requires ?userId=
 * POST { question } → { answer, lang, type, found, score, source }
 */
import getDb, { dbAll, dbGet } from "../../../lib/db";
import { logMessage, logMissedMessage } from "../../../lib/db";
import { findBestMatch } from "../../../lib/matcher";
import { getAIAnswer } from "../../../lib/ai";
import { rateLimit, sanitiseQuestion } from "../../../lib/ratelimit";
import { detectLanguage, detectBookingIntent, t } from "../../../lib/i18n";
import { detectIntent } from "../../../lib/intents";
import { processBookingMessage } from "../../../lib/bookingFlow";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  if (!rateLimit(req, { limit: 20, window: 60 }))
    return res.status(429).json({ error: "Too many requests." });

  const userId = parseInt(req.query.userId, 10);
  if (!userId || isNaN(userId))
    return res.status(400).json({ error: "Invalid userId" });

  const { ok, question, error } = sanitiseQuestion(req.body?.question);
  if (!ok) return res.status(400).json({ error });

  const lang = detectLanguage(question);
  const { intent } = detectIntent(question, lang);

  const senderId = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "web";

  // Booking flow
  const bookingResult = await processBookingMessage(senderId, question, lang, userId, "web");
  if (bookingResult.isBooking) {
    await logMessage({ userId, phone: "web", text: bookingResult.reply, type: "outgoing", language: lang, intent: "booking", source: "web" });
    return res.status(200).json({
      found: true, answer: bookingResult.reply, matchedQuestion: null,
      score: 1, source: "booking", lang, type: "booking",
    });
  }

  // FAQ + AI fallback
  await logMessage({ userId, phone: "web", text: question, type: "incoming", language: lang, intent, source: "web" });

  const db = await getDb();
  const faqs = await dbAll(db, "SELECT * FROM faqs WHERE user_id=$1", [userId]);
  const matcherResult = findBestMatch(question, faqs);
  const result = await getAIAnswer(question, faqs, matcherResult, lang);

  if (result.source === "fallback") {
    await logMissedMessage({ userId, phone: "web", text: question, language: lang, source: "web" });
  }

  const replyText = result.answer;
  await logMessage({ userId, phone: "web", text: replyText, type: "outgoing", language: lang, intent, source: "web" });

  return res.status(200).json({
    found: result.source !== "fallback",
    answer: result.answer,
    matchedQuestion: result.matchedQuestion ?? null,
    score: parseFloat((result.score || 0).toFixed(4)),
    source: result.source,
    lang,
    type: result.source === "fallback" ? "fallback" : result.source === "ai" ? "ai" : "faq",
  });
}
