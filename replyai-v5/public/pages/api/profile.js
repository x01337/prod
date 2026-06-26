/**
 * pages/api/profile.js
 *
 * GET  → { id, email, name, avatar_url, plan, email_verified }
 * PUT  { name?, email?, avatar_url? } → update profile
 *      Changing email requires a new verification.
 */

import bcrypt from "bcryptjs";
import getDb, { dbGet, dbRun } from "../../lib/db";
import { requireAuth } from "../../lib/auth";
import { rateLimit } from "../../lib/ratelimit";
import { v, collect, sanitize } from "../../lib/validate";

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return;

  const db = await getDb();

  if (req.method === "GET") {
    const row = await dbGet(db,
      "SELECT id, email, name, avatar_url, plan, email_verified FROM users WHERE id=$1",
      [user.id]
    );
    if (!row) return res.status(404).json({ error: "Not found." });
    return res.status(200).json({
      ...row,
      email_verified: row.email_verified === true || row.email_verified === 1,
    });
  }

  if (req.method === "PUT") {
    if (!rateLimit(req, { limit: 10, window: 300 }))
      return res.status(429).json({ error: "Too many requests." });

    const { name, email, avatar_url, current_password, new_password } = req.body || {};
    const updates = [];
    const params  = [];
    let   idx     = 1;

    if (name !== undefined) {
      const err = v.name(name);
      if (err) return res.status(400).json({ error: err });
      updates.push(`name=$${idx++}`); params.push(sanitize(name));
    }

    if (email !== undefined) {
      const err = v.email(email);
      if (err) return res.status(400).json({ error: err });
      const newEmail = email.toLowerCase().trim();
      // Check not taken by another user
      const taken = await dbGet(db, "SELECT id FROM users WHERE email=$1 AND id!=$2", [newEmail, user.id]);
      if (taken) return res.status(409).json({ error: "Email already in use." });
      updates.push(`email=$${idx++}`, `email_verified=0`);
      params.push(newEmail);
    }

    if (avatar_url !== undefined) {
      // Only allow https URLs or empty string
      if (avatar_url && !/^https:\/\/.+/.test(avatar_url))
        return res.status(400).json({ error: "avatar_url must be an https URL." });
      if (avatar_url.length > 500)
        return res.status(400).json({ error: "avatar_url too long." });
      updates.push(`avatar_url=$${idx++}`); params.push(avatar_url);
    }

    if (new_password) {
      // Require current password to change password
      const row = await dbGet(db, "SELECT password FROM users WHERE id=$1", [user.id]);
      if (!current_password || !bcrypt.compareSync(current_password, row.password))
        return res.status(401).json({ error: "Current password is incorrect." });
      const err = v.password(new_password);
      if (err) return res.status(400).json({ error: err });
      const hash = bcrypt.hashSync(new_password, 12);
      updates.push(`password=$${idx++}`); params.push(hash);
    }

    if (!updates.length) return res.status(400).json({ error: "Nothing to update." });

    params.push(user.id);
    await dbRun(db, `UPDATE users SET ${updates.join(",")} WHERE id=$${idx}`, params);

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed." });
}
