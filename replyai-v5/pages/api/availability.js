/**
 * pages/api/availability.js — Planner slot management
 * GET    → list all availability rows with booking counts
 * POST   → add/update a slot (upsert on user_id+date+start_time)
 * DELETE → remove a slot by id
 */
import getDb, { dbAll, dbGet, dbRun } from "../../lib/db";
import { requireAuth } from "../../lib/auth";
import { v, collect } from "../../lib/validate";

export default async function handler(req, res) {
  try {
    const user = requireAuth(req, res);
    if (!user) return;
    const db = await getDb();

    if (req.method === "GET") {
      const slots = await dbAll(db,
        "SELECT * FROM availability WHERE user_id=$1 ORDER BY date ASC, start_time ASC",
        [user.id]
      );

      // Attach booking count per slot
      const withBookings = await Promise.all((slots || []).map(async (slot) => {
        const booked = await dbGet(db,
          `SELECT COUNT(*) as cnt FROM appointments
           WHERE user_id=$1 AND date=$2 AND start_time=$3 AND status='booked'`,
          [user.id, slot.date, slot.start_time]
        );
        return {
          ...slot,
          is_available: slot.is_available === 1 || slot.is_available === true,
          bookings: parseInt(booked?.cnt || 0, 10),
        };
      }));

      return res.status(200).json(withBookings);
    }

    if (req.method === "POST") {
      const { date, start_time = "09:00", end_time = "17:00", is_available = true } = req.body || {};

      const err = collect(
        v.date(date),
        v.time(start_time, "start_time"),
        v.time(end_time, "end_time")
      );
      if (err) return res.status(400).json({ error: err });
      if (start_time >= end_time) return res.status(400).json({ error: "End time must be after start time." });

      // Upsert by user_id+date+start_time
      const existing = await dbGet(db,
        "SELECT id FROM availability WHERE user_id=$1 AND date=$2 AND start_time=$3",
        [user.id, date, start_time]
      );

      if (existing) {
        await dbRun(db,
          "UPDATE availability SET is_available=$1, end_time=$2 WHERE user_id=$3 AND date=$4 AND start_time=$5",
          [is_available ? 1 : 0, end_time, user.id, date, start_time]
        );
        return res.status(200).json({ ok: true, action: "updated", date });
      } else {
        const { lastInsertRowid } = await dbRun(db,
          "INSERT INTO availability (user_id, date, start_time, end_time, is_available) VALUES ($1,$2,$3,$4,$5)",
          [user.id, date, start_time, end_time, is_available ? 1 : 0]
        );
        return res.status(201).json({ ok: true, action: "created", id: lastInsertRowid, date });
      }
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "id required." });

      const slot = await dbGet(db,
        "SELECT * FROM availability WHERE id=$1 AND user_id=$2",
        [id, user.id]
      );
      if (!slot) return res.status(404).json({ error: "Not found." });

      await dbRun(db, "DELETE FROM availability WHERE id=$1", [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err) {
    console.error("[availability]", err.message);
    return res.status(500).json({ error: "Server error." });
  }
}
