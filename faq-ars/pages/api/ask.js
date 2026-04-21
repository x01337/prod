// pages/api/ask.js
// POST { question } → { found, answer, matchedQuestion, score, faqId }
import getDb, { dbAll } from "../../lib/db";
import { getUserFromRequest } from "../../lib/auth";
import { findBestMatch } from "../../lib/matcher";

const MIN_SCORE = 0.08; // confidence threshold

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { question } = req.body || {};
  if (!question?.trim()) return res.status(400).json({ error: "question is required." });

  // Auth: dashboard user OR public embed (?userId=)
  let userId;
  const authUser = getUserFromRequest(req);
  if (authUser) {
    userId = authUser.id;
  } else if (req.query.userId) {
    userId = parseInt(req.query.userId, 10);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId." });
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const db = await getDb();
  const faqs = dbAll(db, "SELECT * FROM faqs WHERE user_id = ?", [userId]);

  if (faqs.length === 0) {
    return res.status(200).json({
      found: false,
      answer: "No FAQs have been added yet.",
      matchedQuestion: null,
      score: 0,
    });
  }

  const result = findBestMatch(question.trim(), faqs);

  if (!result || result.score < MIN_SCORE) {
    return res.status(200).json({
      found: false,
      answer: "I'm sorry, I couldn't find an answer to that question. Please contact us directly.",
      matchedQuestion: null,
      score: result?.score ?? 0,
    });
  }

  return res.status(200).json({
    found: true,
    answer: result.faq.answer,
    matchedQuestion: result.faq.question,
    score: parseFloat(result.score.toFixed(4)),
    faqId: result.faq.id,
  });
}
