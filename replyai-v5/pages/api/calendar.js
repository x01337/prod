/**
 * pages/api/calendar.js
 *
 * GET  ?week=YYYY-MM-DD  → { days, events }
 * POST { date, start_time, end_time, client_name, status, service_id, phone }
 *   status="available" → inserts into availability table
 *   status="booked"    → inserts into appointments (NO availability pre-check for manual entries)
 * DELETE ?id=&type=appointment|availability
 *
 * FIXED BUGS:
 *   1. Removed mandatory availability check for manual calendar bookings.
 *      (Users should be able to create bookings directly without pre-setting availability.)
 *   2. Fixed is_available query to work on both SQLite (1) and PostgreSQL (true).
 *   3. Removed checkAvailability/checkOverlap imports (no longer needed here).
 *   4. Proper error handling on all branches.
 */

import getDb, { dbAll, dbGet, dbRun } from "../../lib/db";
import { requireAuth } from "../../lib/auth";
import { v, collect, sanitize } from "../../lib/validate";

function weekDates(anyDate) {
  const d = new Date(anyDate + "T00:00:00");
  if (isNaN(d)) throw new Error("Invalid date");
  const dow = (d.getDay() + 6) % 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(mon);
    day.setDate(mon.getDate() + i);
    return day.toISOString().slice(0, 10);
  });
}

/** Works on both SQLite (0/1) and PostgreSQL (true/false) */
function boolTrue(val) {
  return val === true || val === 1 || val === "true" || val === "1";
}

export default async function handler(req, res) {
  try {
    const user = requireAuth(req, res);
    if (!user) return;

    const db = await getDb();

    // ── GET ─────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const weekParam = req.query.week || new Date().toISOString().slice(0, 10);
      let days;
      try { days = weekDates(weekParam); }
      catch { return res.status(400).json({ error: "Invalid week date." }); }

      // Appointments with service info joined
      const appointments = await dbAll(db,
        `SELECT a.*, s.name AS service_name, s.color AS service_color
         FROM appointments a
         LEFT JOIN services s ON s.id = a.service_id
         WHERE a.user_id = $1 AND a.date >= $2 AND a.date <= $3
         ORDER BY a.date ASC, a.start_time ASC`,
        [user.id, days[0], days[6]]
      );

      // Availability slots — use loose is_available check for cross-DB compat
      // FIX: was "is_available = 1" which fails on PostgreSQL (needs TRUE)
      const availability = await dbAll(db,
        `SELECT * FROM availability
         WHERE user_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC, start_time ASC`,
        [user.id, days[0], days[6]]
      );

      // Filter is_available after fetch (works on both DB types)
      const openSlots = (availability || []).filter(av => boolTrue(av.is_available));

      const events = [
        ...(appointments || []).map(a => ({ ...a, _type: "appointment" })),
        ...openSlots.map(av => ({
          id:          `av_${av.id}`,
          _real_id:    av.id,
          _type:       "availability",
          date:        av.date,
          start_time:  av.start_time,
          end_time:    av.end_time,
          status:      "available",
          client_name: "Available",
          source:      "availability",
          service_name:  null,
          service_color: null,
        })),
      ];

      return res.status(200).json({ days, events, appointments: appointments || [], availability: openSlots });
    }

    // ── POST ────────────────────────────────────────────────────────────────
    if (req.method === "POST") {
      const {
        date, start_time, end_time,
        client_name = "", phone = "",
        status = "booked",
        service_id,
      } = req.body || {};

      // Validate required fields
      const err = collect(
        v.date(date),
        v.time(start_time, "start_time"),
        v.time(end_time, "end_time")
      );
      if (err) return res.status(400).json({ error: err });
      if (start_time >= end_time)
        return res.status(400).json({ error: "End time must be after start time." });

      // ── Creating AVAILABILITY slot ──────────────────────────────────────
      if (status === "available") {
        // Check for duplicate availability slot at same date+start_time
        const exists = await dbGet(db,
          "SELECT id FROM availability WHERE user_id=$1 AND date=$2 AND start_time=$3",
          [user.id, date, start_time]
        );
        if (exists)
          return res.status(409).json({ error: "An availability slot already exists at that time." });

        const { lastInsertRowid } = await dbRun(db,
          "INSERT INTO availability (user_id, date, start_time, end_time, is_available) VALUES ($1,$2,$3,$4,$5)",
          [user.id, date, start_time, end_time, 1]
        );
        const created = await dbGet(db, "SELECT * FROM availability WHERE id=$1", [lastInsertRowid]);
        return res.status(201).json({
          ...(created || {}),
          id:          `av_${lastInsertRowid}`,
          _real_id:    lastInsertRowid,
          _type:       "availability",
          status:      "available",
          client_name: "Available",
        });
      }

      // ── Creating BOOKING ─────────────────────────────────────────────────
      // FIXED: Removed mandatory availability pre-check for manual calendar entries.
      // The availability check only makes sense for WhatsApp/external bookings.
      // A business owner creating their own calendar events shouldn't be blocked.

      // Service is required for bookings
      if (!service_id)
        return res.status(400).json({ error: "Please select a service." });

      // Validate service belongs to this user
      const service = await dbGet(db,
        "SELECT * FROM services WHERE id=$1 AND user_id=$2",
        [service_id, user.id]
      );
      if (!service)
        return res.status(400).json({ error: "Service not found." });

      // FIXED: Only check overlap with existing appointments (not availability)
      // This prevents double-booking but allows booking on any time
      const overlapping = await dbAll(db,
        `SELECT id FROM appointments
         WHERE user_id=$1 AND date=$2 AND status='booked'
           AND start_time < $3 AND end_time > $4`,
        [user.id, date, end_time, start_time]
      );
      if (overlapping && overlapping.length > 0)
        return res.status(409).json({ error: "This time slot overlaps with an existing booking." });

      const cleanName  = sanitize(client_name) || "Client";
      const cleanPhone = sanitize(phone);

      const { lastInsertRowid } = await dbRun(db,
        `INSERT INTO appointments
           (user_id, service_id, client_name, phone, date, start_time, end_time, status, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [user.id, service_id, cleanName, cleanPhone, date, start_time, end_time, "booked", "calendar"]
      );

      const created = await dbGet(db,
        `SELECT a.*, s.name AS service_name, s.color AS service_color
         FROM appointments a
         LEFT JOIN services s ON s.id = a.service_id
         WHERE a.id=$1`,
        [lastInsertRowid]
      );

      return res.status(201).json({ ...(created || {}), _type: "appointment" });
    }

    // ── PUT (edit existing event) ────────────────────────────────────────────
    if (req.method === "PUT") {
      const { id, type = "appointment", date, start_time, end_time,
              client_name, phone, service_id } = req.body || {};

      const err = collect(
        v.date(date),
        v.time(start_time, "start_time"),
        v.time(end_time, "end_time")
      );
      if (err) return res.status(400).json({ error: err });
      if (start_time >= end_time)
        return res.status(400).json({ error: "End time must be after start time." });

      if (type === "availability") {
        const realId = String(id).replace("av_", "");
        const row = await dbGet(db, "SELECT id FROM availability WHERE id=$1 AND user_id=$2", [realId, user.id]);
        if (!row) return res.status(404).json({ error: "Slot not found." });
        await dbRun(db,
          "UPDATE availability SET date=$1, start_time=$2, end_time=$3 WHERE id=$4",
          [date, start_time, end_time, realId]
        );
      } else {
        const row = await dbGet(db, "SELECT id FROM appointments WHERE id=$1 AND user_id=$2", [id, user.id]);
        if (!row) return res.status(404).json({ error: "Appointment not found." });
        const updates = ["date=$1", "start_time=$2", "end_time=$3"];
        const params  = [date, start_time, end_time];
        let idx = 4;
        if (service_id !== undefined) { updates.push(`service_id=$${idx++}`); params.push(service_id || null); }
        if (client_name !== undefined) { updates.push(`client_name=$${idx++}`); params.push(sanitize(client_name)); }
        if (phone !== undefined) { updates.push(`phone=$${idx++}`); params.push(sanitize(phone)); }
        params.push(id, user.id);
        await dbRun(db,
          `UPDATE appointments SET ${updates.join(",")} WHERE id=$${idx++} AND user_id=$${idx}`,
          params
        );
      }
      return res.status(200).json({ ok: true });
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id, type = "appointment" } = req.query;
      if (!id) return res.status(400).json({ error: "id required." });

      if (type === "availability") {
        const realId = String(id).replace("av_", "");
        if (!realId || isNaN(Number(realId)))
          return res.status(400).json({ error: "Invalid availability id." });

        const row = await dbGet(db,
          "SELECT id FROM availability WHERE id=$1 AND user_id=$2",
          [realId, user.id]
        );
        if (!row) return res.status(404).json({ error: "Availability slot not found." });
        await dbRun(db, "DELETE FROM availability WHERE id=$1", [realId]);

      } else {
        const numId = Number(id);
        if (isNaN(numId)) return res.status(400).json({ error: "Invalid appointment id." });

        const row = await dbGet(db,
          "SELECT id FROM appointments WHERE id=$1 AND user_id=$2",
          [numId, user.id]
        );
        if (!row) return res.status(404).json({ error: "Appointment not found." });
        await dbRun(db, "DELETE FROM appointments WHERE id=$1", [numId]);
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });

  } catch (err) {
    console.error("[/api/calendar]", err.message, err.stack);
    return res.status(500).json({ error: "Internal server error." });
  }
}
