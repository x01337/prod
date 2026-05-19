// pages/api/faqs/[id].js  —  PUT /api/faqs/:id | DELETE /api/faqs/:id
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { extractKeywords } from "../../../lib/matcher";

export default async function handler(req, res) {
  try {
  const user = requireAuth(req, res);
  if (!user) return;

  const { id } = req.query;
  const db = await getDb();

  const faq = await dbGet(db, "SELECT * FROM faqs WHERE id=$1 AND user_id=$2", [id, user.id]);
  if (!faq) return res.status(404).json({ error: "FAQ not found." });

  if (req.method === "PUT") {
    const { question, answer, keywords } = req.body || {};
    if (!question?.trim() || !answer?.trim())
      return res.status(400).json({ error: "Question and answer are required." });

    const kw = keywords?.trim() || extractKeywords(question);
    await dbRun(db,
      "UPDATE faqs SET question=$1,answer=$2,keywords=$3 WHERE id=$4 AND user_id=$5",
      [question.trim(), answer.trim(), kw, id, user.id]
    );
    return res.status(200).json(await dbGet(db, "SELECT * FROM faqs WHERE id=$1", [id]));
  }

  if (req.method === "DELETE") {
    await dbRun(db, "DELETE FROM faqs WHERE id=$1 AND user_id=$2", [id, user.id]);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[faqs]", err.message);
    if (!res.headersSent) res.status(500).json({ error: "Server error." });
  }
}