// pages/api/faqs/index.js  —  GET /api/faqs | POST /api/faqs
import getDb, { dbAll, dbGet, dbRun } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { extractKeywords } from "../../../lib/matcher";
import { SEED_FAQS } from "../../../lib/seed";

async function seedIfEmpty(db, userId) {
  const count = await dbGet(db, "SELECT COUNT(*) AS n FROM faqs WHERE user_id=$1", [userId]);
  const n = count?.n ?? count?.count ?? 0;
  if (parseInt(n) === 0) {
    for (const faq of SEED_FAQS) {
      await dbRun(db,
        "INSERT INTO faqs (user_id,question,answer,keywords) VALUES ($1,$2,$3,$4)",
        [userId, faq.question, faq.answer, faq.keywords]
      );
    }
  }
}

export default async function handler(req, res) {
  try {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = await getDb();

  if (req.method === "GET") {
    await seedIfEmpty(db, user.id);
    const faqs = await dbAll(db,
      "SELECT id,question,answer,keywords,created_at FROM faqs WHERE user_id=$1 ORDER BY created_at DESC",
      [user.id]
    );
    return res.status(200).json(faqs);
  }

  if (req.method === "POST") {
    const { question, answer, keywords } = req.body || {};
    if (!question?.trim() || !answer?.trim())
      return res.status(400).json({ error: "Question and answer are required." });

    const kw = keywords?.trim() || extractKeywords(question);
    const { lastInsertRowid } = await dbRun(db,
      "INSERT INTO faqs (user_id,question,answer,keywords) VALUES ($1,$2,$3,$4)",
      [user.id, question.trim(), answer.trim(), kw]
    );
    const faq = await dbGet(db, "SELECT * FROM faqs WHERE id=$1", [lastInsertRowid]);
    return res.status(201).json(faq);
  }

  res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[faqs]", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Server error." });
  }
}