import bcrypt from "bcryptjs";
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { signToken, setTokenCookie } from "../../../lib/auth";
import { rateLimit } from "../../../lib/ratelimit";
import { v } from "../../../lib/validate";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!rateLimit(req, { limit:10, window:900 })) return res.status(429).json({ error:"Too many attempts." });

  const { token, password } = req.body || {};
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error:"Invalid reset link." });
  const pwErr = v.password(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  const db  = await getDb();
  const row = await dbGet(db, "SELECT * FROM password_reset_tokens WHERE token=$1", [token]);
  if (!row)                                      return res.status(400).json({ error:"Invalid reset link. Please request a new one." });
  if (row.used===true||row.used===1)             return res.status(400).json({ error:"This link has already been used." });
  if (new Date(row.expires_at) < new Date())     return res.status(400).json({ error:"This link has expired. Please request a new one." });

  const user = await dbGet(db, "SELECT id,email,name FROM users WHERE id=$1", [row.user_id]);
  if (!user) return res.status(400).json({ error:"User not found." });

  const hash = bcrypt.hashSync(password, 12);
  await dbRun(db, "UPDATE users SET password=$1 WHERE id=$2", [hash, user.id]);
  await dbRun(db, "UPDATE password_reset_tokens SET used=$1 WHERE id=$2", [true, row.id]);
  await dbRun(db, "DELETE FROM password_reset_tokens WHERE user_id=$1 AND (used=$2 OR expires_at<$3)", [user.id, true, new Date().toISOString()]);

  const jwtToken = signToken({ id:user.id, email:user.email, name:user.name });
  res.setHeader("Set-Cookie", setTokenCookie(jwtToken));
  return res.status(200).json({ ok:true });
}
