/**
 * pages/api/services/[id].js — GET / PUT / DELETE with ownership check
 */
import getDb, { dbGet, dbRun } from "../../../lib/db";
import { requireAuth } from "../../../lib/auth";
import { v, sanitize } from "../../../lib/validate";

export default async function handler(req, res) {
  try {
    const user = requireAuth(req, res);
    if (!user) return;
    const { id } = req.query;
    if (!id || isNaN(parseInt(id, 10))) return res.status(400).json({ error: "Invalid id." });
    const db  = await getDb();
    const svc = await dbGet(db, "SELECT * FROM services WHERE id=$1 AND user_id=$2", [id, user.id]);
    if (!svc) return res.status(404).json({ error: "Service not found." });

    if (req.method === "GET") return res.status(200).json(svc);

    if (req.method === "PUT") {
      const { name, price, duration, color } = req.body || {};
      const updates = []; const params = []; let idx = 1;
      if (name !== undefined) {
        const e = v.name(name, "Service name", 100); if (e) return res.status(400).json({ error: e });
        updates.push(`name=$${idx++}`); params.push(sanitize(name));
      }
      if (price !== undefined) {
        const e = v.price(price); if (e) return res.status(400).json({ error: e });
        updates.push(`price=$${idx++}`); params.push(parseFloat(price));
      }
      if (duration !== undefined) {
        const e = v.duration(duration); if (e) return res.status(400).json({ error: e });
        updates.push(`duration=$${idx++}`); params.push(parseInt(duration, 10));
      }
      if (color !== undefined) {
        const e = v.color(color); if (e) return res.status(400).json({ error: e });
        updates.push(`color=$${idx++}`); params.push(color);
      }
      if (!updates.length) return res.status(400).json({ error: "Nothing to update." });
      params.push(id, user.id);
      await dbRun(db, `UPDATE services SET ${updates.join(",")} WHERE id=$${idx++} AND user_id=$${idx}`, params);
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      await dbRun(db, "DELETE FROM services WHERE id=$1 AND user_id=$2", [id, user.id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[services/id]", err.message);
    return res.status(500).json({ error: "Server error." });
  }
}
