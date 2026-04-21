// pages/api/auth/login.js
import bcrypt from "bcryptjs";
import getDb, { dbGet } from "../../../lib/db";
import { signToken, getTokenCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const db = await getDb();
  const user = dbGet(db, "SELECT * FROM users WHERE email = ?", [email.toLowerCase().trim()]);

  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Invalid email or password." });

  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.setHeader("Set-Cookie", getTokenCookie(token));
  return res.status(200).json({ ok: true });
}
