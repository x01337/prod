/**
 * CalendarView.js — Hour-block grid calendar
 *
 * Design: 7 columns (days) × N rows (hours)
 * Each cell = one 1-hour square.
 * Empty → click to create. Green → working hours. Coloured → booking.
 *
 * Same API surface as before: GET/POST/PUT/DELETE /api/calendar
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const HOUR_START = 7;
const HOUR_END   = 21;
const HOURS      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS_S   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PAL        = ["#ff7a00","#8b5cf6","#3b82f6","#ec4899","#10b981","#f59e0b","#6366f1"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad      = n  => String(n).padStart(2, "0");
const toISO    = d  => d.toISOString().slice(0, 10);
const todayISO = () => toISO(new Date());
const nowHour  = () => new Date().getHours();

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
function toMin(t)  { if (!t) return 0; const [h,m] = t.split(":").map(Number); return h*60+(m||0); }
function addMinutes(t, mins) {
  const total = toMin(t) + mins;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
function isPast(iso, hour) {
  const today = todayISO();
  if (iso < today) return true;
  if (iso === today && hour < nowHour()) return true;
  return false;
}
function hexRgba(hex, a) {
  try {
    const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  } catch { return `rgba(255,122,0,${a})`; }
}
function bkColor(ev) {
  const base = ev.service_color || PAL[(Number(ev.id)||0) % PAL.length];
  return { base, bg: hexRgba(base, 0.15), border: base, text: base };
}

/**
 * For each (date, hour) cell, determine its state:
 *   "available"  → green  (working hours cover this hour)
 *   "booked"     → colored (an appointment overlaps this hour)
 *   "empty"      → default
 *
 * Returns a Map keyed by `${date}::${hour}` → { state, event? }
 */
function buildCellMap(events) {
  const map = new Map();

  for (const ev of events) {
    if (ev._type === "availability" || ev.status === "available") {
      // Mark every hour this availability covers
      const startH = Math.floor(toMin(ev.start_time) / 60);
      const endH   = Math.ceil(toMin(ev.end_time) / 60);
      for (let h = startH; h < endH; h++) {
        const key = `${ev.date}::${h}`;
        // Don't overwrite a booking
        if (!map.has(key) || map.get(key).state !== "booked") {
          map.set(key, { state: "available", event: ev });
        }
      }
    } else if (ev._type === "appointment") {
      const startH = Math.floor(toMin(ev.start_time) / 60);
      const endH   = Math.ceil(toMin(ev.end_time) / 60);
      for (let h = startH; h < endH; h++) {
        const key = `${ev.date}::${h}`;
        map.set(key, { state: "booked", event: ev });
      }
    }
  }
  return map;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CalendarView() {
  const [monday,   setMonday]   = useState(() => mondayOf(todayISO()));
  const [events,   setEvents]   = useState([]);
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [toast,    setToast]    = useState(null);
  const [tick,     setTick]     = useState(0); // re-render every minute for "now" highlight
  const loadRef = useRef(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Services
  useEffect(() => {
    fetch("/api/services")
      .then(r => r.ok ? r.json() : [])
      .then(d => setServices(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Load week
  const loadWeek = useCallback(async (mon, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch(`/api/calendar?week=${mon}`);
      if (r.ok) {
        const d = await r.json();
        setEvents(Array.isArray(d.events) ? d.events : []);
      }
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { loadRef.current = () => loadWeek(monday, true); }, [loadWeek, monday]);
  useEffect(() => { loadWeek(monday); }, [monday, loadWeek]);

  function toast_(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  }

  const cellMap = useMemo(() => buildCellMap(events), [events]);

  // ── Cell click ─────────────────────────────────────────────────────────────
  function onCellClick(dayISO, hour) {
    if (isPast(dayISO, hour)) return;
    const key = `${dayISO}::${hour}`;
    const cell = cellMap.get(key);

    if (cell) {
      // Click on occupied cell → open edit modal
      setModal({ type: "edit", event: cell.event });
    } else {
      // Click on empty cell → open create modal
      const startTime = `${pad(hour)}:00`;
      const endTime   = `${pad(hour + 1)}:00`;
      setModal({ type: "create", date: dayISO, start_time: startTime, end_time: endTime,
        defMode: services.length > 0 ? "booking" : "hours" });
    }
  }

  // ── API calls ──────────────────────────────────────────────────────────────
  async function onCreate(payload) {
    try {
      const r = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        await loadWeek(monday, true);
        setModal(null);
        toast_(payload.status === "available" ? "Working hours added ✓" : "Booking created ✓");
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
      if (r.ok) { await loadWeek(monday, true); setModal(null); toast_("Saved ✓"); return null; }
      return d.error || "Update failed.";
    } catch { return "Network error."; }
  }

  async function onDelete(ev) {
    const type   = ev._type === "availability" ? "availability" : "appointment";
    const realId = ev._real_id || ev.id;
    try {
      const r = await fetch(`/api/calendar?id=${realId}&type=${type}`, { method: "DELETE" });
      if (r.ok) { await loadWeek(monday, true); setModal(null); toast_("Deleted"); }
      else { const d = await r.json(); toast_(d.error || "Delete failed.", false); }
    } catch { toast_("Network error.", false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const weekLabel = (() => {
    const mo = new Date(monday + "T00:00:00");
    const su = new Date(addDays(monday, 6) + "T00:00:00");
    return mo.getMonth() === su.getMonth()
      ? `${MONTHS_S[mo.getMonth()]} ${mo.getDate()}–${su.getDate()}, ${su.getFullYear()}`
      : `${MONTHS_S[mo.getMonth()]} ${mo.getDate()} – ${MONTHS_S[su.getMonth()]} ${su.getDate()}, ${su.getFullYear()}`;
  })();

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0,
      fontFamily:"var(--font-sans)", background:"var(--color-background-primary)" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
          padding:"10px 18px", borderRadius:10, fontSize:13, fontWeight:500,
          background: toast.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${toast.ok ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
          boxShadow:"0 4px 24px rgba(0,0,0,0.25)",
          animation:"slideUp .2s ease both",
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px",
        borderBottom:"1px solid var(--color-border-tertiary)", flexShrink:0, flexWrap:"wrap" }}>

        {/* Logo + title */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:4 }}>
          <div style={{ width:26, height:26, borderRadius:7, background:"#ff7a00",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
              <path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--color-text-primary)", lineHeight:1.2 }}>
              Schedule
            </div>
            <div style={{ fontSize:10, color:"var(--color-text-tertiary)", fontFamily:"monospace" }}>
              {weekLabel}
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display:"flex", gap:3 }}>
          <NavBtn onClick={() => setMonday(m => addDays(m, -7))} title="Previous week">‹</NavBtn>
          <NavBtn onClick={() => { setMonday(mondayOf(todayISO())); }} title="Today">·</NavBtn>
          <NavBtn onClick={() => setMonday(m => addDays(m, +7))} title="Next week">›</NavBtn>
        </div>

        {/* Spacer */}
        <div style={{ flex:1 }} />

        {/* Legend */}
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <LegItem color="#22c55e" label="Working hours" stripe />
          <LegItem color="#ff7a00" label="Booking" />
        </div>

        {/* Actions */}
        <ActionBtn
          color="#22c55e" bg="rgba(34,197,94,0.09)" border="rgba(34,197,94,0.25)"
          onClick={() => setModal({ type:"create", date:todayISO(), start_time:"09:00", end_time:"17:00", defMode:"hours" })}>
          + Working hours
        </ActionBtn>
        <ActionBtn
          color="#fff" bg="#ff7a00" glow
          onClick={() => setModal({ type:"create", date:todayISO(), start_time:"09:00", end_time:"10:00", defMode:"booking" })}>
          + Booking
        </ActionBtn>
      </div>

      {/* ── Grid ── */}
      <div style={{ flex:1, minHeight:0, overflowY:"auto", overflowX:"auto", padding:"12px 16px 24px" }}>
        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200,
            gap:10, color:"var(--color-text-tertiary)" }}>
            <Spin /> <span style={{ fontSize:13 }}>Loading…</span>
          </div>
        ) : (
          <table style={{ borderCollapse:"separate", borderSpacing:4, width:"100%" }}>
            <thead>
              <tr>
                {/* Hour label column header */}
                <th style={{ width:44, padding:0 }} />
                {days.map((dayISO, i) => {
                  const d        = new Date(dayISO + "T00:00:00");
                  const isToday  = dayISO === todayISO();
                  const isPastD  = dayISO < todayISO();
                  const weekend  = i >= 5;
                  const evCount  = events.filter(e => e.date === dayISO && e._type === "appointment").length;
                  return (
                    <th key={dayISO} style={{ padding:"0 0 6px", textAlign:"center", minWidth:100 }}>
                      <div style={{ display:"inline-flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                        <span style={{ fontSize:9, fontWeight:600, textTransform:"uppercase", letterSpacing:".07em",
                          color: isToday ? "#ff7a00" : weekend ? "var(--color-text-tertiary)" : "var(--color-text-tertiary)" }}>
                          {DAYS_SHORT[i]}
                        </span>
                        <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
                          background: isToday ? "#ff7a00" : "transparent",
                          boxShadow: isToday ? "0 0 12px rgba(255,122,0,0.4)" : "none",
                          fontSize:13, fontWeight:600,
                          color: isToday ? "#fff" : isPastD ? "var(--color-text-tertiary)" : weekend ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}>
                          {d.getDate()}
                        </div>
                        {evCount > 0 && (
                          <div style={{ display:"flex", gap:2 }}>
                            {Array.from({ length: Math.min(evCount, 3) }).map((_, k) => (
                              <div key={k} style={{ width:4, height:4, borderRadius:"50%", background:"#ff7a00" }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => {
                const isNowHour = todayISO() && hour === nowHour();
                return (
                  <tr key={hour}>
                    {/* Time label */}
                    <td style={{ textAlign:"right", paddingRight:8, paddingBottom:0, verticalAlign:"middle", whiteSpace:"nowrap" }}>
                      <span style={{ fontSize:9, color: isNowHour ? "#ff7a00" : "var(--color-text-tertiary)",
                        fontFamily:"monospace", fontWeight: isNowHour ? 700 : 400 }}>
                        {pad(hour)}:00
                      </span>
                    </td>

                    {/* Day cells */}
                    {days.map((dayISO, di) => {
                      const key     = `${dayISO}::${hour}`;
                      const cell    = cellMap.get(key);
                      const past    = isPast(dayISO, hour);
                      const weekend = di >= 5;
                      const isNow   = dayISO === todayISO() && hour === nowHour();
                      const isToday = dayISO === todayISO();

                      return (
                        <td key={dayISO} style={{ padding:0, verticalAlign:"top" }}>
                          <Cell
                            cell={cell}
                            past={past}
                            isNow={isNow}
                            isToday={isToday}
                            weekend={weekend}
                            hour={hour}
                            onClick={() => onCellClick(dayISO, hour)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {modal?.type === "create" && (
        <CreateModal initial={modal} services={services} onSave={onCreate} onClose={() => setModal(null)} />
      )}
      {modal?.type === "edit" && (
        <EditModal event={modal.event} services={services} onSave={onUpdate} onDelete={onDelete} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ── Cell ─────────────────────────────────────────────────────────────────────
function Cell({ cell, past, isNow, isToday, weekend, hour, onClick }) {
  const [hovered, setHovered] = useState(false);
  const state = cell?.state || "empty";
  const ev    = cell?.event;

  let bg, border, cursor, content = null;

  if (past) {
    bg     = "var(--color-background-tertiary)";
    border = "var(--color-border-tertiary)";
    cursor = "not-allowed";
  } else if (state === "available") {
    bg     = hovered ? "rgba(34,197,94,0.14)" : "rgba(34,197,94,0.07)";
    border = "rgba(34,197,94,0.3)";
    cursor = "pointer";
    content = (
      <div style={{ fontSize:9, fontWeight:500, color:"rgba(22,163,74,0.7)",
        textTransform:"uppercase", letterSpacing:".05em", userSelect:"none" }}>
        Open
      </div>
    );
  } else if (state === "booked") {
    const c = bkColor(ev);
    bg     = hovered ? hexRgba(c.base, 0.22) : hexRgba(c.base, 0.14);
    border = hexRgba(c.base, 0.5);
    cursor = "pointer";
    content = (
      <div style={{ display:"flex", flexDirection:"column", gap:1, userSelect:"none" }}>
        <div style={{ fontSize:10, fontWeight:600, color:c.text, overflow:"hidden",
          whiteSpace:"nowrap", textOverflow:"ellipsis", lineHeight:1.3 }}>
          {ev.service_name || ev.client_name || "Booking"}
        </div>
        {ev.client_name && ev.client_name !== "Client" && ev.service_name && (
          <div style={{ fontSize:9, color:c.text, opacity:.7, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
            {ev.client_name}
          </div>
        )}
      </div>
    );
  } else {
    // empty
    bg     = isNow
      ? "rgba(255,122,0,0.06)"
      : isToday
      ? "rgba(255,122,0,0.025)"
      : hovered
      ? "var(--color-background-secondary)"
      : "var(--color-background-secondary)";
    border = isNow
      ? "rgba(255,122,0,0.35)"
      : hovered
      ? "var(--color-border-primary)"
      : "var(--color-border-tertiary)";
    cursor = "pointer";
  }

  return (
    <div
      onClick={!past ? onClick : undefined}
      onMouseEnter={() => !past && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 52,
        borderRadius: 8,
        background: bg,
        border: `1px solid ${border}`,
        cursor,
        padding: "6px 8px",
        display: "flex",
        flexDirection: "column",
        justifyContent: state === "empty" ? "flex-end" : "flex-start",
        position: "relative",
        transition: "background 0.1s, border-color 0.1s",
        opacity: past ? 0.45 : 1,
        overflow: "hidden",
      }}>

      {/* Now indicator dot */}
      {isNow && (
        <div style={{ position:"absolute", top:5, right:6, width:6, height:6, borderRadius:"50%",
          background:"#ff7a00", boxShadow:"0 0 6px rgba(255,122,0,0.6)" }} />
      )}

      {/* Left accent bar for bookings */}
      {state === "booked" && (
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3,
          borderRadius:"8px 0 0 8px", background:bkColor(ev).base }} />
      )}
      {state === "available" && (
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3,
          borderRadius:"8px 0 0 8px", background:"rgba(34,197,94,0.6)" }} />
      )}

      {content && <div style={{ paddingLeft:5 }}>{content}</div>}

      {/* "+" hint on hover for empty cells */}
      {state === "empty" && !past && hovered && (
        <div style={{ fontSize:16, color:"var(--color-text-tertiary)", lineHeight:1, paddingBottom:1, paddingLeft:2 }}>
          +
        </div>
      )}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function NavBtn({ onClick, children, title }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width:26, height:26, borderRadius:6, border:"1px solid var(--color-border-tertiary)",
        background:"var(--color-background-primary)", color:"var(--color-text-secondary)",
        cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .12s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor="var(--color-border-primary)"; e.currentTarget.style.color="var(--color-text-primary)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor="var(--color-border-tertiary)"; e.currentTarget.style.color="var(--color-text-secondary)"; }}>
      {children}
    </button>
  );
}

function ActionBtn({ onClick, children, color, bg, border, glow }) {
  return (
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 13px",
        borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .15s",
        background:bg||"transparent", color, border:`1px solid ${border||"transparent"}`,
        boxShadow:glow?"0 0 14px rgba(255,122,0,0.3)":"none" }}
      onMouseEnter={e => e.currentTarget.style.filter="brightness(0.92)"}
      onMouseLeave={e => e.currentTarget.style.filter=""}>
      {children}
    </button>
  );
}

function LegItem({ color, label, stripe }) {
  return (
    <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"var(--color-text-tertiary)" }}>
      <span style={{ width:stripe?14:9, height:stripe?4:9, borderRadius:stripe?2:"50%",
        background:stripe?`${color}50`:color, border:`1px solid ${color}88`, display:"inline-block" }} />
      {label}
    </span>
  );
}

function Spin() {
  return (
    <div style={{ width:16, height:16, border:"2px solid rgba(255,122,0,0.15)",
      borderTopColor:"#ff7a00", borderRadius:"50%", animation:"spin .65s linear infinite" }} />
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
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
        zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"var(--color-background-primary)", border:"1px solid var(--color-border-tertiary)",
        borderRadius:14, padding:22, width:"100%", maxWidth:400,
        boxShadow:"0 20px 60px rgba(0,0,0,0.3)", animation:"slideUp .18s ease both" }}>
        <style>{`
          @keyframes slideUp  { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
          @keyframes spin     { to { transform:rotate(360deg) } }
        `}</style>
        {children}
      </div>
    </div>
  );
}

function FL({ label, children, half }) {
  return (
    <div style={{ flex: half ? 1 : "none" }}>
      <label style={{ display:"block", fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", marginBottom:5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ padding:"8px 12px", borderRadius:7, background:"rgba(239,68,68,0.08)",
      border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:12, marginBottom:12 }}>
      {msg}
    </div>
  );
}

function Opt() { return <span style={{ color:"var(--color-text-tertiary)", fontWeight:400 }}> (optional)</span>; }

function CreateModal({ initial, services, onSave, onClose }) {
  const [mode, setMode]     = useState(initial.defMode || "booking");
  const [form, setForm]     = useState({
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
      ...f,
      service_id: sid,
      // FIX: addMinutes() correctly preserves start minutes (e.g. 09:30 + 60min = 10:30,
      // whereas the old parseInt()-based math dropped minutes and produced 10:00)
      end_time: svc ? addMinutes(f.start_time, svc.duration) : f.end_time,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.date)                      { setError("Date is required."); return; }
    if (form.start_time >= form.end_time){ setError("End time must be after start time."); return; }
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
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <h3 style={{ fontSize:15, fontWeight:600, color:"var(--color-text-primary)", margin:0 }}>New event</h3>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
          color:"var(--color-text-tertiary)", fontSize:18, lineHeight:1, padding:2 }}>×</button>
      </div>

      {/* Mode selector */}
      <div style={{ display:"flex", gap:0, marginBottom:14, background:"var(--color-background-secondary)",
        borderRadius:8, padding:3 }}>
        {[["hours","🕐 Working Hours"],["booking","📋 Booking"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => { setMode(v); setError(""); }}
            style={{ flex:1, padding:"7px 0", borderRadius:6, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:500, transition:"all .12s",
              background: mode===v ? "var(--color-background-primary)" : "transparent",
              color: mode===v ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
              boxShadow: mode===v ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {l}
          </button>
        ))}
      </div>

      <ErrBanner msg={error} />

      <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <FL label="Date">
          <input type="date" value={form.date} onChange={sf("date")} min={todayISO()}
            required style={{ width:"100%", fontSize:13 }} />
        </FL>
        <div style={{ display:"flex", gap:10 }}>
          <FL label="Start" half>
            <input type="time" value={form.start_time} onChange={sf("start_time")}
              required style={{ width:"100%", fontSize:13 }} />
          </FL>
          <FL label="End" half>
            <input type="time" value={form.end_time} onChange={sf("end_time")}
              required style={{ width:"100%", fontSize:13 }} />
          </FL>
        </div>

        {mode === "booking" && (
          noSvc ? (
            <div style={{ padding:"10px 12px", borderRadius:8, background:"rgba(255,122,0,0.07)",
              border:"1px solid rgba(255,122,0,0.2)", fontSize:12, color:"#ff7a00", lineHeight:1.65 }}>
              ⚠️ No services yet — add one in the <strong>Services</strong> tab first.
            </div>
          ) : (
            <>
              <FL label="Service">
                <select value={form.service_id} onChange={onSvcChange} style={{ width:"100%", fontSize:13 }}>
                  <option value="">Select a service…</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} · ${parseFloat(s.price||0).toFixed(2)} · {s.duration}min
                    </option>
                  ))}
                </select>
              </FL>
              <FL label={<>Client name<Opt/></>}>
                <input type="text" value={form.client_name} onChange={sf("client_name")}
                  placeholder="e.g. John Smith" style={{ width:"100%", fontSize:13 }} />
              </FL>
              <FL label={<>Phone<Opt/></>}>
                <input type="tel" value={form.phone} onChange={sf("phone")}
                  placeholder="+1 234 567 890" style={{ width:"100%", fontSize:13 }} />
              </FL>
            </>
          )
        )}

        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <button type="submit" disabled={saving || noSvc}
            style={{ flex:1, padding:"11px 0", borderRadius:8, border:"none", fontWeight:600, fontSize:13,
              cursor:(saving||noSvc)?"not-allowed":"pointer", opacity:(saving||noSvc)?0.5:1, transition:"all .15s",
              background: mode==="hours" ? "#22c55e" : "#ff7a00",
              color: "#fff",
              boxShadow: (!saving&&!noSvc) ? "0 2px 12px rgba(0,0,0,0.15)" : "none" }}>
            {saving ? "Saving…" : mode==="hours" ? "Add working hours" : "Create booking"}
          </button>
          <button type="button" onClick={onClose}
            style={{ padding:"11px 16px", borderRadius:8, border:"1px solid var(--color-border-tertiary)",
              background:"transparent", color:"var(--color-text-secondary)", fontSize:13, cursor:"pointer" }}>
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
    service_id:  event.service_id || (services[0]?.id||""),
    client_name: event.client_name || "",
    phone:       event.phone || "",
  });
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error,   setError]   = useState("");

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const c  = isWH ? { base:"#22c55e" } : bkColor(event);
  const svc = services.find(s => String(s.id) === String(event.service_id));

  async function submit(e) {
    e.preventDefault(); setError("");
    if (form.start_time >= form.end_time) { setError("End time must be after start time."); return; }
    setSaving(true);
    const err = await onSave({ ...event, ...form });
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <Modal onClose={onClose}>
      {/* Accent bar */}
      <div style={{ height:3, background:c.base, borderRadius:"12px 12px 0 0", margin:"-22px -22px 18px" }} />

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <h3 style={{ fontSize:15, fontWeight:600, color:"var(--color-text-primary)", margin:0 }}>
          {isWH ? "Edit working hours" : (svc?.name || "Edit booking")}
        </h3>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:5, textTransform:"uppercase",
            letterSpacing:".06em",
            background: isWH ? "rgba(34,197,94,0.1)" : "rgba(255,122,0,0.1)",
            color: isWH ? "#22c55e" : "#ff7a00",
            border: `1px solid ${isWH ? "rgba(34,197,94,0.25)" : "rgba(255,122,0,0.25)"}` }}>
            {isWH ? "Open" : "Booked"}
          </span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer",
            color:"var(--color-text-tertiary)", fontSize:18, lineHeight:1, padding:2 }}>×</button>
        </div>
      </div>

      <ErrBanner msg={error} />

      <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <FL label="Date">
          <input type="date" value={form.date} onChange={sf("date")} required style={{ width:"100%", fontSize:13 }} />
        </FL>
        <div style={{ display:"flex", gap:10 }}>
          <FL label="Start" half>
            <input type="time" value={form.start_time} onChange={sf("start_time")} required style={{ width:"100%", fontSize:13 }} />
          </FL>
          <FL label="End" half>
            <input type="time" value={form.end_time} onChange={sf("end_time")} required style={{ width:"100%", fontSize:13 }} />
          </FL>
        </div>

        {!isWH && services.length > 0 && (
          <>
            <FL label="Service">
              <select value={form.service_id} onChange={sf("service_id")} style={{ width:"100%", fontSize:13 }}>
                <option value="">Select…</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} · ${parseFloat(s.price||0).toFixed(2)}</option>
                ))}
              </select>
            </FL>
            <FL label={<>Client<Opt/></>}>
              <input type="text" value={form.client_name} onChange={sf("client_name")} style={{ width:"100%", fontSize:13 }} />
            </FL>
            <FL label={<>Phone<Opt/></>}>
              <input type="tel" value={form.phone} onChange={sf("phone")} style={{ width:"100%", fontSize:13 }} />
            </FL>
          </>
        )}

        <div style={{ display:"flex", gap:8, marginTop:4 }}>
          <button type="submit" disabled={saving}
            style={{ flex:2, padding:"11px 0", borderRadius:8, border:"none", fontWeight:600, fontSize:13,
              cursor:saving?"not-allowed":"pointer", opacity:saving?0.5:1,
              background: isWH ? "#22c55e" : "#ff7a00", color:"#fff",
              boxShadow:"0 2px 12px rgba(0,0,0,0.1)", transition:"all .15s" }}>
            {saving ? "Saving…" : "Save changes"}
          </button>

          {!confirm && (
            <button type="button" onClick={() => setConfirm(true)}
              style={{ flex:1, padding:"11px 0", borderRadius:8, fontSize:13, cursor:"pointer",
                border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.07)", color:"#f87171" }}>
              Delete
            </button>
          )}
          {confirm && (
            <button type="button" onClick={() => onDelete(event)}
              style={{ flex:1, padding:"11px 0", borderRadius:8, border:"none", fontSize:13, fontWeight:600,
                cursor:"pointer", background:"#ef4444", color:"#fff" }}>
              Confirm
            </button>
          )}

          <button type="button" onClick={confirm ? () => setConfirm(false) : onClose}
            style={{ flex:1, padding:"11px 0", borderRadius:8, border:"1px solid var(--color-border-tertiary)",
              background:"transparent", color:"var(--color-text-secondary)", fontSize:13, cursor:"pointer" }}>
            {confirm ? "Cancel" : "Close"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
