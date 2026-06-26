/**
 * GET /api/auth/me → { user: { id, email, name, avatar_url, plan, email_verified } }
 */
import getDb, { dbGet } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const auth = requireAuth(req, res);
  if (!auth) return;
  const db   = await getDb();
  const user = await dbGet(db,
    "SELECT id, email, name, avatar_url, plan, email_verified FROM users WHERE id=$1",
    [auth.id]
  );
  if (!user) return res.status(404).json({ error: "User not found." });
  return res.status(200).json({
    user: {
      ...user,
      email_verified: user.email_verified === true || user.email_verified === 1,
    }
  });
}
