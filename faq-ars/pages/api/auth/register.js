// pages/api/auth/register.js
import bcrypt from "bcryptjs";
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { signToken, getTokenCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { name, email, password } = req.body || {};
  if (!email || !password || !name)
    return res.status(400).json({ error: "Name, email and password are required." });
  if (typeof password !== "string" || password.length < 6)
    return res.status(400).json({ error: "Password must be at least 6 characters." });

  const db = await getDb();
  const existing = dbGet(db, "SELECT id FROM users WHERE email = ?", [email.toLowerCase().trim()]);
  if (existing) return res.status(409).json({ error: "An account with that email already exists." });

  const hash = bcrypt.hashSync(password, 10);
  const result = dbRun(db,
    "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
    [email.toLowerCase().trim(), hash, name.trim()]
  );

  const token = signToken({ id: result.lastInsertRowid, email, name });
  res.setHeader("Set-Cookie", getTokenCookie(token));
  return res.status(201).json({ ok: true });
}
