/**
 * pages/api/services/index.js
 * GET  → list services
 * POST → create service (name, price, duration, color)
 */
import getDb, { dbAll, dbRun } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { rateLimit } from "../../../lib/ratelimit";
import { v, collect, sanitize } from "../../../lib/validate";

export default async function handler(req, res) {
  try {
    const user = requireAuth(req, res);
    if (!user) return;
    const db = await getDb();

    if (req.method === "GET") {
      const rows = await dbAll(db, "SELECT * FROM services WHERE user_id=$1 ORDER BY created_at ASC", [user.id]);
      return res.status(200).json(rows || []);
    }

    if (req.method === "POST") {
      if (!rateLimit(req, { limit: 30, window: 60 }))
        return res.status(429).json({ error: "Too many requests." });

      const { name, price, duration, color = "#ff7a00" } = req.body || {};
      const err = collect(
        v.name(name, "Service name", 100),
        v.price(price),
        v.duration(duration),
        v.color(color)
      );
      if (err) return res.status(400).json({ error: err });

      const existing = await dbAll(db, "SELECT id FROM services WHERE user_id=$1", [user.id]);
      if (existing.length >= 50) return res.status(400).json({ error: "Maximum 50 services allowed." });

      const { lastInsertRowid } = await dbRun(db,
        "INSERT INTO services (user_id,name,price,duration,color) VALUES ($1,$2,$3,$4,$5)",
        [user.id, sanitize(name), parseFloat(price), parseInt(duration, 10), color]
      );
      return res.status(201).json({ ok: true, id: lastInsertRowid });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[services]", err.message);
    return res.status(500).json({ error: "Server error." });
  }
}
