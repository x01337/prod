/**
 * CalendarView.js — Production-grade planner calendar
 *
 * Features implemented:
 *   • Past-date prevention (frontend + backend validation)
 *   • Past time slots visually grayed out with diagonal stripe
 *   • Working hours = merged background lanes (green stripe, z:2)
 *   • Bookings = solid premium cards (z:10) with service color
 *   • Drag to move (vertical time + horizontal day crossing)
 *   • Drag resize handle (bottom of each event)
 *   • Optimistic UI + server sync
 *   • Edit modal — change everything about an event
 *   • Current day highlighted + auto-centered on mount
 *   • Horizontal scroll via trackpad/wheel
 *   • Stale-state fixes: stable loadWeek ref, silent reloads, no flicker
 *   • Sticky time column
 *   • Empty state guidance
 *   • Toast notifications
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ─── Grid constants ────────────────────────────────────────────────────────
const HOUR_START = 7;
const HOUR_END   = 22;
const HOURS      = HOUR_END - HOUR_START;
const CELL_H     = 68;          // px per hour — slightly taller for readability
const GRID_H     = HOURS * CELL_H;
const TIME_COL   = 52;
const DAY_MIN_W  = 130;         // min px per day column
const SNAP       = 15;          // minute snapping

const DAY_NAMES  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PALETTE    = ["#ff7a00","#3b82f6","#8b5cf6","#ec4899","#10b981","#f59e0b","#6366f1","#ef4444"];

// ─── Helpers ───────────────────────────────────────────────────────────────
const pad      = n  => String(n).padStart(2,"0");
const toISO    = d  => d.toISOString().slice(0,10);
const todayISO = () => toISO(new Date());
const nowStr   = () => { const n=new Date(); return `${pad(n.getHours())}:${pad(n.getMinutes())}`; };

function mondayOf(iso) {
  const d=new Date(iso+"T00:00:00"); const dow=(d.getDay()+6)%7;
  d.setDate(d.getDate()-dow); return toISO(d);
}
function addDays(iso,n) { const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return toISO(d); }
function toMin(t)   { if(!t)return 0; const[h,m]=t.split(":").map(Number); return h*60+(m||0); }
function toStr(m)   { return `${pad(Math.floor(m/60))}:${pad(m%60)}`; }
function toPx(t)    { return Math.max(0,(toMin(t)-HOUR_START*60)/60*CELL_H); }
function durPx(s,e) { return Math.max(24,Math.max(SNAP,(toMin(e)-toMin(s)))/60*CELL_H); }
function snapM(m)   { return Math.round(m/SNAP)*SNAP; }
function pxToMin(y) { return snapM((y/CELL_H)*60+HOUR_START*60); }
function clampM(m)  { return Math.max(HOUR_START*60,Math.min((HOUR_END-1)*60,m)); }
function fmt12(t)   { if(!t)return""; const[h,m]=t.split(":").map(Number); return`${h%12||12}:${pad(m)} ${h<12?"AM":"PM"}`; }
function addM(t,m)  { const tot=toMin(t)+m; return toStr(Math.min(HOUR_END*60,tot)); }
function hexRgba(hex,a) { try{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}catch{return`rgba(255,122,0,${a})`;} }

function fmtWeekHead(mon) {
  const a=new Date(mon+"T00:00:00"),b=new Date(mon+"T00:00:00"); b.setDate(a.getDate()+6);
  return a.getMonth()===b.getMonth()
    ? `${MONTHS[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}`
    : `${MONTHS[a.getMonth()]} ${a.getDate()} – ${MONTHS[b.getMonth()]} ${b.getDate()}, ${b.getFullYear()}`;
}

// Is a given date+time in the past?
function isPastDate(iso) { return iso < todayISO(); }
function isPastSlot(iso, timeStr) {
  if (iso < todayISO()) return true;
  if (iso === todayISO() && timeStr <= nowStr()) return true;
  return false;
}

// Event coloring
function bkColor(ev) {
  const base = ev.service_color || PALETTE[(Number(ev.id)||0) % PALETTE.length];
  return { base, bg: hexRgba(base,0.16), border: hexRgba(base,0.55), text: base, glow: hexRgba(base,0.25) };
}

// Working-hours merge
function mergeHours(slots) {
  if (!slots.length) return [];
  const s = [...slots].sort((a,b)=>toMin(a.start_time)-toMin(b.start_time));
  const out = [{ ...s[0] }];
  for (let i=1;i<s.length;i++) {
    const last=out[out.length-1], cur=s[i];
    if (toMin(cur.start_time)<=toMin(last.end_time)) {
      if (toMin(cur.end_time)>toMin(last.end_time)) last.end_time=cur.end_time;
    } else { out.push({...cur}); }
  }
  return out;
}

// ─── Main component ────────────────────────────────────────────────────────
export default function CalendarView() {
  const [monday,   setMonday]   = useState(()=>mondayOf(todayISO()));
  const [events,   setEvents]   = useState([]);
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [nowTime,  setNowTime]  = useState(nowStr);
  const [toast,    setToast]    = useState(null);
  const [ghost,    setGhost]    = useState(null);

  const gridScrollRef = useRef(null);
  const colRefs       = useRef({});
  const dragRef       = useRef(null);
  const loadWeekRef   = useRef(null);

  const days = useMemo(()=>Array.from({length:7},(_,i)=>addDays(monday,i)),[monday]);

  // Clock tick
  useEffect(()=>{ const id=setInterval(()=>setNowTime(nowStr()),30_000); return()=>clearInterval(id); },[]);

  // Load services
  useEffect(()=>{
    fetch("/api/services").then(r=>r.ok?r.json():[]).then(d=>setServices(Array.isArray(d)?d:[])).catch(()=>{});
  },[]);

  // Load week
  const loadWeek = useCallback(async(mon, silent=false)=>{
    if (!silent) setLoading(true);
    try {
      const r=await fetch(`/api/calendar?week=${mon}`);
      if (r.ok) { const d=await r.json(); setEvents(Array.isArray(d.events)?d.events:[]); }
    } catch {}
    finally { if(!silent) setLoading(false); }
  },[]);

  useEffect(()=>{ loadWeekRef.current=()=>loadWeek(monday,true); },[loadWeek,monday]);
  useEffect(()=>{ loadWeek(monday); },[monday,loadWeek]);

  // Scroll to current time
  useEffect(()=>{
    if (!loading&&gridScrollRef.current) {
      gridScrollRef.current.scrollTop=Math.max(0,toPx(nowStr())-180);
    }
  },[loading]);

  // Center today horizontally
  useEffect(()=>{
    if (loading) return;
    const el=colRefs.current[todayISO()];
    const cont=gridScrollRef.current?.parentElement;
    if (el&&cont) {
      const target=el.offsetLeft-(cont.offsetWidth-el.offsetWidth)/2;
      cont.scrollTo({left:Math.max(0,target),behavior:"smooth"});
    }
  },[loading]);

  function toast_(msg,ok=true){ setToast({msg,ok}); setTimeout(()=>setToast(null),3200); }

  const byDate = useMemo(()=>{
    const m={};
    for (const ev of events) { if(!m[ev.date])m[ev.date]=[]; m[ev.date].push(ev); }
    return m;
  },[events]);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  function startDrag(e,ev,mode) {
    if (e.button!==0) return;
    e.preventDefault(); e.stopPropagation();
    dragRef.current={ev,mode,startY:e.clientY,startX:e.clientX,origStart:toMin(ev.start_time),origEnd:toMin(ev.end_time),origDate:ev.date,curDate:ev.date};
    setGhost({...ev,_dragging:true});
    window.addEventListener("pointermove",onDragMove,{passive:false});
    window.addEventListener("pointerup",onDragEnd);
  }

  const onDragMove=useCallback((e)=>{
    const ds=dragRef.current; if (!ds) return;
    const dy=e.clientY-ds.startY;
    const delta=snapM((dy/CELL_H)*60);
    if (ds.mode==="resize") {
      const newEnd=clampM(ds.origEnd+delta);
      if (newEnd<=ds.origStart+SNAP) return;
      setGhost(g=>g?{...g,start_time:ds.ev.start_time,end_time:toStr(newEnd),date:ds.curDate}:null);
      return;
    }
    // move
    const newStart=clampM(ds.origStart+delta);
    const dur=ds.origEnd-ds.origStart;
    const newEnd=Math.min(HOUR_END*60,newStart+dur);
    let hovered=ds.origDate;
    for (const [dayISO,el] of Object.entries(colRefs.current)) {
      if (!el) continue;
      const r=el.getBoundingClientRect();
      if (e.clientX>=r.left&&e.clientX<=r.right) { hovered=dayISO; break; }
    }
    // Prevent dragging to past
    if (!isPastDate(hovered)) {
      ds.curDate=hovered;
      setGhost(g=>g?{...g,start_time:toStr(newStart),end_time:toStr(newEnd),date:hovered}:null);
    }
  },[]);

  const onDragEnd=useCallback(async()=>{
    window.removeEventListener("pointermove",onDragMove);
    window.removeEventListener("pointerup",onDragEnd);
    const ds=dragRef.current; dragRef.current=null;
    if (!ds||!ghost) { setGhost(null); return; }
    const {ev}=ds; const ng=ghost;
    if (ng.date===ev.date&&ng.start_time===ev.start_time&&ng.end_time===ev.end_time) { setGhost(null); return; }
    if (isPastDate(ng.date)||isPastSlot(ng.date,ng.end_time)) {
      toast_("Cannot move to the past ⛔", false);
      setGhost(null); return;
    }
    // Optimistic update
    setEvents(prev=>prev.map(e=>String(e.id)===String(ev.id)?{...e,date:ng.date,start_time:ng.start_time,end_time:ng.end_time}:e));
    setGhost(null);
    const type=ev._type==="availability"?"availability":"appointment";
    const realId=ev._real_id||ev.id;
    try {
      const r=await fetch("/api/calendar",{method:"PUT",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id:realId,type,date:ng.date,start_time:ng.start_time,end_time:ng.end_time})});
      if (!r.ok) { const d=await r.json(); toast_(d.error||"Move failed.",false); loadWeekRef.current?.(); }
    } catch { toast_("Network error.",false); loadWeekRef.current?.(); }
  },[ghost,onDragMove]);

  // ─── Create / Update / Delete ─────────────────────────────────────────────
  async function onCreate(payload) {
    if (isPastDate(payload.date)) return "Cannot create events in the past.";
    if (isPastSlot(payload.date,payload.end_time)) return "Cannot create events that have already ended.";
    try {
      const r=await fetch("/api/calendar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await r.json();
      if (r.ok) { await loadWeek(monday,true); setModal(null); toast_(payload.status==="available"?"✅ Working hours added":"✅ Booking created"); return null; }
      return d.error||"Save failed.";
    } catch { return "Network error."; }
  }

  async function onUpdate(payload) {
    if (isPastDate(payload.date)) return "Cannot move events to the past.";
    const type=payload._type==="availability"?"availability":"appointment";
    const realId=payload._real_id||payload.id;
    try {
      const r=await fetch("/api/calendar",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,id:realId,type})});
      const d=await r.json();
      if (r.ok) { await loadWeek(monday,true); setModal(null); toast_("✅ Saved"); return null; }
      return d.error||"Update failed.";
    } catch { return "Network error."; }
  }

  async function onDelete(ev) {
    const type=ev._type==="availability"?"availability":"appointment";
    const realId=ev._real_id||ev.id;
    try {
      const r=await fetch(`/api/calendar?id=${realId}&type=${type}`,{method:"DELETE"});
      if (r.ok) { await loadWeek(monday,true); setModal(null); toast_("🗑 Deleted"); }
      else { const d=await r.json(); toast_(d.error||"Delete failed.",false); }
    } catch { toast_("Network error.",false); }
  }

  function onCellClick(e,dayISO) {
    // Don't open if clicking on an event
    if (e.target!==e.currentTarget) return;
    if (isPastDate(dayISO)) return; // past day — ignore
    const y=e.clientY-e.currentTarget.getBoundingClientRect().top;
    const start=toStr(clampM(pxToMin(y)));
    if (isPastSlot(dayISO,start)) return; // past time — ignore
    setModal({type:"create",date:dayISO,start_time:start,end_time:addM(start,60),defMode:services.length>0?"booking":"hours"});
  }

  // Horizontal wheel scroll
  function onHWheel(e) {
    if (Math.abs(e.deltaX)>=Math.abs(e.deltaY)) {
      e.preventDefault();
      e.currentTarget.scrollLeft+=e.deltaX;
    }
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",minHeight:0,background:"var(--surface)",borderRadius:14,overflow:"hidden",border:"1px solid var(--border)"}}>

      {/* Toast */}
      {toast&&<div style={{position:"fixed",bottom:28,right:28,zIndex:9999,padding:"11px 20px",borderRadius:12,fontSize:13,fontWeight:700,
        background:toast.ok?"rgba(34,197,94,.13)":"rgba(239,68,68,.13)",
        border:`1px solid ${toast.ok?"rgba(34,197,94,.35)":"rgba(239,68,68,.35)"}`,
        color:toast.ok?"#4ade80":"#f87171",
        boxShadow:"0 8px 40px rgba(0,0,0,.55)",backdropFilter:"blur(12px)",
        animation:"slideInRight .22s ease both",
      }}>{toast.msg}</div>}

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderBottom:"1px solid var(--border)",flexShrink:0,flexWrap:"wrap",background:"var(--surface-2)"}}>

        {/* Title */}
        <div style={{flex:1,minWidth:140}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:"var(--text)",margin:0,lineHeight:1.2}}>Calendar</h2>
          <p style={{fontSize:10,color:"var(--text-dim)",marginTop:1,fontFamily:"monospace",letterSpacing:".03em"}}>{fmtWeekHead(monday)}</p>
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <LegendItem color="#22c55e" label="Working Hours" stripe/>
          <LegendItem color="var(--orange)" label="Booking"/>
        </div>

        {/* Nav */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <TBtn onClick={()=>{setMonday(mondayOf(todayISO()));}}>Today</TBtn>
          <IBtn onClick={()=>setMonday(m=>addDays(m,-7))} title="Previous week">‹</IBtn>
          <IBtn onClick={()=>setMonday(m=>addDays(m,+7))} title="Next week">›</IBtn>
        </div>

        {/* Working Hours button */}
        <button
          onClick={()=>setModal({type:"create",date:todayISO(),start_time:"09:00",end_time:"17:00",defMode:"hours"})}
          style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s",
            background:"rgba(34,197,94,.08)",color:"#4ade80",border:"1px solid rgba(34,197,94,.2)"}}>
          🕐 Hours
        </button>

        {/* Booking button */}
        <button
          onClick={()=>setModal({type:"create",date:todayISO(),start_time:"09:00",end_time:"10:00",defMode:"booking"})}
          style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s",
            background:"var(--orange)",color:"#fff",border:"none",boxShadow:"0 0 14px rgba(255,122,0,.3)"}}>
          + Booking
        </button>
      </div>

      {/* ── Day headers (sync-scroll with grid) ────────────────────────── */}
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",flexShrink:0,background:"var(--surface-2)"}}>
        {/* Time col spacer */}
        <div style={{width:TIME_COL,flexShrink:0,borderRight:"1px solid var(--border)"}}/>
        {/* Scrollable headers */}
        <div style={{flex:1,display:"flex",overflowX:"hidden"}} id="cal-header-scroll">
          {days.map((dayISO,i)=>{
            const d=new Date(dayISO+"T00:00:00");
            const isToday=dayISO===todayISO();
            const isPast=isPastDate(dayISO);
            const weekend=i>=5;
            const bkDots=(byDate[dayISO]||[]).filter(e=>e._type==="appointment");
            const hasH=(byDate[dayISO]||[]).some(e=>e._type==="availability");
            return (
              <div key={dayISO}
                style={{minWidth:DAY_MIN_W,flex:1,padding:"8px 0 6px",textAlign:"center",
                  borderLeft:i>0?"1px solid var(--border)":"none",
                  background:isToday?"rgba(255,122,0,.035)":isPast?"rgba(0,0,0,.12)":"transparent",
                  transition:"background .15s"}}>
                <div style={{fontSize:10,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",marginBottom:3,
                  color:isToday?"var(--orange)":isPast?"var(--text-dim)":weekend?"#666":"var(--text-muted)"}}>
                  {DAY_NAMES[i]}
                </div>
                <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:30,height:30,borderRadius:"50%",fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:800,
                  background:isToday?"var(--orange)":"transparent",
                  boxShadow:isToday?"0 0 16px rgba(255,122,0,.5)":"none",
                  color:isToday?"#fff":isPast?"var(--text-dim)":weekend?"#555":"var(--text)"}}>
                  {d.getDate()}
                </div>
                <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3,height:5}}>
                  {hasH&&<span style={{width:12,height:3,borderRadius:2,background:"#22c55e44",border:"1px solid #22c55e33"}}/>}
                  {bkDots.slice(0,4).map((ev,k)=><span key={k} style={{width:4,height:4,borderRadius:"50%",background:bkColor(ev).base,opacity:isPast?.4:1}}/>)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────── */}
      <div ref={gridScrollRef} style={{flex:1,minHeight:0,overflowY:"auto",overflowX:"hidden",position:"relative"}}
        onScroll={e=>{
          // Sync header scroll
          const h=document.getElementById("cal-header-scroll");
          if (h) h.scrollLeft=e.currentTarget.querySelector("#cal-grid-inner")?.scrollLeft||0;
        }}>

        {loading?(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,gap:12,color:"var(--text-dim)"}}>
            <Spin/><span style={{fontSize:13}}>Loading calendar…</span>
          </div>
        ):(
          <div id="cal-grid-inner" style={{display:"flex",minHeight:GRID_H}} onWheel={onHWheel}>

            {/* ── Sticky time column ───────────────────────────────────── */}
            <div style={{width:TIME_COL,flexShrink:0,borderRight:"1px solid var(--border)",position:"sticky",left:0,background:"var(--surface)",zIndex:30}}>
              {Array.from({length:HOURS},(_,i)=>(
                <div key={i} style={{position:"absolute",top:i*CELL_H-8,left:0,right:0,padding:"0 8px",display:"flex",justifyContent:"flex-end",pointerEvents:"none"}}>
                  <span style={{fontSize:9,color:"var(--text-dim)",fontFamily:"monospace",lineHeight:1,opacity:.8}}>{pad(HOUR_START+i)}:00</span>
                </div>
              ))}
            </div>

            {/* ── Day columns ──────────────────────────────────────────── */}
            {days.map((dayISO,colIdx)=>{
              const dayEvs  = byDate[dayISO]||[];
              const rawHrs  = dayEvs.filter(e=>e._type==="availability"||e.status==="available");
              const workHrs = mergeHours(rawHrs);
              const bookings= dayEvs.filter(e=>e._type==="appointment");
              const isToday = dayISO===todayISO();
              const isPast  = isPastDate(dayISO);

              return (
                <div key={dayISO}
                  ref={el=>colRefs.current[dayISO]=el}
                  onClick={e=>onCellClick(e,dayISO)}
                  style={{minWidth:DAY_MIN_W,flex:1,position:"relative",height:GRID_H,
                    borderLeft:colIdx>0?"1px solid var(--border)":"none",
                    background:isToday?"rgba(255,122,0,.012)":isPast?"rgba(0,0,0,.06)":"transparent",
                    cursor:isPast?"not-allowed":"crosshair",
                    opacity:isPast?.8:1,
                  }}>

                  {/* Grid lines */}
                  {Array.from({length:HOURS},(_,i)=>(
                    <div key={i} style={{position:"absolute",top:i*CELL_H,left:0,right:0,
                      borderTop:i===0?"none":"1px solid rgba(255,255,255,.04)",pointerEvents:"none"}}>
                      <div style={{position:"absolute",top:CELL_H/2,left:"6%",right:0,
                        borderTop:"1px dashed rgba(255,255,255,.02)",pointerEvents:"none"}}/>
                    </div>
                  ))}

                  {/* Past time overlay — subtle diagonal stripe */}
                  {(isToday||isPast)&&(()=>{
                    const cutoffPx=isToday?toPx(nowTime):GRID_H;
                    if (cutoffPx<=0) return null;
                    return (
                      <div style={{position:"absolute",top:0,left:0,right:0,height:cutoffPx,
                        background:"repeating-linear-gradient(45deg,rgba(0,0,0,.08) 0,rgba(0,0,0,.08) 2px,transparent 2px,transparent 10px)",
                        pointerEvents:"none",zIndex:1}}/>
                    );
                  })()}

                  {/* Working hours — background lane layer (z:3) */}
                  {workHrs.map((ev,idx)=>{
                    const top=toPx(ev.start_time), h=durPx(ev.start_time,ev.end_time);
                    const isGhost=ghost&&(ghost._real_id===ev._real_id||String(ghost.id)===String(ev.id))&&ghost.date===dayISO;
                    return (
                      <div key={ev.id||`wh${idx}`}
                        onPointerDown={e=>startDrag(e,ev,"move")}
                        style={{position:"absolute",top,left:0,right:0,height:h,zIndex:3,
                          background:"rgba(34,197,94,.07)",
                          borderTop:"1.5px solid rgba(34,197,94,.28)",
                          borderBottom:"1px solid rgba(34,197,94,.08)",
                          borderLeft:"3px solid rgba(34,197,94,.45)",
                          cursor:"grab",userSelect:"none",
                          opacity:isGhost?.25:1,
                          transition:"opacity .1s",
                          overflow:"hidden",display:"flex",alignItems:"flex-start",padding:"3px 8px",
                        }}>
                        <span onClick={e=>{e.stopPropagation();setModal({type:"edit",event:ev});}}
                          style={{fontSize:9,fontWeight:700,color:"rgba(74,222,128,.6)",textTransform:"uppercase",
                            letterSpacing:".08em",fontFamily:"monospace",cursor:"pointer",
                            padding:"1px 5px",borderRadius:3,background:"rgba(34,197,94,.08)",lineHeight:1.5,
                            transition:"background .12s"}}
                          onMouseEnter={e=>e.target.style.background="rgba(34,197,94,.16)"}
                          onMouseLeave={e=>e.target.style.background="rgba(34,197,94,.08)"}>
                          ✏ Working Hours
                        </span>
                        {/* Resize handle */}
                        <div onPointerDown={e=>{e.stopPropagation();startDrag(e,ev,"resize");}}
                          style={{position:"absolute",bottom:0,left:0,right:0,height:8,cursor:"ns-resize",
                            display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:22,height:2,borderRadius:2,background:"rgba(34,197,94,.35)"}}/>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bookings — foreground cards (z:10) */}
                  {bookings.map((ev,idx)=>{
                    const c=bkColor(ev);
                    const top=toPx(ev.start_time), h=durPx(ev.start_time,ev.end_time);
                    const short=h<38;
                    const isGhost=ghost&&String(ghost.id)===String(ev.id)&&ghost.date===dayISO;
                    return (
                      <div key={ev.id||`bk${idx}`}
                        onPointerDown={e=>startDrag(e,ev,"move")}
                        onClick={e=>{e.stopPropagation();setModal({type:"edit",event:ev});}}
                        style={{position:"absolute",top:top+1,left:3,right:3,height:h-2,
                          borderRadius:9,background:c.bg,
                          border:`1.5px solid ${c.border}`,borderLeft:`3px solid ${c.base}`,
                          padding:short?"3px 8px":"6px 10px",
                          cursor:"grab",overflow:"hidden",zIndex:10,userSelect:"none",
                          boxShadow:`0 2px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)`,
                          opacity:isGhost?.28:1,
                          transition:"opacity .1s,box-shadow .15s",
                        }}
                        onMouseEnter={e=>{if(!dragRef.current){e.currentTarget.style.boxShadow=`0 6px 24px rgba(0,0,0,.4),0 0 16px ${c.glow},inset 0 1px 0 rgba(255,255,255,.07)`;e.currentTarget.style.zIndex=20;}}}
                        onMouseLeave={e=>{e.currentTarget.style.boxShadow=`0 2px 10px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)`;e.currentTarget.style.zIndex=10;}}>
                        <div style={{fontSize:short?10:11,fontWeight:700,color:c.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.35,pointerEvents:"none"}}>
                          {ev.service_name||ev.client_name||"Booking"}
                        </div>
                        {!short&&<div style={{fontSize:9,color:c.text,opacity:.7,marginTop:2,fontFamily:"monospace",pointerEvents:"none"}}>
                          {fmt12(ev.start_time)}–{fmt12(ev.end_time)}
                          {ev.client_name&&ev.client_name!=="Client"?` · ${ev.client_name}`:""}
                        </div>}
                        {/* Resize handle */}
                        <div onPointerDown={e=>{e.stopPropagation();startDrag(e,ev,"resize");}}
                          style={{position:"absolute",bottom:0,left:0,right:0,height:8,cursor:"ns-resize",
                            display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <div style={{width:26,height:2,borderRadius:2,background:hexRgba(c.base,.45)}}/>
                        </div>
                      </div>
                    );
                  })}

                  {/* Drag ghost — in-column dashed preview */}
                  {ghost&&ghost.date===dayISO&&(()=>{
                    const isWH=ghost._type==="availability";
                    const c=isWH?{base:"#22c55e",bg:"rgba(34,197,94,.2)",border:"rgba(34,197,94,.65)",text:"#4ade80"}:bkColor(ghost);
                    const gh=durPx(ghost.start_time,ghost.end_time);
                    return (
                      <div style={{position:"absolute",top:toPx(ghost.start_time)+1,left:3,right:3,height:gh-2,
                        borderRadius:9,background:c.bg,border:`2px dashed ${c.border}`,
                        zIndex:50,pointerEvents:"none",
                        boxShadow:`0 8px 32px rgba(0,0,0,.45),0 0 16px ${hexRgba(c.base,.3)}`,
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
                        backdropFilter:"blur(2px)",
                      }}>
                        <span style={{fontSize:11,fontWeight:800,color:c.text}}>{isWH?"Working Hours":(ghost.service_name||ghost.client_name||"Booking")}</span>
                        <span style={{fontSize:9,opacity:.75,fontFamily:"monospace",color:c.text}}>{fmt12(ghost.start_time)}–{fmt12(ghost.end_time)}</span>
                      </div>
                    );
                  })()}

                  {/* Now indicator */}
                  {isToday&&(()=>{
                    const t=toPx(nowTime); if (t<0||t>GRID_H) return null;
                    return (
                      <div style={{position:"absolute",top:t,left:0,right:0,zIndex:25,pointerEvents:"none"}}>
                        <div style={{position:"absolute",left:-4,top:-4,width:8,height:8,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 8px #ef4444"}}/>
                        <div style={{height:2,background:"linear-gradient(to right,#ef4444 55%,transparent)",opacity:.9}}/>
                      </div>
                    );
                  })()}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty state */}
      {!loading&&events.length===0&&(
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:40,pointerEvents:"none",
          textAlign:"center",background:"var(--surface)",border:"1px solid var(--border-light)",borderRadius:16,
          padding:"28px 32px",maxWidth:300,boxShadow:"0 16px 60px rgba(0,0,0,.55)"}}>
          <div style={{fontSize:36,marginBottom:12}}>📅</div>
          <p style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:14,color:"var(--text)",margin:"0 0 8px"}}>Calendar is empty</p>
          <p style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.75,margin:0}}>
            Click any slot to add a booking.<br/>
            Use <span style={{color:"#4ade80",fontWeight:700}}>🕐 Hours</span> to mark your working hours.
          </p>
        </div>
      )}

      {/* Modals */}
      {modal?.type==="create"&&<CreateModal initial={modal} services={services} onSave={onCreate} onClose={()=>setModal(null)}/>}
      {modal?.type==="edit"&&<EditModal event={modal.event} services={services} onSave={onUpdate} onDelete={onDelete} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({initial,services,onSave,onClose}) {
  const [mode,setMode]=useState(initial.defMode||"booking");
  const [form,setForm]=useState({date:initial.date||"",start_time:initial.start_time||"09:00",end_time:initial.end_time||"10:00",client_name:"",phone:"",service_id:services[0]?.id||""});
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  useEsc(onClose);
  const sf=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  function onSvc(e) {
    const sid=e.target.value, svc=services.find(s=>String(s.id)===String(sid));
    setForm(f=>({...f,service_id:sid,end_time:svc&&f.start_time?addM(f.start_time,svc.duration):f.end_time}));
  }
  async function submit(e) {
    e.preventDefault(); setError("");
    if (!form.date){setError("Date is required.");return;}
    if (form.start_time>=form.end_time){setError("End time must be after start time.");return;}
    if (isPastDate(form.date)){setError("Cannot create events in the past.");return;}
    if (isPastSlot(form.date,form.end_time)){setError("This time slot has already passed.");return;}
    setSaving(true);
    const err=await onSave({...form,status:mode==="hours"?"available":"booked",...(mode==="hours"?{}:{service_id:form.service_id,client_name:form.client_name,phone:form.phone})});
    setSaving(false); if (err) setError(err);
  }
  const noSvc=mode==="booking"&&services.length===0;
  return (
    <Modal onClose={onClose}>
      <ModeTabs mode={mode} onChange={v=>{setMode(v);setError("");}}/>
      <ModeHint mode={mode}/>
      {error&&<Err>{error}</Err>}
      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:11}}>
        <Fld label="Date"><input type="date" className="input" value={form.date} onChange={sf("date")} min={todayISO()} required/></Fld>
        <div style={{display:"flex",gap:8}}>
          <Fld label="Start" s={{flex:1}}><input type="time" className="input" value={form.start_time} onChange={sf("start_time")} required/></Fld>
          <Fld label="End"   s={{flex:1}}><input type="time" className="input" value={form.end_time}   onChange={sf("end_time")}   required/></Fld>
        </div>
        {mode==="booking"&&(noSvc?<NoSvc/>:<>
          <Fld label="Service"><select className="input" value={form.service_id} onChange={onSvc}>
            <option value="">Select service…</option>
            {services.map(s=><option key={s.id} value={s.id}>{s.name} · ${parseFloat(s.price||0).toFixed(2)} · {s.duration}min</option>)}
          </select></Fld>
          <Fld label={<>Client <Opt/></>}><input type="text" className="input" value={form.client_name} onChange={sf("client_name")} placeholder="e.g. John Smith"/></Fld>
          <Fld label={<>Phone <Opt/></>}><input type="tel" className="input" value={form.phone} onChange={sf("phone")} placeholder="+1 234 567 890"/></Fld>
        </>)}
        <MActions saving={saving} disabled={noSvc} onCancel={onClose}
          label={mode==="hours"?"Add Working Hours":"Create Booking"}
          bg={mode==="hours"?"#22c55e":"var(--orange)"} fg={mode==="hours"?"#0b1a12":"#fff"}/>
      </form>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({event,services,onSave,onDelete,onClose}) {
  const isWH=event._type==="availability"||event.status==="available";
  const [form,setForm]=useState({date:event.date,start_time:event.start_time,end_time:event.end_time,service_id:event.service_id||(services[0]?.id||""),client_name:event.client_name||"",phone:event.phone||""});
  const [saving,setSaving]=useState(false);
  const [delConf,setDelConf]=useState(false);
  const [error,setError]=useState("");
  useEsc(onClose);
  const sf=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  function onSvc(e) { const sid=e.target.value,svc=services.find(s=>String(s.id)===String(sid)); setForm(f=>({...f,service_id:sid,end_time:svc&&f.start_time?addM(f.start_time,svc.duration):f.end_time})); }
  async function submit(e) {
    e.preventDefault(); setError("");
    if (form.start_time>=form.end_time){setError("End time must be after start time.");return;}
    setSaving(true);
    const err=await onSave({...event,...form});
    setSaving(false); if (err) setError(err);
  }
  const svc=services.find(s=>String(s.id)===String(event.service_id));
  const c=isWH?{base:"#22c55e"}:bkColor(event);
  return (
    <Modal onClose={onClose}>
      <div style={{height:3,background:c.base,borderRadius:"10px 10px 0 0",margin:"-20px -20px 14px"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <h3 style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:"var(--text)",margin:0}}>
          {isWH?"✏️ Edit Working Hours":`✏️ ${svc?.name||"Edit Booking"}`}
        </h3>
        <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:8,textTransform:"uppercase",letterSpacing:".07em",
          background:isWH?"rgba(34,197,94,.1)":"rgba(255,122,0,.1)",
          color:isWH?"#4ade80":"var(--orange)",
          border:`1px solid ${isWH?"rgba(34,197,94,.25)":"rgba(255,122,0,.25)"}`}}>
          {isWH?"Open":"Booked"}
        </span>
      </div>
      {error&&<Err>{error}</Err>}
      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:11}}>
        <Fld label="Date"><input type="date" className="input" value={form.date} onChange={sf("date")} required/></Fld>
        <div style={{display:"flex",gap:8}}>
          <Fld label="Start" s={{flex:1}}><input type="time" className="input" value={form.start_time} onChange={sf("start_time")} required/></Fld>
          <Fld label="End"   s={{flex:1}}><input type="time" className="input" value={form.end_time}   onChange={sf("end_time")}   required/></Fld>
        </div>
        {!isWH&&services.length>0&&<>
          <Fld label="Service"><select className="input" value={form.service_id} onChange={onSvc}>
            <option value="">Select service…</option>
            {services.map(s=><option key={s.id} value={s.id}>{s.name} · ${parseFloat(s.price||0).toFixed(2)} · {s.duration}min</option>)}
          </select></Fld>
          <Fld label={<>Client <Opt/></>}><input type="text" className="input" value={form.client_name} onChange={sf("client_name")} placeholder="e.g. John Smith"/></Fld>
          <Fld label={<>Phone <Opt/></>}><input type="tel" className="input" value={form.phone} onChange={sf("phone")} placeholder="+1 234 567 890"/></Fld>
        </>}
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button type="submit" disabled={saving} style={{flex:2,padding:"10px 0",borderRadius:8,border:"none",background:isWH?"#22c55e":"var(--orange)",color:isWH?"#0b1a12":"#fff",fontWeight:700,fontSize:13,cursor:"pointer",opacity:saving?.5:1,boxShadow:saving?"none":isWH?"0 0 12px rgba(34,197,94,.3)":"0 0 12px rgba(255,122,0,.3)",transition:"all .15s"}}>
            {saving?"Saving…":"Save changes"}
          </button>
          {!delConf&&<button type="button" onClick={()=>setDelConf(true)} style={{flex:1,padding:"10px 0",borderRadius:8,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.07)",color:"#f87171",fontWeight:700,fontSize:13,cursor:"pointer",transition:"all .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,.14)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(239,68,68,.07)"}>🗑</button>}
          {delConf&&<button type="button" onClick={()=>onDelete(event)} style={{flex:1,padding:"10px 0",borderRadius:8,border:"none",background:"#ef4444",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Confirm</button>}
          <button type="button" onClick={delConf?()=>setDelConf(false):onClose} style={{flex:1,padding:"10px 0",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",fontWeight:600,fontSize:13,cursor:"pointer"}}>
            {delConf?"Cancel":"Close"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Tiny shared components ────────────────────────────────────────────────
function Modal({children,onClose}) {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.72)",backdropFilter:"blur(6px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border-light)",borderRadius:14,padding:20,width:"100%",maxWidth:400,boxShadow:"0 32px 80px rgba(0,0,0,.7)",animation:"fadeUp .18s ease both"}}>
        {children}
      </div>
    </div>
  );
}
function ModeTabs({mode,onChange}) {
  return (
    <div style={{display:"flex",gap:0,marginBottom:13,background:"#0e0e0e",borderRadius:9,padding:3,border:"1px solid var(--border)"}}>
      {[["hours","🕐","Working Hours","#22c55e"],["booking","📋","Booking","var(--orange)"]].map(([v,ico,lbl,col])=>(
        <button key={v} type="button" onClick={()=>onChange(v)}
          style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all .12s",
            background:mode===v?(v==="hours"?"rgba(34,197,94,.12)":"rgba(255,122,0,.12)"):"transparent",
            color:mode===v?col:"var(--text-dim)",boxShadow:mode===v?`0 0 0 1px ${col}33`:"none"}}>
          {ico} {lbl}
        </button>
      ))}
    </div>
  );
}
function ModeHint({mode}) {
  return (
    <div style={{padding:"8px 11px",borderRadius:7,marginBottom:13,fontSize:11,lineHeight:1.65,
      background:mode==="hours"?"rgba(34,197,94,.055)":"rgba(255,122,0,.055)",
      border:`1px solid ${mode==="hours"?"rgba(34,197,94,.14)":"rgba(255,122,0,.14)"}`,
      color:mode==="hours"?"rgba(74,222,128,.8)":"rgba(255,154,60,.8)"}}>
      {mode==="hours"
        ?"🟢 Your working hours — shown as a green background. Clients can book within these times."
        :"🟠 A specific booking — blocks this time for a client or appointment."}
    </div>
  );
}
function MActions({saving,disabled,onCancel,label,bg,fg}) {
  return (
    <div style={{display:"flex",gap:8,marginTop:4}}>
      <button type="submit" disabled={saving||disabled} style={{flex:1,padding:"11px 0",borderRadius:8,border:"none",background:bg,color:fg||"#fff",fontWeight:700,fontSize:13,cursor:(saving||disabled)?"not-allowed":"pointer",opacity:(saving||disabled)?.5:1,transition:"all .15s",boxShadow:(!saving&&!disabled)?`0 0 14px rgba(0,0,0,.25)`:"none"}}>
        {saving?"Saving…":label}
      </button>
      <button type="button" onClick={onCancel} style={{padding:"11px 16px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>
    </div>
  );
}
function LegendItem({color,label,stripe}) {
  return (
    <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"var(--text-dim)"}}>
      <span style={{width:stripe?14:9,height:stripe?4:9,borderRadius:stripe?2:"50%",background:stripe?`${color}44`:color,border:`1.5px solid ${color}88`,display:"inline-block"}}/>
      {label}
    </span>
  );
}
function Fld({label,children,s}) { return <div style={s}><label style={{display:"block",fontSize:10,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>{label}</label>{children}</div>; }
function Err({children}) { return <div style={{padding:"8px 11px",borderRadius:7,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#f87171",fontSize:12,marginBottom:11}}>{children}</div>; }
function NoSvc() { return <div style={{padding:"11px 12px",borderRadius:8,background:"rgba(255,122,0,.07)",border:"1px solid rgba(255,122,0,.2)",fontSize:12,color:"var(--orange)",lineHeight:1.65}}>⚠️ No services yet. Go to the <strong>Services</strong> tab to add one first.</div>; }
function Opt() { return <span style={{color:"var(--text-dim)",fontWeight:400,textTransform:"none"}}>(optional)</span>; }
function TBtn({onClick,children}) { return <button onClick={onClick} style={{padding:"5px 11px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--orange)";e.currentTarget.style.color="var(--orange)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text-muted)";;}}>{children}</button>; }
function IBtn({onClick,children,title}) { return <button onClick={onClick} title={title} style={{width:28,height:28,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--text-muted)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .12s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--orange)";e.currentTarget.style.color="var(--orange)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text-muted)";}}>{children}</button>; }
function Spin() { return <div style={{width:18,height:18,border:"2px solid rgba(255,122,0,.15)",borderTopColor:"var(--orange)",borderRadius:"50%",animation:"spin .65s linear infinite"}}/>; }
function useEsc(fn) { useEffect(()=>{ const h=e=>{if(e.key==="Escape")fn();}; window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h); },[fn]); }
