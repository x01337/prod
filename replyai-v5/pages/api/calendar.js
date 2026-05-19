/**
 * pages/api/calendar.js
 *
 * GET    ?week=YYYY-MM-DD              → { days, events }
 * POST   { date, start_time, end_time, status, service_id, client_name, phone }
 * PUT    { id, type, date, start_time, end_time, service_id, client_name, phone }
 * DELETE ?id=&type=appointment|availability
 */

import getDb, { dbAll, dbGet, dbRun } from "../../lib/db";
import { requireAuth } from "../../lib/auth";
import { sanitize } from "../../lib/validate";

// ── Helpers ────────────────────────────────────────────────────────────────
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

function boolTrue(v) {
  return v === true || v === 1 || v === "true" || v === "1";
}

function validateTime(t, field) {
  if (!t || !/^\d{2}:\d{2}$/.test(t))
    return `${field} must be in HH:MM format.`;
  return null;
}

function validateDate(d) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return "date must be YYYY-MM-DD.";
  return null;
}

export default async function handler(req, res) {
  try {
    const user = requireAuth(req, res);
    if (!user) return;
    const db = await getDb();

    // ── GET ────────────────────────────────────────────────────────────────
    if (req.method === "GET") {
      const weekParam = req.query.week || new Date().toISOString().slice(0, 10);
      let days;
      try { days = weekDates(weekParam); }
      catch { return res.status(400).json({ error: "Invalid week date." }); }

      const appointments = await dbAll(db,
        `SELECT a.*, s.name AS service_name, s.color AS service_color
         FROM appointments a
         LEFT JOIN services s ON s.id = a.service_id
         WHERE a.user_id = $1 AND a.date >= $2 AND a.date <= $3
         ORDER BY a.date ASC, a.start_time ASC`,
        [user.id, days[0], days[6]]
      );

      const availability = await dbAll(db,
        `SELECT * FROM availability
         WHERE user_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date ASC, start_time ASC`,
        [user.id, days[0], days[6]]
      );

      const openSlots = (availability || []).filter(av => boolTrue(av.is_available));

      const events = [
        ...(appointments || []).map(a => ({ ...a, _type: "appointment" })),
        ...openSlots.map(av => ({
          id: `av_${av.id}`, _real_id: av.id,
          _type: "availability", date: av.date,
          start_time: av.start_time, end_time: av.end_time,
          status: "available", client_name: "Open",
          service_name: null, service_color: null,
        })),
      ];

      return res.status(200).json({ days, events });
    }

    // ── POST (create) ──────────────────────────────────────────────────────
    if (req.method === "POST") {
      const { date, start_time, end_time, client_name = "", phone = "", status = "booked", service_id } = req.body || {};

      const err = validateDate(date) || validateTime(start_time, "start_time") || validateTime(end_time, "end_time");
      if (err) return res.status(400).json({ error: err });
      if (start_time >= end_time) return res.status(400).json({ error: "End time must be after start time." });

      // ── Prevent creating events in the past ─────────────────────────────
      const now        = new Date();
      const todayStr   = now.toISOString().slice(0, 10);
      const nowTimeStr = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

      if (date < todayStr) {
        return res.status(400).json({ error: "Cannot create events in the past." });
      }
      if (date === todayStr && end_time <= nowTimeStr) {
        return res.status(400).json({ error: "Cannot create events that have already ended." });
      }

      if (status === "available") {
        const { lastInsertRowid } = await dbRun(db,
          "INSERT INTO availability (user_id, date, start_time, end_time, is_available) VALUES ($1,$2,$3,$4,$5)",
          [user.id, date, start_time, end_time, 1]
        );
        const created = await dbGet(db, "SELECT * FROM availability WHERE id=$1", [lastInsertRowid]);
        return res.status(201).json({
          ...(created || {}), id: `av_${lastInsertRowid}`, _real_id: lastInsertRowid,
          _type: "availability", status: "available", client_name: "Open",
        });
      }

      // Booking
      if (!service_id) return res.status(400).json({ error: "Please select a service." });
      const service = await dbGet(db, "SELECT * FROM services WHERE id=$1 AND user_id=$2", [service_id, user.id]);
      if (!service) return res.status(400).json({ error: "Service not found." });

      const overlapping = await dbAll(db,
        `SELECT id FROM appointments WHERE user_id=$1 AND date=$2 AND status='booked' AND start_time < $3 AND end_time > $4`,
        [user.id, date, end_time, start_time]
      );
      if (overlapping?.length) return res.status(409).json({ error: "This time slot overlaps with an existing booking." });

      const { lastInsertRowid } = await dbRun(db,
        `INSERT INTO appointments (user_id, service_id, client_name, phone, date, start_time, end_time, status, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [user.id, service_id, sanitize(client_name) || "Client", sanitize(phone), date, start_time, end_time, "booked", "calendar"]
      );
      const created = await dbGet(db,
        `SELECT a.*, s.name AS service_name, s.color AS service_color FROM appointments a LEFT JOIN services s ON s.id=a.service_id WHERE a.id=$1`,
        [lastInsertRowid]
      );
      return res.status(201).json({ ...(created || {}), _type: "appointment" });
    }

    // ── PUT (update / move / resize / edit) ───────────────────────────────
    if (req.method === "PUT") {
      const { id, type = "appointment", date, start_time, end_time, service_id, client_name, phone } = req.body || {};
      if (!id) return res.status(400).json({ error: "id required." });

      const err = validateDate(date) || validateTime(start_time, "start_time") || validateTime(end_time, "end_time");
      if (err) return res.status(400).json({ error: err });
      if (start_time >= end_time) return res.status(400).json({ error: "End time must be after start time." });

      // ── Prevent moving events to the past ───────────────────────────────
      const _now      = new Date();
      const _today    = _now.toISOString().slice(0, 10);
      const _nowTime  = `${String(_now.getHours()).padStart(2,"0")}:${String(_now.getMinutes()).padStart(2,"0")}`;
      if (date < _today) {
        return res.status(400).json({ error: "Cannot move events to the past." });
      }
      if (date === _today && end_time <= _nowTime) {
        return res.status(400).json({ error: "Cannot move events to a time that has already passed." });
      }

      if (type === "availability") {
        const realId = String(id).replace("av_", "");
        const row = await dbGet(db, "SELECT id FROM availability WHERE id=$1 AND user_id=$2", [realId, user.id]);
        if (!row) return res.status(404).json({ error: "Availability slot not found." });

        await dbRun(db, "UPDATE availability SET date=$1, start_time=$2, end_time=$3 WHERE id=$4",
          [date, start_time, end_time, realId]);

        const updated = await dbGet(db, "SELECT * FROM availability WHERE id=$1", [realId]);
        return res.status(200).json({
          ...(updated || {}), id: `av_${realId}`, _real_id: Number(realId),
          _type: "availability", status: "available", client_name: "Open",
        });
      }

      // appointment
      const numId = Number(id);
      if (isNaN(numId)) return res.status(400).json({ error: "Invalid appointment id." });
      const row = await dbGet(db, "SELECT * FROM appointments WHERE id=$1 AND user_id=$2", [numId, user.id]);
      if (!row) return res.status(404).json({ error: "Appointment not found." });

      // Overlap check (exclude self)
      const overlapping = await dbAll(db,
        `SELECT id FROM appointments WHERE user_id=$1 AND date=$2 AND status='booked' AND id!=$3 AND start_time < $4 AND end_time > $5`,
        [user.id, date, numId, end_time, start_time]
      );
      if (overlapping?.length) return res.status(409).json({ error: "This slot overlaps with an existing booking." });

      const finalServiceId = service_id || row.service_id;
      const finalName      = client_name !== undefined ? (sanitize(client_name) || "Client") : row.client_name;
      const finalPhone     = phone      !== undefined ? sanitize(phone) : row.phone;

      await dbRun(db,
        "UPDATE appointments SET date=$1, start_time=$2, end_time=$3, service_id=$4, client_name=$5, phone=$6 WHERE id=$7",
        [date, start_time, end_time, finalServiceId, finalName, finalPhone, numId]
      );
      const updated = await dbGet(db,
        `SELECT a.*, s.name AS service_name, s.color AS service_color FROM appointments a LEFT JOIN services s ON s.id=a.service_id WHERE a.id=$1`,
        [numId]
      );
      return res.status(200).json({ ...(updated || {}), _type: "appointment" });
    }

    // ── DELETE ─────────────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id, type = "appointment" } = req.query;
      if (!id) return res.status(400).json({ error: "id required." });

      if (type === "availability") {
        const realId = String(id).replace("av_", "");
        const row = await dbGet(db, "SELECT id FROM availability WHERE id=$1 AND user_id=$2", [realId, user.id]);
        if (!row) return res.status(404).json({ error: "Slot not found." });
        await dbRun(db, "DELETE FROM availability WHERE id=$1", [realId]);
      } else {
        const numId = Number(id);
        if (isNaN(numId)) return res.status(400).json({ error: "Invalid id." });
        const row = await dbGet(db, "SELECT id FROM appointments WHERE id=$1 AND user_id=$2", [numId, user.id]);
        if (!row) return res.status(404).json({ error: "Appointment not found." });
        await dbRun(db, "DELETE FROM appointments WHERE id=$1", [numId]);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });

  } catch (err) {
    console.error("[/api/calendar]", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
}
