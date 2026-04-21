// pages/api/faqs/index.js
import getDb, { dbAll, dbGet, dbRun } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { extractKeywords } from "../../../lib/matcher";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = await getDb();

  if (req.method === "GET") {
    const faqs = dbAll(db, "SELECT * FROM faqs WHERE user_id = ? ORDER BY created_at DESC", [user.id]);
    return res.status(200).json(faqs);
  }

  if (req.method === "POST") {
    const { question, answer, keywords } = req.body || {};
    if (!question?.trim() || !answer?.trim())
      return res.status(400).json({ error: "Question and answer are required." });

    const kw = keywords?.trim() || extractKeywords(question);
    const result = dbRun(db,
      "INSERT INTO faqs (user_id, question, answer, keywords) VALUES (?, ?, ?, ?)",
      [user.id, question.trim(), answer.trim(), kw]
    );
    const faq = dbGet(db, "SELECT * FROM faqs WHERE id = ?", [result.lastInsertRowid]);
    return res.status(201).json(faq);
  }

  res.status(405).json({ error: "Method not allowed" });
}
