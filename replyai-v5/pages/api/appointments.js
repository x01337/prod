/**
 * pages/api/appointments.js
 * GET    → list with service info joined
 * POST   → create with service_id, validation, overlap check
 * DELETE → delete, restore availability
 */
import getDb, { dbAll, dbRun, dbGet, checkAvailability, checkOverlap } from "../../lib/db";
import { requireAuth } from "../../lib/auth";
import { detectLanguage } from "../../lib/i18n";
import { v, collect, sanitize } from "../../lib/validate";

// Minimal date parser accepting YYYY-MM-DD
function parseDate(d) {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d))) return d;
  return null;
}

export default async function handler(req, res) {
  try {
    const user = requireAuth(req, res);
    if (!user) return;
    const db = await getDb();

    if (req.method === "GET") {
      const rows = await dbAll(db,
        `SELECT a.*, s.name AS service_name, s.color AS service_color
         FROM appointments a
         LEFT JOIN services s ON s.id = a.service_id
         WHERE a.user_id = $1
         ORDER BY a.date ASC, a.start_time ASC`,
        [user.id]
      );
      return res.status(200).json(rows || []);
    }

    if (req.method === "POST") {
      const { client_name, phone, date, start_time = "09:00", end_time = "10:00",
              language, service_id, skip_availability } = req.body || {};

      // Validate
      const err = collect(
        v.name(client_name || "Client", "Client name", 100),
        v.date(date),
        v.time(start_time, "start_time"),
        v.time(end_time, "end_time")
      );
      if (err) return res.status(400).json({ error: err });
      if (start_time >= end_time) return res.status(400).json({ error: "End time must be after start time." });

      const parsedDate = parseDate(date);
      if (!parsedDate) return res.status(400).json({ error: "Invalid date." });

      // Validate service if provided
      if (service_id) {
        const svc = await dbGet(db, "SELECT id FROM services WHERE id=$1 AND user_id=$2", [service_id, user.id]);
        if (!svc) return res.status(400).json({ error: "Service not found." });
      }

      if (!skip_availability) {
        const available = await checkAvailability(user.id, parsedDate, start_time, end_time);
        if (!available) return res.status(409).json({ error: "This slot is not in your availability. Add it in the Planner first." });
        const overlap = await checkOverlap(user.id, parsedDate, start_time, end_time);
        if (overlap) return res.status(409).json({ error: "This time slot overlaps with an existing booking." });
      }

      const lang = language || detectLanguage(client_name || "") || "en";
      const { lastInsertRowid } = await dbRun(db,
        `INSERT INTO appointments (user_id, service_id, client_name, phone, date, start_time, end_time, status, language, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [user.id, service_id || null, sanitize(client_name || "Client"),
         sanitize(phone || ""), parsedDate, start_time, end_time, "booked", lang, "dashboard"]
      );

      return res.status(201).json({ ok: true, id: lastInsertRowid });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "id required." });

      const appt = await dbGet(db, "SELECT * FROM appointments WHERE id=$1 AND user_id=$2", [id, user.id]);
      if (!appt) return res.status(404).json({ error: "Not found." });

      await dbRun(db, "DELETE FROM appointments WHERE id=$1", [id]);

      // Restore availability slot after cancellation
      if (appt.date) {
        try {
          await dbRun(db,
            "UPDATE availability SET is_available=1 WHERE user_id=$1 AND date=$2 AND start_time=$3",
            [user.id, appt.date, appt.start_time]
          );
        } catch (_) {}
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[appointments]", err.message);
    return res.status(500).json({ error: "Server error." });
  }
}
