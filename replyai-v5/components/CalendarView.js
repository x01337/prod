/**
 * CalendarView.js — Month grid calendar
 *
 * Layout matches the reference screenshot:
 *   - Month title + prev/next arrows top-center
 *   - 7 day-columns (Mon … Sun) with short day name + date number
 *   - Today circled in orange
 *   - Each day cell = scrollable column of time-slot chips
 *   - Green chips  = working/available hours
 *   - Blue chips   = booked appointments (service name + time)
 *   - Tap empty area in a day → create modal
 *   - Tap a chip   → edit/delete modal
 *
 * Data source: GET/POST/DELETE /api/calendar  (unchanged)
 */

import { useState, useEffect, useCallback, useMemo } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const DAY_NAMES_S  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_NAMES_L  = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MONTH_NAMES  = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"];
const MONTH_NAMES_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PAL = ["#3b82f6","#8b5cf6","#ec4899","#10b981","#f59e0b","#6366f1","#ff7a00"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad      = n  => String(n).padStart(2, "0");
const toISO    = d  => d.toISOString().slice(0, 10);
const todayISO = () => toISO(new Date());

function mondayOf(iso) {
  const d = new Date(iso + "T00:00:00");
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toISO(d);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function toMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}
function addMinutes(t, mins) {
  const total = toMin(t) + mins;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
function fmt12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

function hexRgba(hex, a) {
  try {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  } catch { return `rgba(59,130,246,${a})`; }
}

function evColor(ev) {
  if (ev._type === "availability" || ev.status === "available") {
    return { base: "#22c55e", text: "#4ade80", chipBg: "rgba(34,197,94,0.18)", chipBorder: "rgba(34,197,94,0.35)" };
  }
  const base = ev.service_color || PAL[(Number(ev.id) || 0) % PAL.length];
  return {
    base,
    text: "#fff",
    chipBg: hexRgba(base, 0.85),
    chipBorder: hexRgba(base, 1),
  };
}

// Build month: all ISO dates visible on a month grid (always 6 rows × 7 cols = 42 cells)
function monthGrid(year, month) { // month: 0-indexed
  const firstDay = new Date(year, month, 1);
  const dow = (firstDay.getDay() + 6) % 7; // 0=Mon
  const start = new Date(firstDay);
  start.setDate(1 - dow);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { iso: toISO(d), inMonth: d.getMonth() === month };
  });
}

function formatMonthYear(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

// Group events by date
function byDate(events) {
  const map = {};
  for (const ev of events) {
    if (!map[ev.date]) map[ev.date] = [];
    map[ev.date].push(ev);
  }
  // Sort each day's events by start_time
  for (const k in map) {
    map[k].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  }
  return map;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function CalendarView() {
  const today      = todayISO();
  const todayDate  = new Date(today + "T00:00:00");
  const [year,  setYear]  = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth()); // 0-indexed

  const [events,   setEvents]   = useState([]);
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [toast,    setToast]    = useState(null);

  // Grid of 42 cells
  const grid = useMemo(() => monthGrid(year, month), [year, month]);
  const eventMap = useMemo(() => byDate(events), [events]);

  // First and last ISO in view (for API fetch)
  const viewStart = grid[0].iso;
  const viewEnd   = grid[41].iso;

  // Load services
  useEffect(() => {
    fetch("/api/services")
      .then(r => r.ok ? r.json() : [])
      .then(d => setServices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Load events for visible range
  const loadRange = useCallback(async (start, silent = false) => {
    if (!silent) setLoading(true);
    try {
      // We fetch week by week to cover the whole month view
      // API supports ?week= param; we fetch 6 weeks using 6 calls merged
      // Simpler: use a date range query — send the Monday of first week
      const mon = mondayOf(start);
      const weeks = [];
      for (let i = 0; i < 6; i++) weeks.push(addDays(mon, i * 7));

      const results = await Promise.all(
        weeks.map(w => fetch(`/api/calendar?week=${w}`).then(r => r.ok ? r.json() : { events: [] }))
      );
      const all = [];
      const seen = new Set();
      for (const r of results) {
        for (const ev of (r.events || [])) {
          const uid = `${ev._type}_${ev.id}_${ev.date}_${ev.start_time}`;
          if (!seen.has(uid)) { seen.add(uid); all.push(ev); }
        }
      }
      setEvents(all);
    } catch { setEvents([]); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { loadRange(viewStart); }, [year, month]);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  // Click empty area of a day → create modal
  function onDayClick(e, iso) {
    if (e.target !== e.currentTarget) return; // only blank area
    setModal({ type: "create", date: iso, start_time: "09:00", end_time: "10:00",
      defMode: services.length > 0 ? "booking" : "hours" });
  }

  // Click a chip → edit modal
  function onChipClick(e, ev) {
    e.stopPropagation();
    setModal({ type: "edit", event: ev });
  }

  async function onCreate(payload) {
    try {
      const r = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        await loadRange(viewStart, true);
        setModal(null);
        showToast(payload.status === "available" ? "Working hours added ✓" : "Booking created ✓");
        return null;
      }
      return d.error || "Save failed.";
    } catch { return "Network error."; }
  }

  async function onUpdate(payload) {
    const type   = payload._type === "availability" ? "availability" : "appointment";
    const realId = payload._real_id || payload.id;
    try {
      const r = await fetch("/api/calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id: realId, type }),
      });
      const d = await r.json();
      if (r.ok) { await loadRange(viewStart, true); setModal(null); showToast("Saved ✓"); return null; }
      return d.error || "Update failed.";
    } catch { return "Network error."; }
  }

  async function onDelete(ev) {
    const type   = ev._type === "availability" ? "availability" : "appointment";
    const realId = ev._real_id || ev.id;
    try {
      const r = await fetch(`/api/calendar?id=${realId}&type=${type}`, { method: "DELETE" });
      if (r.ok) { await loadRange(viewStart, true); setModal(null); showToast("Deleted"); }
      else { const d = await r.json(); showToast(d.error || "Delete failed.", false); }
    } catch { showToast("Network error.", false); }
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
      background: "var(--bg)", fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 500,
          background: toast.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.ok ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
          boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
          animation: "fadeUp .2s ease both",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px 10px", flexShrink: 0,
      }}>
        {/* Month + year */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20,
            color: "var(--text)", letterSpacing: "-0.5px", margin: 0,
          }}>
            {formatMonthYear(year, month)}
          </h2>
          {/* Chevron nav */}
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <LegDot color="#22c55e" label="Open" />
          <LegDot color="#3b82f6" label="Booked" />
        </div>

        {/* Actions */}
        <button onClick={() => setModal({ type:"create", date:today, start_time:"09:00", end_time:"17:00", defMode:"hours" })}
          style={{
            padding: "6px 13px", borderRadius: 7, border: "1px solid rgba(34,197,94,0.35)",
            background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: 12,
            fontWeight: 600, cursor: "pointer",
          }}>
          + Hours
        </button>
        <button onClick={() => setModal({ type:"create", date:today, start_time:"09:00", end_time:"10:00", defMode:"booking" })}
          style={{
            padding: "6px 13px", borderRadius: 7, border: "none",
            background: "#ff7a00", color: "#fff", fontSize: 12,
            fontWeight: 600, cursor: "pointer",
            boxShadow: "0 0 14px rgba(255,122,0,0.3)",
          }}>
          + Booking
        </button>
        <button onClick={goToday} style={{ ...navBtnStyle, padding: "5px 10px", fontSize: 11, fontWeight: 600 }}>
          Today
        </button>
      </div>

      {/* ── Day-name row ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7,1fr)",
        padding: "0 8px", flexShrink: 0, gap: 4,
        borderBottom: "1px solid var(--border)",
        paddingBottom: 6,
      }}>
        {DAY_NAMES_S.map((name, i) => (
          <div key={name} style={{
            textAlign: "center", fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.07em",
            color: i >= 5 ? "var(--text-dim)" : "var(--text-muted)",
            padding: "2px 0",
          }}>
            {name}
          </div>
        ))}
      </div>

      {/* ── Month grid ── */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--text-muted)" }}>
          <Spin /> <span style={{ fontSize: 13 }}>Loading…</span>
        </div>
      ) : (
        <div style={{
          flex: 1, minHeight: 0, overflowY: "auto",
          display: "grid", gridTemplateColumns: "repeat(7,1fr)",
          gridTemplateRows: "repeat(6,1fr)",
          gap: 4, padding: "6px 8px 12px",
        }}>
          {grid.map(({ iso, inMonth }, idx) => {
            const dayEvents  = eventMap[iso] || [];
            const isToday    = iso === today;
            const isPast     = iso < today;
            const d          = new Date(iso + "T00:00:00");
            const isWeekend  = idx % 7 >= 5;
            const bookings   = dayEvents.filter(e => e._type === "appointment");
            const avail      = dayEvents.filter(e => e._type === "availability" || e.status === "available");

            return (
              <div key={iso}
                onClick={e => onDayClick(e, iso)}
                style={{
                  background: isToday
                    ? "rgba(255,122,0,0.05)"
                    : inMonth
                    ? "var(--surface)"
                    : "rgba(17,17,17,0.4)",
                  border: isToday
                    ? "1.5px solid rgba(255,122,0,0.4)"
                    : "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "6px 5px 5px",
                  display: "flex", flexDirection: "column", gap: 3,
                  cursor: "pointer",
                  minHeight: 90,
                  opacity: !inMonth ? 0.45 : isPast ? 0.65 : 1,
                  transition: "border-color 0.12s",
                  overflow: "hidden",
                }}
                onMouseEnter={e => { if (!isToday) e.currentTarget.style.borderColor = "var(--border-light)"; }}
                onMouseLeave={e => { if (!isToday) e.currentTarget.style.borderColor = isToday ? "rgba(255,122,0,0.4)" : "var(--border)"; }}
              >
                {/* Date number */}
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  alignSelf: "center",
                  background: isToday ? "#ff7a00" : "transparent",
                  boxShadow: isToday ? "0 0 10px rgba(255,122,0,0.5)" : "none",
                  fontSize: 11, fontWeight: isToday ? 800 : 600,
                  color: isToday ? "#fff" : isWeekend ? "var(--text-dim)" : !inMonth ? "var(--text-dim)" : "var(--text)",
                  fontFamily: "'Syne', sans-serif",
                  marginBottom: 2,
                  letterSpacing: "-0.3px",
                }}>
                  {d.getDate()}
                </div>

                {/* Event chips */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflow: "hidden" }}>
                  {/* Available slots */}
                  {avail.map((ev, i) => (
                    <Chip key={`av_${i}`} ev={ev} onClick={e => onChipClick(e, ev)} />
                  ))}
                  {/* Bookings */}
                  {bookings.map((ev, i) => (
                    <Chip key={`bk_${i}`} ev={ev} onClick={e => onChipClick(e, ev)} />
                  ))}
                  {/* Overflow indicator */}
                  {dayEvents.length > 4 && (
                    <div style={{
                      fontSize: 9, color: "var(--text-dim)", textAlign: "center",
                      padding: "1px 0", fontWeight: 600,
                    }}>
                      +{dayEvents.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {modal?.type === "create" && (
        <CreateModal initial={modal} services={services} onSave={onCreate} onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit" && (
        <EditModal event={modal.event} services={services} onSave={onUpdate} onDelete={onDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ── Chip ──────────────────────────────────────────────────────────────────────
function Chip({ ev, onClick }) {
  const c = evColor(ev);
  const isAvail = ev._type === "availability" || ev.status === "available";
  const label   = isAvail
    ? ev.start_time
    : ev.start_time;                         // both show the time
  const sub     = isAvail ? "Open" : (ev.service_name || ev.client_name || "Booking");

  return (
    <div onClick={onClick}
      style={{
        background: c.chipBg,
        border: `1px solid ${c.chipBorder}`,
        borderRadius: 5,
        padding: "3px 6px",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 4,
        transition: "filter 0.1s",
        flexShrink: 0,
        overflow: "hidden",
      }}
      onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.15)"}
      onMouseLeave={e => e.currentTarget.style.filter = ""}
    >
      {/* Time */}
      <span style={{
        fontSize: 9, fontWeight: 700, color: c.text,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        {label}
      </span>
      {/* Label */}
      <span style={{
        fontSize: 9, color: c.text, opacity: 0.8,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        flex: 1,
      }}>
        {sub}
      </span>
    </div>
  );
}

// ── Shared small UI ───────────────────────────────────────────────────────────
function LegDot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--text-muted)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

const navBtnStyle = {
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 6,
  border: "1px solid var(--border)", background: "transparent",
  color: "var(--text-muted)", cursor: "pointer", fontSize: 14,
  transition: "all .12s",
};

function Spin() {
  return (
    <div style={{ width: 16, height: 16, border: "2px solid rgba(255,122,0,0.15)",
      borderTopColor: "#ff7a00", borderRadius: "50%", animation: "spin .65s linear infinite" }} />
  );
}

// ── Modals ────────────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 14, padding: 22, width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        animation: "fadeUp .18s ease both",
      }}>
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
          @keyframes spin   { to { transform:rotate(360deg) } }
        `}</style>
        {children}
      </div>
    </div>
  );
}

function FL({ label, children, half }) {
  return (
    <div style={{ flex: half ? 1 : "none" }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
        textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 12, marginBottom: 12 }}>
      {msg}
    </div>
  );
}

function Opt() { return <span style={{ color: "var(--text-dim)", fontWeight: 400 }}> (optional)</span>; }

function CreateModal({ initial, services, onSave, onClose }) {
  const [mode, setMode] = useState(initial.defMode || "booking");
  const [form, setForm] = useState({
    date:        initial.date       || "",
    start_time:  initial.start_time || "09:00",
    end_time:    initial.end_time   || "10:00",
    client_name: "",
    phone:       "",
    service_id:  services[0]?.id   || "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  function onSvcChange(e) {
    const sid = e.target.value;
    const svc = services.find(s => String(s.id) === String(sid));
    setForm(f => ({
      ...f, service_id: sid,
      end_time: svc ? addMinutes(f.start_time, svc.duration) : f.end_time,
    }));
  }

  async function submit(e) {
    e.preventDefault(); setError("");
    if (!form.date)                       { setError("Date is required."); return; }
    if (form.start_time >= form.end_time) { setError("End time must be after start."); return; }
    setSaving(true);
    const err = await onSave({
      ...form,
      status: mode === "hours" ? "available" : "booked",
      ...(mode === "hours" ? {} : { service_id: form.service_id, client_name: form.client_name, phone: form.phone }),
    });
    setSaving(false);
    if (err) setError(err);
  }

  const noSvc = mode === "booking" && services.length === 0;

  return (
    <Modal onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>New Event</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
      </div>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, background: "var(--surface-2)",
        borderRadius: 8, padding: 3 }}>
        {[["hours","🕐 Working Hours"],["booking","📋 Booking"]].map(([v,l]) => (
          <button key={v} type="button" onClick={() => { setMode(v); setError(""); }}
            style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 600, transition: "all .12s",
              background: mode===v ? "var(--surface)" : "transparent",
              color: mode===v ? "var(--text)" : "var(--text-muted)",
              boxShadow: mode===v ? "0 1px 4px rgba(0,0,0,0.15)" : "none" }}>
            {l}
          </button>
        ))}
      </div>

      <ErrBanner msg={error} />

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FL label="Date">
          <input type="date" value={form.date} onChange={sf("date")} min={todayISO()}
            required style={{ width: "100%", fontSize: 13 }} />
        </FL>
        <div style={{ display: "flex", gap: 10 }}>
          <FL label="Start" half>
            <input type="time" value={form.start_time} onChange={sf("start_time")} required style={{ width: "100%", fontSize: 13 }} />
          </FL>
          <FL label="End" half>
            <input type="time" value={form.end_time} onChange={sf("end_time")} required style={{ width: "100%", fontSize: 13 }} />
          </FL>
        </div>

        {mode === "booking" && (
          noSvc ? (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,122,0,0.07)",
              border: "1px solid rgba(255,122,0,0.2)", fontSize: 12, color: "#ff7a00", lineHeight: 1.65 }}>
              ⚠️ No services yet — add one in the <strong>Services</strong> tab first.
            </div>
          ) : (
            <>
              <FL label="Service">
                <select value={form.service_id} onChange={onSvcChange} style={{ width: "100%", fontSize: 13 }}>
                  <option value="">Select a service…</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} · ${parseFloat(s.price||0).toFixed(2)} · {s.duration}min
                    </option>
                  ))}
                </select>
              </FL>
              <FL label={<>Client name<Opt /></>}>
                <input type="text" value={form.client_name} onChange={sf("client_name")}
                  placeholder="e.g. John Smith" style={{ width: "100%", fontSize: 13 }} />
              </FL>
              <FL label={<>Phone<Opt /></>}>
                <input type="tel" value={form.phone} onChange={sf("phone")}
                  placeholder="+1 234 567 890" style={{ width: "100%", fontSize: 13 }} />
              </FL>
            </>
          )
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button type="submit" disabled={saving || noSvc}
            style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", fontWeight: 700,
              fontSize: 13, cursor: (saving||noSvc) ? "not-allowed" : "pointer",
              opacity: (saving||noSvc) ? 0.5 : 1,
              background: mode === "hours" ? "#22c55e" : "#ff7a00", color: "#fff",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
            {saving ? "Saving…" : mode === "hours" ? "Add working hours" : "Create booking"}
          </button>
          <button type="button" onClick={onClose}
            style={{ padding: "11px 16px", borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ event, services, onSave, onDelete, onClose }) {
  const isWH  = event._type === "availability" || event.status === "available";
  const [form, setForm] = useState({
    date:        event.date,
    start_time:  event.start_time,
    end_time:    event.end_time,
    service_id:  event.service_id || (services[0]?.id || ""),
    client_name: event.client_name || "",
    phone:       event.phone || "",
  });
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error,   setError]   = useState("");

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const c  = isWH ? { base: "#22c55e" } : evColor(event);
  const svc = services.find(s => String(s.id) === String(event.service_id));

  async function submit(e) {
    e.preventDefault(); setError("");
    if (form.start_time >= form.end_time) { setError("End time must be after start."); return; }
    setSaving(true);
    const err = await onSave({ ...event, ...form });
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ height: 3, background: c.base, borderRadius: "12px 12px 0 0", margin: "-22px -22px 18px" }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>
          {isWH ? "Edit working hours" : (svc?.name || "Edit booking")}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
            textTransform: "uppercase", letterSpacing: ".06em",
            background: isWH ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)",
            color: isWH ? "#22c55e" : "#3b82f6",
            border: `1px solid ${isWH ? "rgba(34,197,94,0.25)" : "rgba(59,130,246,0.25)"}` }}>
            {isWH ? "Open" : "Booked"}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
        </div>
      </div>

      {!isWH && event.client_name && event.client_name !== "Client" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 12, color: "var(--text-muted)" }}>
          <span>👤 {event.client_name}</span>
          {event.phone && <span>📞 {event.phone}</span>}
        </div>
      )}

      <ErrBanner msg={error} />

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FL label="Date">
          <input type="date" value={form.date} onChange={sf("date")} required style={{ width: "100%", fontSize: 13 }} />
        </FL>
        <div style={{ display: "flex", gap: 10 }}>
          <FL label="Start" half>
            <input type="time" value={form.start_time} onChange={sf("start_time")} required style={{ width: "100%", fontSize: 13 }} />
          </FL>
          <FL label="End" half>
            <input type="time" value={form.end_time} onChange={sf("end_time")} required style={{ width: "100%", fontSize: 13 }} />
          </FL>
        </div>

        {!isWH && services.length > 0 && (
          <>
            <FL label="Service">
              <select value={form.service_id} onChange={sf("service_id")} style={{ width: "100%", fontSize: 13 }}>
                <option value="">Select…</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} · ${parseFloat(s.price||0).toFixed(2)}</option>
                ))}
              </select>
            </FL>
            <FL label={<>Client<Opt /></>}>
              <input type="text" value={form.client_name} onChange={sf("client_name")} style={{ width: "100%", fontSize: 13 }} />
            </FL>
            <FL label={<>Phone<Opt /></>}>
              <input type="tel" value={form.phone} onChange={sf("phone")} style={{ width: "100%", fontSize: 13 }} />
            </FL>
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button type="submit" disabled={saving}
            style={{ flex: 2, padding: "11px 0", borderRadius: 8, border: "none", fontWeight: 700,
              fontSize: 13, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.5 : 1,
              background: isWH ? "#22c55e" : "#ff7a00", color: "#fff" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>

          {!confirm ? (
            <button type="button" onClick={() => setConfirm(true)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 8, fontSize: 13, cursor: "pointer",
                border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#f87171" }}>
              Delete
            </button>
          ) : (
            <button type="button" onClick={() => onDelete(event)}
              style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "none", fontSize: 13,
                fontWeight: 700, cursor: "pointer", background: "#ef4444", color: "#fff" }}>
              Confirm
            </button>
          )}

          <button type="button" onClick={confirm ? () => setConfirm(false) : onClose}
            style={{ flex: 1, padding: "11px 0", borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
            {confirm ? "Cancel" : "Close"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
