// pages/api/faqs/[id].js
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { extractKeywords } from "../../../lib/matcher";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const db = await getDb();

  const faq = dbGet(db, "SELECT * FROM faqs WHERE id = ? AND user_id = ?", [id, user.id]);
  if (!faq) return res.status(404).json({ error: "FAQ not found." });

  if (req.method === "PUT") {
    const { question, answer, keywords } = req.body || {};
    if (!question?.trim() || !answer?.trim())
      return res.status(400).json({ error: "Question and answer are required." });
    const kw = keywords?.trim() || extractKeywords(question);
    dbRun(db,
      "UPDATE faqs SET question = ?, answer = ?, keywords = ? WHERE id = ? AND user_id = ?",
      [question.trim(), answer.trim(), kw, id, user.id]
    );
    const updated = dbGet(db, "SELECT * FROM faqs WHERE id = ?", [id]);
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    dbRun(db, "DELETE FROM faqs WHERE id = ? AND user_id = ?", [id, user.id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
}
