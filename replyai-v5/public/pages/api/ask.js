/**
 * pages/api/ask.js — Authenticated chat endpoint (dashboard Chat Bot tab)
 *
 * POST { question, lang? } → { answer, found, score, source, lang }
 * Requires auth cookie.
 * All booking is now handled internally via bookingFlow.
 */

import getDb, { dbAll } from "../../lib/db";
import { logMessage, logMissedMessage } from "../../lib/db";
import { getUserFromRequest } from "../../lib/auth";
import { findBestMatch } from "../../lib/matcher";
import { getAIAnswer } from "../../lib/ai";
import { detectLanguage } from "../../lib/i18n";
import { detectIntent } from "../../lib/intents";
import { processBookingMessage } from "../../lib/bookingFlow";
import { sanitiseQuestion } from "../../lib/ratelimit";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const authUser = getUserFromRequest(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

  const { ok, question, error } = sanitiseQuestion(req.body?.question);
  if (!ok) return res.status(400).json({ error });

  const lang = req.body?.lang || detectLanguage(question);
  const { intent } = detectIntent(question, lang);

  // Booking flow (internal)
  const bookingResult = await processBookingMessage(
    `dashboard_${authUser.id}`,
    question, lang, authUser.id, "dashboard"
  );

  if (bookingResult.isBooking) {
    return res.status(200).json({
      found: true,
      answer: bookingResult.reply,
      matchedQuestion: null,
      score: 1,
      source: "booking",
      lang,
      type: "booking",
    });
  }

  // FAQ + AI fallback
  await logMessage({ userId: authUser.id, phone: "dashboard", text: question, type: "incoming", language: lang, intent, source: "dashboard" });

  const db   = await getDb();
  const faqs = await dbAll(db, "SELECT * FROM faqs WHERE user_id=$1", [authUser.id]);
  const matcherResult = findBestMatch(question, faqs);
  const result = await getAIAnswer(question, faqs, matcherResult, lang);

  if (result.source === "fallback") {
    await logMissedMessage({ userId: authUser.id, phone: "dashboard", text: question, language: lang, source: "dashboard" });
  }

  await logMessage({ userId: authUser.id, phone: "dashboard", text: result.answer, type: "outgoing", language: lang, intent, source: "dashboard" });

  return res.status(200).json({
    found: result.source !== "fallback",
    answer: result.answer,
    matchedQuestion: result.matchedQuestion ?? null,
    score: parseFloat((result.score || 0).toFixed(4)),
    source: result.source,
    lang,
    type: result.source,
  });
}
