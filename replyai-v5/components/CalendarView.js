/**
 * components/CalendarView.js — Week/Day calendar
 *
 * FIXED BUGS:
 *   1. CreateModal default mode changed to "booked" when clicked from a grid cell
 *      (users clicking a slot intend to create a booking, not an availability marker)
 *   2. "New" button opens modal in "available" mode (correct — owner adding open hours)
 *   3. Error display fixed — onSave returns error string, now shown properly
 *   4. handleCellClick passes correct mode hint to modal
 *   5. Availability-only mode warning clarified in UI
 *   6. Services-empty warning is more actionable
 */
import { useState, useEffect, useRef, useCallback } from "react";

const HOUR_START = 7, HOUR_END = 21;
const HOURS = HOUR_END - HOUR_START;
const CELL_H = 64;
const GRID_H = HOURS * CELL_H;
const TIME_COL_W = 52;
const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PALETTE = ["#ff7a00","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#ef4444"];

function toISO(d) { return d.toISOString().slice(0,10); }
function mondayOf(iso) { const d = new Date(iso+"T00:00:00"); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow); return toISO(d); }
function addDays(iso,n) { const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return toISO(d); }
function todayISO() { return toISO(new Date()); }
function nowTimeStr() { const n=new Date(); return String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0"); }
function timeToMin(t) { if(!t) return 0; const[h,m]=t.split(":").map(Number); return h*60+(m||0); }
function timeToPx(t) { return Math.max(0,(timeToMin(t)-HOUR_START*60)/60*CELL_H); }
function durationPx(s,e) { return Math.max(20,(Math.max(15,timeToMin(e)-timeToMin(s))/60)*CELL_H); }
function fmt12(t) { if(!t) return ""; const[h,m]=t.split(":").map(Number); return `${h%12||12}:${String(m).padStart(2,"0")} ${h<12?"AM":"PM"}`; }
function pxToTime(y) { const tot=Math.round((y/CELL_H)*60/15)*15+HOUR_START*60; const h=Math.max(HOUR_START,Math.min(HOUR_END-1,Math.floor(tot/60))); return String(h).padStart(2,"0")+":"+String(tot%60).padStart(2,"0"); }
function addMinutes(t,mins) { const tot=timeToMin(t)+mins; const h=Math.min(HOUR_END,Math.floor(tot/60)); return String(h).padStart(2,"0")+":"+String(tot%60).padStart(2,"0"); }
function hexRgba(hex,a) { try { const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return `rgba(${r},${g},${b},${a})`; } catch { return `rgba(255,122,0,${a})`; } }
function formatWeekHeader(mon) { const mo=new Date(mon+"T00:00:00"); const su=new Date(mon+"T00:00:00"); su.setDate(mo.getDate()+6); const y=su.getFullYear(); return mo.getMonth()===su.getMonth() ? `${MONTH_NAMES[mo.getMonth()]} ${mo.getDate()}–${su.getDate()}, ${y}` : `${MONTH_NAMES[mo.getMonth()]} ${mo.getDate()} – ${MONTH_NAMES[su.getMonth()]} ${su.getDate()}, ${y}`; }
function evColor(ev) { if (ev.status==="available"||ev._type==="availability") return {bg:"rgba(34,197,94,0.12)",border:"#22c55e",text:"#4ade80"}; const base=ev.service_color||PALETTE[0]; return {bg:hexRgba(base,0.14),border:base,text:base}; }

export default function CalendarView() {
  const [monday,    setMonday]    = useState(() => mondayOf(todayISO()));
  const [events,    setEvents]    = useState([]);
  const [services,  setServices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [nowTime,   setNowTime]   = useState(nowTimeStr);
  const [viewMode,  setViewMode]  = useState("week");
  const [dayFocus,  setDayFocus]  = useState(todayISO());
  const [toast,     setToast]     = useState(null);
  const gridRef = useRef(null);

  useEffect(() => { const id=setInterval(()=>setNowTime(nowTimeStr()),60000); return()=>clearInterval(id); }, []);
  useEffect(() => { if(!loading&&gridRef.current){const off=timeToPx(nowTimeStr())-120;gridRef.current.scrollTop=Math.max(0,off);} }, [loading]);
  useEffect(() => {
    fetch("/api/services")
      .then(r => r.ok ? r.json() : [])
      .then(d => setServices(Array.isArray(d) ? d : []))
      .catch(() => setServices([]));
  }, []);

  const loadWeek = useCallback(async (mon) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/calendar?week=${mon}`);
      if (r.ok) {
        const d = await r.json();
        setEvents(Array.isArray(d.events) ? d.events : []);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWeek(monday); }, [monday]);

  function showToast(msg, ok=true) { setToast({msg,ok}); setTimeout(()=>setToast(null),3500); }

  const days = Array.from({length:7}, (_,i) => addDays(monday,i));
  const viewDays = viewMode==="day" ? [dayFocus] : days;

  // FIX: When user clicks a grid cell, default to "booked" mode if they have services,
  //      "available" if they have no services yet. Pass mode hint to modal.
  function handleCellClick(e, dayISO) {
    const rect  = e.currentTarget.getBoundingClientRect();
    const y     = e.clientY - rect.top;
    const start = pxToTime(y);
    const end   = addMinutes(start, 60);
    // FIX: default to "booked" — clicking a slot means you want to add a booking
    const defaultMode = services.length > 0 ? "booked" : "available";
    setModal({ type:"create", date:dayISO, start_time:start, end_time:end, defaultMode });
  }

  function handleEventClick(e, ev) { e.stopPropagation(); setModal({type:"detail", event:ev}); }

  async function handleCreate(payload) {
    try {
      const r = await fetch("/api/calendar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok) {
        await loadWeek(monday);
        setModal(null);
        showToast(payload.status==="available" ? "Availability slot added ✅" : "Booking created ✅");
        return null; // no error
      }
      return d.error || "Failed to save. Please try again.";
    } catch {
      return "Network error. Please check your connection.";
    }
  }

  async function handleDelete(id, type) {
    try {
      const r = await fetch(`/api/calendar?id=${id}&type=${type}`, { method:"DELETE" });
      if (r.ok) {
        await loadWeek(monday);
        setModal(null);
        showToast("Deleted ✅");
      } else {
        const d = await r.json();
        showToast(d.error || "Failed to delete.", false);
      }
    } catch {
      showToast("Network error.", false);
    }
  }

  const byDate = {};
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = [];
    byDate[ev.date].push(ev);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",position:"relative"}}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          padding:"11px 18px", borderRadius:10, fontSize:13, fontWeight:700,
          background: toast.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.ok ? "#22c55e" : "#ef4444"}`,
          color: toast.ok ? "#4ade80" : "#f87171",
          boxShadow:"0 8px 32px rgba(0,0,0,0.4)",
          animation:"fadeUp 0.2s ease both",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",paddingBottom:14,borderBottom:"1px solid var(--border)",flexShrink:0}}>
        <div style={{flex:1,minWidth:160}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:17,color:"var(--text)",margin:0}}>Calendar</h2>
          <p style={{fontSize:11,color:"var(--text-muted)",marginTop:1,fontFamily:"monospace"}}>
            {viewMode==="week" ? formatWeekHeader(monday) : new Date(dayFocus+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}
          </p>
        </div>
        <div style={{display:"flex",gap:10,fontSize:11,color:"var(--text-dim)",alignItems:"center"}}>
          {[["#22c55e","Available"],["#ff7a00","Booked"]].map(([c,l])=>(
            <span key={l} style={{display:"flex",alignItems:"center",gap:4}}>
              <span style={{width:8,height:8,borderRadius:2,background:c,display:"inline-block"}}/>{l}
            </span>
          ))}
        </div>
        <div style={{display:"flex",background:"var(--surface-2)",borderRadius:7,padding:2,border:"1px solid var(--border)"}}>
          {[["week","Week"],["day","Day"]].map(([v,l])=>(
            <button key={v} onClick={()=>setViewMode(v)}
              style={{padding:"4px 12px",borderRadius:5,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",
                      background:viewMode===v?"var(--orange)":"transparent",
                      color:viewMode===v?"#fff":"var(--text-muted)"}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:5}}>
          <button onClick={()=>{setMonday(mondayOf(todayISO()));setDayFocus(todayISO());}}
            style={{padding:"5px 10px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            Today
          </button>
          <button onClick={()=>setMonday(m=>addDays(m,-7))} style={{width:26,height:26,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13}}>‹</button>
          <button onClick={()=>setMonday(m=>addDays(m,+7))} style={{width:26,height:26,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:13}}>›</button>
        </div>
        {/* FIX: "New" button opens availability by default (owner adding open hours) */}
        <button onClick={()=>setModal({type:"create",date:todayISO(),start_time:"09:00",end_time:"10:00",defaultMode:"available"})}
          style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:8,background:"var(--orange)",color:"#fff",border:"none",fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 0 14px rgba(255,122,0,0.3)"}}>
          <span style={{fontSize:15,lineHeight:1}}>+</span> New
        </button>
      </div>

      {/* Day header row */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        <div style={{display:"grid",gridTemplateColumns:`${TIME_COL_W}px repeat(${viewDays.length},1fr)`,borderBottom:"1px solid var(--border)",flexShrink:0,background:"var(--surface)"}}>
          <div/>
          {viewDays.map((dayISO,i) => {
            const d = new Date(dayISO+"T00:00:00");
            const isToday = dayISO===todayISO();
            const isWeekend = viewMode==="week" && i>=5;
            return (
              <div key={dayISO}
                onClick={()=>{ if(viewMode==="week"){setDayFocus(dayISO);setViewMode("day");} }}
                style={{padding:"7px 0",textAlign:"center",borderLeft:"1px solid var(--border)",cursor:viewMode==="week"?"pointer":"default"}}>
                <div style={{fontSize:10,fontWeight:700,color:isWeekend?"var(--text-dim)":"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>
                  {viewMode==="day" ? d.toLocaleDateString("en-US",{weekday:"short"}) : DAY_NAMES[i]}
                </div>
                <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:28,height:28,borderRadius:"50%",
                  background:isToday?"var(--orange)":"transparent",
                  fontSize:13,fontWeight:800,
                  color:isToday?"#fff":isWeekend?"var(--text-dim)":"var(--text)",
                  fontFamily:"'Syne',sans-serif"}}>
                  {d.getDate()}
                </div>
                {byDate[dayISO]?.length>0 && (
                  <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3}}>
                    {byDate[dayISO].slice(0,4).map((ev,k)=>(
                      <span key={k} style={{width:4,height:4,borderRadius:"50%",background:evColor(ev).border,display:"inline-block"}}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={gridRef} style={{flex:1,overflowY:"auto",overflowX:"hidden"}}>
          {loading ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,gap:12,color:"var(--text-muted)"}}>
              <Spinner/><span style={{fontSize:13}}>Loading…</span>
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:`${TIME_COL_W}px repeat(${viewDays.length},1fr)`,height:GRID_H,position:"relative"}}>

              {/* Time labels */}
              <div style={{position:"relative",borderRight:"1px solid var(--border)"}}>
                {Array.from({length:HOURS},(_,i)=>(
                  <div key={i} style={{position:"absolute",top:i*CELL_H-8,left:0,right:0,padding:"0 6px",display:"flex",justifyContent:"flex-end",pointerEvents:"none"}}>
                    <span style={{fontSize:9,color:"var(--text-dim)",fontFamily:"monospace",lineHeight:1}}>{String(HOUR_START+i).padStart(2,"0")}:00</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {viewDays.map(dayISO => {
                const dayEvents = byDate[dayISO] || [];
                const isToday = dayISO===todayISO();
                return (
                  <div key={dayISO}
                    style={{position:"relative",borderLeft:"1px solid var(--border)",background:isToday?"rgba(255,122,0,0.015)":"transparent",cursor:"crosshair"}}
                    onClick={e=>handleCellClick(e, dayISO)}>

                    {Array.from({length:HOURS},(_,i)=>(
                      <div key={i} style={{position:"absolute",top:i*CELL_H,left:0,right:0,borderTop:i===0?"none":"1px solid var(--border)",pointerEvents:"none"}}>
                        <div style={{position:"absolute",top:CELL_H/2,left:"8%",right:0,borderTop:"1px dashed rgba(255,255,255,0.03)",pointerEvents:"none"}}/>
                      </div>
                    ))}

                    {/* Current time line */}
                    {isToday && (()=>{
                      const top=timeToPx(nowTime);
                      if(top<0||top>GRID_H) return null;
                      return (
                        <div style={{position:"absolute",top,left:0,right:0,zIndex:10,pointerEvents:"none"}}>
                          <div style={{position:"absolute",left:-4,top:-4,width:8,height:8,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 6px #ef4444"}}/>
                          <div style={{height:2,background:"linear-gradient(to right,#ef4444,transparent)",opacity:.8}}/>
                        </div>
                      );
                    })()}

                    {/* Event blocks */}
                    {dayEvents.map((ev,idx)=>(
                      <EventBlock key={ev.id||`ev_${idx}`} event={ev} onClick={e=>handleEventClick(e,ev)}/>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modal?.type==="create" && (
        <CreateModal
          initial={modal}
          services={services}
          onSave={handleCreate}
          onClose={()=>setModal(null)}
        />
      )}
      {modal?.type==="detail" && (
        <DetailModal
          event={modal.event}
          services={services}
          onDelete={handleDelete}
          onClose={()=>setModal(null)}
        />
      )}
    </div>
  );
}

// ── Event block ───────────────────────────────────────────────────────────────
function EventBlock({ event, onClick }) {
  const c = evColor(event);
  const top   = timeToPx(event.start_time);
  const h     = durationPx(event.start_time, event.end_time);
  const short = h < 36;
  const isAvail = event._type==="availability" || event.status==="available";

  return (
    <div onClick={onClick}
      style={{
        position:"absolute", top:top+1, left:2, right:2, height:h-2,
        borderRadius:6, background:c.bg,
        border:`1.5px solid ${c.border}`, borderLeft:`3px solid ${c.border}`,
        padding:short?"2px 6px":"4px 7px",
        cursor:"pointer", overflow:"hidden", zIndex:5,
        transition:"filter 0.1s, transform 0.1s",
        boxShadow:"0 2px 6px rgba(0,0,0,0.2)",
      }}
      onMouseEnter={e=>{e.currentTarget.style.filter="brightness(1.2)";e.currentTarget.style.zIndex="15";e.currentTarget.style.transform="scale(1.01)";}}
      onMouseLeave={e=>{e.currentTarget.style.filter="";e.currentTarget.style.zIndex="5";e.currentTarget.style.transform="";}}>
      <div style={{fontSize:short?9:11,fontWeight:700,color:c.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.3}}>
        {isAvail ? "🟢 Open" : (event.service_name || event.client_name || "Booking")}
      </div>
      {!short && (
        <div style={{fontSize:9,color:c.text,opacity:.75,marginTop:1,fontFamily:"monospace"}}>
          {fmt12(event.start_time)}–{fmt12(event.end_time)}
          {!isAvail && event.client_name && event.client_name!=="Client" ? ` · ${event.client_name}` : ""}
        </div>
      )}
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateModal({ initial, services, onSave, onClose }) {
  // FIX: Use the defaultMode hint from the click handler
  const [mode,  setMode]  = useState(initial.defaultMode || "available");
  const [form,  setForm]  = useState({
    date:        initial.date       || "",
    start_time:  initial.start_time || "09:00",
    end_time:    initial.end_time   || "10:00",
    client_name: "",
    phone:       "",
    service_id:  services[0]?.id   || "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}));

  function handleSvcChange(e) {
    const sid = e.target.value;
    const svc = services.find(s => String(s.id)===String(sid));
    if (svc && form.start_time) {
      setForm(f=>({...f, service_id:sid, end_time:addMinutes(form.start_time, svc.duration)}));
    } else {
      setForm(f=>({...f, service_id:sid}));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!form.date)                     { setError("Date is required."); return; }
    if (form.start_time >= form.end_time){ setError("End time must be after start time."); return; }
    if (mode==="booked" && !form.service_id) { setError("Please select a service."); return; }

    setSaving(true);
    const payload = { ...form, status: mode };
    if (mode==="available") {
      delete payload.service_id;
      delete payload.client_name;
      delete payload.phone;
    }
    const err = await onSave(payload);
    setSaving(false);
    if (err) setError(err);
  }

  const noServices = mode==="booked" && services.length===0;

  return (
    <ModalWrap onClose={onClose}>
      <h3 style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:"var(--text)",marginBottom:14}}>
        <span style={{color:"var(--orange)"}}>+</span> New Event
      </h3>

      {/* Mode toggle */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["available","🟢 Availability"],["booked","🔵 Booking"]].map(([v,l])=>(
          <button key={v} type="button" onClick={()=>{setMode(v);setError("");}}
            style={{
              flex:1, padding:"7px 0", borderRadius:8, border:"1.5px solid",
              fontSize:12, fontWeight:700, cursor:"pointer",
              background: mode===v ? (v==="available"?"rgba(34,197,94,0.12)":"rgba(59,130,246,0.12)") : "transparent",
              borderColor: mode===v ? (v==="available"?"#22c55e":"#3b82f6") : "var(--border)",
              color: mode===v ? (v==="available"?"#22c55e":"#3b82f6") : "var(--text-muted)",
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{padding:"8px 12px",borderRadius:7,background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",color:"#ef4444",fontSize:12,marginBottom:10}}>
          {error}
        </div>
      )}

      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" className="input" value={form.date} onChange={set("date")} required style={{fontSize:13}}/>
        </div>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}>
            <label style={labelStyle}>Start</label>
            <input type="time" className="input" value={form.start_time} onChange={set("start_time")} required style={{fontSize:13}}/>
          </div>
          <div style={{flex:1}}>
            <label style={labelStyle}>End</label>
            <input type="time" className="input" value={form.end_time} onChange={set("end_time")} required style={{fontSize:13}}/>
          </div>
        </div>

        {mode==="booked" && (
          noServices ? (
            <div style={{padding:"10px 12px",borderRadius:8,background:"rgba(255,122,0,0.08)",border:"1px solid rgba(255,122,0,0.2)",fontSize:12,color:"var(--orange)"}}>
              ⚠️ No services yet. Go to <strong>Services</strong> tab to create one first.
            </div>
          ) : (
            <>
              <div>
                <label style={labelStyle}>Service</label>
                <select className="input" value={form.service_id} onChange={handleSvcChange} style={{fontSize:13}}>
                  <option value="">Select service…</option>
                  {services.map(s=>(
                    <option key={s.id} value={s.id}>{s.name} — ${parseFloat(s.price||0).toFixed(2)} · {s.duration}min</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Client name (optional)</label>
                <input type="text" className="input" value={form.client_name} onChange={set("client_name")} placeholder="Client name" style={{fontSize:13}}/>
              </div>
              <div>
                <label style={labelStyle}>Phone (optional)</label>
                <input type="tel" className="input" value={form.phone} onChange={set("phone")} placeholder="+1 234 567 890" style={{fontSize:13}}/>
              </div>
            </>
          )
        )}

        {mode==="available" && (
          <div style={{fontSize:11,color:"var(--text-dim)",padding:"4px 0"}}>
            ✅ Creates an open time slot that clients can book.
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:2}}>
          <button type="submit"
            disabled={saving || noServices}
            style={{
              flex:1, padding:"10px 0", borderRadius:8, border:"none",
              background:"var(--orange)", color:"#fff", fontWeight:700, fontSize:13,
              cursor: (saving||noServices) ? "not-allowed" : "pointer",
              opacity: (saving||noServices) ? .5 : 1,
              boxShadow: !saving&&!noServices ? "0 0 14px rgba(255,122,0,0.3)" : "none",
            }}>
            {saving ? "Saving…" : mode==="available" ? "Add availability slot" : "Create booking"}
          </button>
          <button type="button" onClick={onClose}
            style={{padding:"10px 16px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
            Cancel
          </button>
        </div>
      </form>
    </ModalWrap>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function DetailModal({ event, services, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const c = evColor(event);
  const isAvail = event._type==="availability" || event.status==="available";
  const svc = services.find(s => s.id===event.service_id || String(s.id)===String(event.service_id));
  const deleteId   = isAvail ? (event._real_id || String(event.id).replace("av_","")) : event.id;
  const deleteType = isAvail ? "availability" : "appointment";
  const durMins    = timeToMin(event.end_time) - timeToMin(event.start_time);
  const durLabel   = durMins>=60 ? `${Math.floor(durMins/60)}h${durMins%60?` ${durMins%60}m`:""}` : `${durMins}m`;

  function DR({ icon, label, value }) {
    return (
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <span style={{fontSize:13,width:18,textAlign:"center"}}>{icon}</span>
        <span style={{fontSize:11,color:"var(--text-muted)",width:56,flexShrink:0}}>{label}</span>
        <span style={{fontSize:12,fontWeight:600,color:"var(--text)"}}>{value}</span>
      </div>
    );
  }

  return (
    <ModalWrap onClose={onClose}>
      <div style={{height:4,background:c.border,borderRadius:"4px 4px 0 0",margin:"-20px -20px 14px"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <h3 style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:"var(--text)",margin:0}}>
          {isAvail ? "🟢 Available Slot" : (svc?.name || event.client_name || "Booking")}
        </h3>
        <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:10,background:hexRgba(c.border,.15),color:c.text}}>
          {isAvail ? "Open" : "Booked"}
        </span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        <DR icon="📅" label="Date"     value={event.date}/>
        <DR icon="⏰" label="Time"     value={`${fmt12(event.start_time)} – ${fmt12(event.end_time)}`}/>
        <DR icon="⏱" label="Duration" value={durLabel}/>
        {svc && <DR icon="🛠" label="Service" value={`${svc.name} · $${parseFloat(svc.price||0).toFixed(2)}`}/>}
        {!isAvail && event.client_name && event.client_name!=="Client" && <DR icon="👤" label="Client" value={event.client_name}/>}
        {!isAvail && event.phone && <DR icon="📞" label="Phone" value={event.phone}/>}
      </div>

      {confirming ? (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <p style={{fontSize:12,color:"var(--text-muted)",margin:0}}>Delete this {isAvail?"slot":"booking"}?</p>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>onDelete(deleteId,deleteType)}
              style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>
              Yes, delete
            </button>
            <button onClick={()=>setConfirming(false)}
              style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",fontWeight:600,fontSize:12,cursor:"pointer"}}>
              Keep
            </button>
          </div>
        </div>
      ) : (
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setConfirming(true)}
            style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid rgba(239,68,68,0.4)",background:"rgba(239,68,68,0.08)",color:"#ef4444",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            🗑 Delete
          </button>
          <button onClick={onClose}
            style={{flex:1,padding:"8px 0",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",fontWeight:600,fontSize:12,cursor:"pointer"}}>
            Close
          </button>
        </div>
      )}
    </ModalWrap>
  );
}

function ModalWrap({ children, onClose }) {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:20,width:"100%",maxWidth:400,boxShadow:"0 24px 80px rgba(0,0,0,0.6)",animation:"fadeUp 0.18s ease both"}}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{width:18,height:18,border:"2px solid rgba(255,122,0,0.2)",borderTopColor:"var(--orange)",borderRadius:"50%",animation:"spin 0.6s linear infinite"}}/>;
}

const labelStyle = {
  display:"block", fontSize:10, fontWeight:700,
  color:"var(--text-muted)", textTransform:"uppercase",
  letterSpacing:".06em", marginBottom:5,
};
