/**
 * CalendarView.js — Redesigned calendar
 *
 * Layout: collapsible left sidebar (mini month + nav) + main grid
 * Grid: time column (sticky) + 7 day columns with scrollable hour rows
 * Same functionality: drag/move, drag/resize, create, edit, delete,
 *   working-hours merge, past-date prevention, current-time line,
 *   week/day toggle, auto-center today.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const HOUR_START = 7;
const HOUR_END   = 21;
const HOURS      = HOUR_END - HOUR_START;
const CELL_H     = 56;
const GRID_H     = HOURS * CELL_H;
const SNAP       = 15;
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const MONTHS     = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_S   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PAL        = ["#ff7a00","#8b5cf6","#3b82f6","#ec4899","#10b981","#f59e0b","#6366f1","#ef4444"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
function durPx(s,e) { return Math.max(20,Math.max(SNAP,(toMin(e)-toMin(s)))/60*CELL_H); }
function snapM(m)   { return Math.round(m/SNAP)*SNAP; }
function pxToMin(y) { return snapM((y/CELL_H)*60+HOUR_START*60); }
function clampM(m)  { return Math.max(HOUR_START*60,Math.min((HOUR_END-1)*60,m)); }
function fmt12(t)   { if(!t)return""; const[h,m]=t.split(":").map(Number); return`${h%12||12}:${pad(m)} ${h<12?"AM":"PM"}`; }
function addM(t,m)  { const tot=toMin(t)+m; return toStr(Math.min(HOUR_END*60,tot)); }
function hexRgba(hex,a){ try{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`;}catch{return`rgba(255,122,0,${a})`;} }
function isPastDate(iso){ return iso<todayISO(); }
function isPastSlot(iso,t){ return iso<todayISO()||(iso===todayISO()&&t<=nowStr()); }

function bkColor(ev) {
  const base=ev.service_color||PAL[(Number(ev.id)||0)%PAL.length];
  return {base,bg:hexRgba(base,0.13),border:hexRgba(base,0.5),text:base};
}

function mergeHours(slots) {
  if(!slots.length)return[];
  const s=[...slots].sort((a,b)=>toMin(a.start_time)-toMin(b.start_time));
  const out=[{...s[0]}];
  for(let i=1;i<s.length;i++){
    const last=out[out.length-1],cur=s[i];
    if(toMin(cur.start_time)<=toMin(last.end_time)){
      if(toMin(cur.end_time)>toMin(last.end_time))last.end_time=cur.end_time;
    } else out.push({...cur});
  }
  return out;
}

// ─── Mini month calendar ──────────────────────────────────────────────────────
function MiniMonth({ focusDate, onDayClick }) {
  const [month, setMonth] = useState(() => {
    const d=new Date(); return { y:d.getFullYear(), m:d.getMonth() };
  });

  const firstDay = new Date(month.y, month.m, 1);
  const startDow = (firstDay.getDay()+6)%7; // Mon=0
  const daysInMonth = new Date(month.y, month.m+1, 0).getDate();
  const prevDays = new Date(month.y, month.m, 0).getDate();

  const cells = [];
  for(let i=0;i<startDow;i++) cells.push({day:prevDays-startDow+1+i,cur:false});
  for(let i=1;i<=daysInMonth;i++) cells.push({day:i,cur:true});
  while(cells.length%7!==0) cells.push({day:cells.length-daysInMonth-startDow+1,cur:false});

  const todayD = new Date();
  const todayM = todayD.getMonth();
  const todayY = todayD.getFullYear();
  const todayDay = todayD.getDate();

  return (
    <div style={{padding:"0 12px 12px"}}>
      {/* Month nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <button onClick={()=>setMonth(p=>{ const d=new Date(p.y,p.m-1,1);return{y:d.getFullYear(),m:d.getMonth()}; })}
          style={{width:22,height:22,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",borderRadius:5,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"var(--color-text-secondary)"}}>‹</button>
        <span style={{fontSize:11,fontWeight:500,color:"var(--color-text-primary)"}}>{MONTHS_S[month.m]} {month.y}</span>
        <button onClick={()=>setMonth(p=>{ const d=new Date(p.y,p.m+1,1);return{y:d.getFullYear(),m:d.getMonth()}; })}
          style={{width:22,height:22,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",borderRadius:5,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"var(--color-text-secondary)"}}>›</button>
      </div>
      {/* Day headers */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:2}}>
        {["M","T","W","T","F","S","S"].map((d,i)=>(
          <div key={i} style={{textAlign:"center",fontSize:9,color:"var(--color-text-tertiary)",fontWeight:500,padding:"2px 0"}}>{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:1}}>
        {cells.map((c,i)=>{
          const isToday=c.cur&&c.day===todayDay&&month.m===todayM&&month.y===todayY;
          const iso=c.cur?`${month.y}-${pad(month.m+1)}-${pad(c.day)}`:null;
          return (
            <div key={i} onClick={()=>iso&&onDayClick(iso)}
              style={{
                width:"100%",aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:10,borderRadius:4,cursor:c.cur?"pointer":"default",
                background:isToday?"#ff7a00":"transparent",
                color:isToday?"#fff":c.cur?"var(--color-text-secondary)":"var(--color-text-tertiary)",
                fontWeight:isToday?500:400,
                transition:"background 0.1s",
              }}
              onMouseEnter={e=>{ if(!isToday&&c.cur) e.currentTarget.style.background="var(--color-background-secondary)"; }}
              onMouseLeave={e=>{ if(!isToday) e.currentTarget.style.background="transparent"; }}>
              {c.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CalendarView() {
  const [monday,   setMonday]   = useState(()=>mondayOf(todayISO()));
  const [events,   setEvents]   = useState([]);
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [nowTime,  setNowTime]  = useState(nowStr);
  const [viewMode, setViewMode] = useState("week");
  const [dayFocus, setDayFocus] = useState(todayISO());
  const [toast,    setToast]    = useState(null);
  const [ghost,    setGhost]    = useState(null);
  const [sidebar,  setSidebar]  = useState(true);

  const scrollRef = useRef(null);
  const colRefs   = useRef({});
  const dragRef   = useRef(null);
  const loadRef   = useRef(null);

  const days = useMemo(()=>Array.from({length:7},(_,i)=>addDays(monday,i)),[monday]);
  const viewDays = viewMode==="day"?[dayFocus]:days;

  useEffect(()=>{ const id=setInterval(()=>setNowTime(nowStr()),30000); return()=>clearInterval(id); },[]);
  useEffect(()=>{ fetch("/api/services").then(r=>r.ok?r.json():[]).then(d=>setServices(Array.isArray(d)?d:[])).catch(()=>{}); },[]);

  const loadWeek=useCallback(async(mon,silent=false)=>{
    if(!silent)setLoading(true);
    try{const r=await fetch(`/api/calendar?week=${mon}`);if(r.ok){const d=await r.json();setEvents(Array.isArray(d.events)?d.events:[]);}}
    catch{}finally{if(!silent)setLoading(false);}
  },[]);

  useEffect(()=>{ loadRef.current=()=>loadWeek(monday,true); },[loadWeek,monday]);
  useEffect(()=>{ loadWeek(monday); },[monday,loadWeek]);

  // Scroll to ~9am on load
  useEffect(()=>{
    if(!loading&&scrollRef.current){
      scrollRef.current.scrollTop=Math.max(0,toPx("08:30")-40);
    }
  },[loading]);

  function toast_(msg,ok=true){ setToast({msg,ok}); setTimeout(()=>setToast(null),3000); }

  const byDate=useMemo(()=>{
    const m={};
    for(const ev of events){if(!m[ev.date])m[ev.date]=[];m[ev.date].push(ev);}
    return m;
  },[events]);

  // ── Drag ──────────────────────────────────────────────────────────────────
  function startDrag(e,ev,mode){
    if(e.button!==0)return; e.preventDefault(); e.stopPropagation();
    dragRef.current={ev,mode,startY:e.clientY,startX:e.clientX,origStart:toMin(ev.start_time),origEnd:toMin(ev.end_time),origDate:ev.date,curDate:ev.date};
    setGhost({...ev,_dragging:true});
    window.addEventListener("pointermove",onDragMove,{passive:false});
    window.addEventListener("pointerup",onDragEnd);
  }

  const onDragMove=useCallback((e)=>{
    const ds=dragRef.current; if(!ds)return;
    const dy=e.clientY-ds.startY;
    const delta=snapM((dy/CELL_H)*60);
    if(ds.mode==="resize"){
      const newEnd=clampM(ds.origEnd+delta);
      if(newEnd<=ds.origStart+SNAP)return;
      setGhost(g=>g?{...g,start_time:ds.ev.start_time,end_time:toStr(newEnd),date:ds.curDate}:null);
      return;
    }
    const newStart=clampM(ds.origStart+delta);
    const dur=ds.origEnd-ds.origStart;
    const newEnd=Math.min(HOUR_END*60,newStart+dur);
    let hovered=ds.origDate;
    for(const[dayISO,el] of Object.entries(colRefs.current)){
      if(!el)continue;
      const r=el.getBoundingClientRect();
      if(e.clientX>=r.left&&e.clientX<=r.right){hovered=dayISO;break;}
    }
    if(!isPastDate(hovered)){
      ds.curDate=hovered;
      setGhost(g=>g?{...g,start_time:toStr(newStart),end_time:toStr(newEnd),date:hovered}:null);
    }
  },[]);

  const onDragEnd=useCallback(async()=>{
    window.removeEventListener("pointermove",onDragMove);
    window.removeEventListener("pointerup",onDragEnd);
    const ds=dragRef.current; dragRef.current=null;
    if(!ds||!ghost){setGhost(null);return;}
    const{ev}=ds; const ng=ghost;
    if(ng.date===ev.date&&ng.start_time===ev.start_time&&ng.end_time===ev.end_time){setGhost(null);return;}
    if(isPastDate(ng.date)||isPastSlot(ng.date,ng.end_time)){toast_("Cannot move to the past.",false);setGhost(null);return;}
    setEvents(prev=>prev.map(e=>String(e.id)===String(ev.id)?{...e,date:ng.date,start_time:ng.start_time,end_time:ng.end_time}:e));
    setGhost(null);
    const type=ev._type==="availability"?"availability":"appointment";
    const realId=ev._real_id||ev.id;
    try{
      const r=await fetch("/api/calendar",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:realId,type,date:ng.date,start_time:ng.start_time,end_time:ng.end_time})});
      if(!r.ok){const d=await r.json();toast_(d.error||"Move failed.",false);loadRef.current?.();}
    }catch{toast_("Network error.",false);loadRef.current?.();}
  },[ghost,onDragMove]);

  async function onCreate(payload){
    if(isPastDate(payload.date))return"Cannot create events in the past.";
    if(isPastSlot(payload.date,payload.end_time))return"This time slot has already passed.";
    try{
      const r=await fetch("/api/calendar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const d=await r.json();
      if(r.ok){await loadWeek(monday,true);setModal(null);toast_(payload.status==="available"?"Working hours added":"Booking created");return null;}
      return d.error||"Save failed.";
    }catch{return"Network error.";}
  }

  async function onUpdate(payload){
    const type=payload._type==="availability"?"availability":"appointment";
    const realId=payload._real_id||payload.id;
    try{
      const r=await fetch("/api/calendar",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,id:realId,type})});
      const d=await r.json();
      if(r.ok){await loadWeek(monday,true);setModal(null);toast_("Saved");return null;}
      return d.error||"Update failed.";
    }catch{return"Network error.";}
  }

  async function onDelete(ev){
    const type=ev._type==="availability"?"availability":"appointment";
    const realId=ev._real_id||ev.id;
    try{
      const r=await fetch(`/api/calendar?id=${realId}&type=${type}`,{method:"DELETE"});
      if(r.ok){await loadWeek(monday,true);setModal(null);toast_("Deleted");}
      else{const d=await r.json();toast_(d.error||"Delete failed.",false);}
    }catch{toast_("Network error.",false);}
  }

  function onCellClick(e,dayISO){
    if(e.target!==e.currentTarget)return;
    if(isPastDate(dayISO))return;
    const y=e.clientY-e.currentTarget.getBoundingClientRect().top;
    const start=toStr(clampM(pxToMin(y)));
    if(isPastSlot(dayISO,start))return;
    setModal({type:"create",date:dayISO,start_time:start,end_time:addM(start,60),defMode:services.length>0?"booking":"hours"});
  }

  function onMiniDayClick(iso){
    setDayFocus(iso);
    setMonday(mondayOf(iso));
    setViewMode("day");
  }

  const hourLabels = Array.from({length:HOURS},(_,i)=>`${pad(HOUR_START+i)}:00`);

  return (
    <div style={{display:"flex",height:"100%",minHeight:0,background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",overflow:"hidden",fontFamily:"var(--font-sans)"}}>

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,padding:"10px 18px",borderRadius:"var(--border-radius-md)",fontSize:13,fontWeight:500,
          background:toast.ok?"var(--color-background-success)":"var(--color-background-danger)",
          color:toast.ok?"var(--color-text-success)":"var(--color-text-danger)",
          border:`0.5px solid ${toast.ok?"var(--color-border-success)":"var(--color-border-danger)"}`,
          boxShadow:"0 4px 24px rgba(0,0,0,0.12)"}}>
          {toast.msg}
        </div>
      )}

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
      {sidebar&&(
        <div style={{width:188,flexShrink:0,borderRight:"0.5px solid var(--color-border-tertiary)",display:"flex",flexDirection:"column",background:"var(--color-background-primary)"}}>

          {/* Sidebar header */}
          <div style={{padding:"14px 12px 8px",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{width:24,height:24,borderRadius:6,background:"#ff7a00",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/></svg>
              </div>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>Calendar</span>
            </div>
            <MiniMonth focusDate={dayFocus} onDayClick={onMiniDayClick}/>
          </div>

          {/* Quick create buttons */}
          <div style={{padding:"10px 12px",borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",flexDirection:"column",gap:5}}>
            <button onClick={()=>setModal({type:"create",date:todayISO(),start_time:"09:00",end_time:"17:00",defMode:"hours"})}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 9px",borderRadius:6,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",fontSize:11,cursor:"pointer",transition:"all 0.12s",textAlign:"left"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#22c55e";e.currentTarget.style.color="#16a34a";e.currentTarget.style.background="rgba(34,197,94,0.05)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--color-border-tertiary)";e.currentTarget.style.color="var(--color-text-secondary)";e.currentTarget.style.background="var(--color-background-primary)";}}>
              <i className="ti ti-clock" style={{fontSize:13}} aria-hidden="true"/> Add working hours
            </button>
            <button onClick={()=>setModal({type:"create",date:viewMode==="day"?dayFocus:todayISO(),start_time:"09:00",end_time:"10:00",defMode:"booking"})}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 9px",borderRadius:6,border:"none",background:"#ff7a00",color:"#fff",fontSize:11,fontWeight:500,cursor:"pointer",transition:"filter 0.12s"}}
              onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.92)"}
              onMouseLeave={e=>e.currentTarget.style.filter=""}>
              <i className="ti ti-plus" style={{fontSize:13}} aria-hidden="true"/> New booking
            </button>
          </div>

          {/* Legend */}
          <div style={{padding:"10px 12px"}}>
            <p style={{fontSize:9,fontWeight:500,color:"var(--color-text-tertiary)",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>Legend</p>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"var(--color-text-secondary)"}}>
                <div style={{width:16,height:10,borderRadius:2,borderLeft:"2px solid #22c55e",background:"rgba(34,197,94,0.1)",flexShrink:0}}/>
                Working hours
              </div>
              <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"var(--color-text-secondary)"}}>
                <div style={{width:16,height:10,borderRadius:2,background:"rgba(255,122,0,0.2)",borderLeft:"2px solid #ff7a00",flexShrink:0}}/>
                Booking
              </div>
              <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:"var(--color-text-secondary)"}}>
                <div style={{width:16,height:2,borderRadius:1,background:"#ef4444",flexShrink:0}}/>
                Current time
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>

        {/* Top bar */}
        <div style={{height:48,borderBottom:"0.5px solid var(--color-border-tertiary)",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",flexShrink:0,gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Sidebar toggle */}
            <button onClick={()=>setSidebar(s=>!s)}
              style={{width:28,height:28,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--color-text-secondary)",transition:"all 0.12s"}}
              title={sidebar?"Collapse sidebar":"Expand sidebar"}>
              <i className={`ti ti-layout-sidebar${sidebar?"-right":""}`} style={{fontSize:14}} aria-hidden="true"/>
            </button>

            {/* Nav arrows */}
            <div style={{display:"flex",gap:2}}>
              <NavBtn onClick={()=>setMonday(m=>addDays(m,-7))} title="Previous week">‹</NavBtn>
              <NavBtn onClick={()=>setMonday(m=>addDays(m,+7))} title="Next week">›</NavBtn>
            </div>

            {/* Today */}
            <button onClick={()=>{setMonday(mondayOf(todayISO()));setDayFocus(todayISO());}}
              style={{padding:"4px 10px",fontSize:11,fontWeight:500,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",borderRadius:6,cursor:"pointer",color:"var(--color-text-secondary)",transition:"all 0.12s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--color-border-primary)";e.currentTarget.style.color="var(--color-text-primary)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--color-border-tertiary)";e.currentTarget.style.color="var(--color-text-secondary)";}}>
              Today
            </button>

            {/* Week label */}
            <div style={{borderLeft:"0.5px solid var(--color-border-tertiary)",paddingLeft:10}}>
              <span style={{fontSize:13,fontWeight:500,color:"var(--color-text-primary)"}}>
                {viewMode==="week"
                  ? `${MONTHS_S[new Date(monday+"T00:00:00").getMonth()]} ${new Date(monday+"T00:00:00").getDate()}–${new Date(addDays(monday,6)+"T00:00:00").getDate()}, ${new Date(addDays(monday,6)+"T00:00:00").getFullYear()}`
                  : new Date(dayFocus+"T00:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})
                }
              </span>
            </div>
          </div>

          {/* Right side */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {/* Week/Day toggle */}
            <div style={{display:"flex",background:"var(--color-background-secondary)",borderRadius:6,padding:2,border:"0.5px solid var(--color-border-tertiary)"}}>
              {[["week","Week"],["day","Day"]].map(([v,l])=>(
                <button key={v} onClick={()=>setViewMode(v)}
                  style={{padding:"4px 12px",borderRadius:5,border:"none",fontSize:11,fontWeight:500,cursor:"pointer",transition:"all 0.1s",
                    background:viewMode===v?"var(--color-background-primary)":"transparent",
                    color:viewMode===v?"var(--color-text-primary)":"var(--color-text-tertiary)",
                    boxShadow:viewMode===v?"0 0.5px 2px rgba(0,0,0,0.08)":"none"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div style={{flex:1,display:"flex",minHeight:0,overflow:"hidden"}}>

          {/* Time column (sticky) */}
          <div style={{width:44,flexShrink:0,borderRight:"0.5px solid var(--color-border-tertiary)",position:"relative",background:"var(--color-background-primary)"}}>
            <div style={{height:28,borderBottom:"0.5px solid var(--color-border-tertiary)"}}/>
            <div style={{height:GRID_H,position:"relative"}}>
              {hourLabels.map((h,i)=>(
                <div key={i} style={{position:"absolute",top:i*CELL_H-8,left:0,right:0,display:"flex",justifyContent:"flex-end",padding:"0 6px",pointerEvents:"none"}}>
                  <span style={{fontSize:9,color:"var(--color-text-tertiary)",fontFamily:"var(--font-mono)",lineHeight:1}}>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable days area */}
          <div ref={scrollRef} style={{flex:1,overflowY:"auto",overflowX:"hidden",minWidth:0}}>

            {/* Day headers */}
            <div style={{display:"grid",gridTemplateColumns:`repeat(${viewDays.length},1fr)`,height:28,borderBottom:"0.5px solid var(--color-border-tertiary)",position:"sticky",top:0,background:"var(--color-background-primary)",zIndex:20}}>
              {viewDays.map((dayISO,i)=>{
                const d=new Date(dayISO+"T00:00:00");
                const isToday=dayISO===todayISO();
                const isPast=isPastDate(dayISO);
                const isWk=viewMode==="week";
                const weekend=isWk&&i>=5;
                const bkDots=(byDate[dayISO]||[]).filter(e=>e._type==="appointment");
                const hasH=(byDate[dayISO]||[]).some(e=>e._type==="availability");
                return (
                  <div key={dayISO}
                    onClick={()=>{ if(viewMode==="week"){setDayFocus(dayISO);setViewMode("day");} }}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,borderLeft:i>0?"0.5px solid var(--color-border-tertiary)":"none",cursor:viewMode==="week"?"pointer":"default",
                      background:isToday?"rgba(255,122,0,0.04)":isPast?"var(--color-background-tertiary)":"transparent",
                      transition:"background 0.1s"}}
                    onMouseEnter={e=>{ if(viewMode==="week") e.currentTarget.style.background="var(--color-background-secondary)"; }}
                    onMouseLeave={e=>e.currentTarget.style.background=isToday?"rgba(255,122,0,0.04)":isPast?"var(--color-background-tertiary)":"transparent"}>
                    <span style={{fontSize:9,fontWeight:500,textTransform:"uppercase",letterSpacing:".05em",
                      color:isToday?"#ff7a00":weekend?"var(--color-text-tertiary)":"var(--color-text-tertiary)"}}>
                      {viewMode==="day"?d.toLocaleDateString("en-US",{weekday:"short"}):DAYS_SHORT[i]}
                    </span>
                    <div style={{width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                      background:isToday?"#ff7a00":"transparent",
                      fontSize:11,fontWeight:isToday?500:400,
                      color:isToday?"#fff":isPast?"var(--color-text-tertiary)":weekend?"var(--color-text-tertiary)":"var(--color-text-secondary)"}}>
                      {d.getDate()}
                    </div>
                    {hasH&&<span style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",flexShrink:0}}/>}
                    {bkDots.slice(0,2).map((ev,k)=><span key={k} style={{width:4,height:4,borderRadius:"50%",background:bkColor(ev).base,flexShrink:0}}/>)}
                  </div>
                );
              })}
            </div>

            {/* Hour grid */}
            {loading?(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,gap:10,color:"var(--color-text-tertiary)"}}>
                <div style={{width:16,height:16,border:"1.5px solid var(--color-border-tertiary)",borderTopColor:"#ff7a00",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                <span style={{fontSize:12}}>Loading…</span>
              </div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:`repeat(${viewDays.length},1fr)`,height:GRID_H,position:"relative"}}>
                {viewDays.map((dayISO,colIdx)=>{
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
                      style={{
                        position:"relative",
                        borderLeft:colIdx>0?"0.5px solid var(--color-border-tertiary)":"none",
                        background:isToday?"rgba(255,122,0,0.012)":isPast?"var(--color-background-tertiary)":"transparent",
                        cursor:isPast?"not-allowed":"crosshair",
                      }}>

                      {/* Hour lines */}
                      {Array.from({length:HOURS},(_,i)=>(
                        <div key={i} style={{position:"absolute",top:i*CELL_H,left:0,right:0,borderTop:i===0?"none":"0.5px solid var(--color-border-tertiary)",pointerEvents:"none"}}>
                          <div style={{position:"absolute",top:CELL_H/2,left:"6%",right:0,borderTop:"0.5px solid var(--color-border-tertiary)",opacity:.35,pointerEvents:"none"}}/>
                        </div>
                      ))}

                      {/* Past overlay — diagonal stripe on past days */}
                      {(isPast||(isToday&&toPx(nowTime)>0))&&(
                        <div style={{
                          position:"absolute",top:0,left:0,right:0,
                          height:isPast?GRID_H:toPx(nowTime),
                          backgroundImage:"repeating-linear-gradient(45deg,rgba(0,0,0,0) 0,rgba(0,0,0,0) 6px,rgba(0,0,0,0.025) 6px,rgba(0,0,0,0.025) 7px)",
                          pointerEvents:"none",zIndex:1,
                        }}/>
                      )}

                      {/* Working hours — background lane */}
                      {workHrs.map((ev,idx)=>{
                        const top=toPx(ev.start_time), h=durPx(ev.start_time,ev.end_time);
                        const isG=ghost&&(ghost._real_id===ev._real_id||String(ghost.id)===String(ev.id))&&ghost.date===dayISO;
                        return (
                          <div key={ev.id||`wh${idx}`}
                            onPointerDown={e=>startDrag(e,ev,"move")}
                            style={{position:"absolute",top,left:0,right:0,height:h,
                              background:"rgba(34,197,94,0.07)",
                              borderTop:"0.5px solid rgba(34,197,94,0.25)",
                              borderBottom:"0.5px solid rgba(34,197,94,0.1)",
                              borderLeft:"2px solid rgba(34,197,94,0.5)",
                              zIndex:2,cursor:"grab",userSelect:"none",
                              opacity:isG?.3:1,transition:"opacity .1s",
                              display:"flex",alignItems:"flex-start",padding:"3px 7px",overflow:"hidden",
                            }}>
                            <span onClick={e=>{e.stopPropagation();setModal({type:"edit",event:ev});}}
                              style={{fontSize:9,fontWeight:500,color:"rgba(22,163,74,0.8)",fontFamily:"var(--font-mono)",cursor:"pointer",letterSpacing:".04em",userSelect:"none",
                                padding:"1px 5px",borderRadius:3,background:"rgba(34,197,94,0.1)",transition:"background 0.1s"}}
                              onMouseEnter={e=>e.target.style.background="rgba(34,197,94,0.18)"}
                              onMouseLeave={e=>e.target.style.background="rgba(34,197,94,0.1)"}>
                              working hours
                            </span>
                            <div onPointerDown={e=>{e.stopPropagation();startDrag(e,ev,"resize");}}
                              style={{position:"absolute",bottom:0,left:0,right:0,height:7,cursor:"ns-resize",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <div style={{width:18,height:1.5,borderRadius:1,background:"rgba(34,197,94,0.35)"}}/>
                            </div>
                          </div>
                        );
                      })}

                      {/* Bookings */}
                      {bookings.map((ev,idx)=>{
                        const c=bkColor(ev);
                        const top=toPx(ev.start_time), h=durPx(ev.start_time,ev.end_time);
                        const short=h<34;
                        const isG=ghost&&String(ghost.id)===String(ev.id)&&ghost.date===dayISO;
                        return (
                          <div key={ev.id||`bk${idx}`}
                            onPointerDown={e=>startDrag(e,ev,"move")}
                            onClick={e=>{e.stopPropagation();setModal({type:"edit",event:ev});}}
                            style={{position:"absolute",top:top+1,left:3,right:3,height:h-2,
                              borderRadius:5,background:c.bg,
                              borderLeft:`2px solid ${c.base}`,
                              border:`0.5px solid ${c.border}`,borderLeft:`2px solid ${c.base}`,
                              padding:short?"2px 7px":"5px 8px",
                              cursor:"grab",overflow:"hidden",zIndex:10,userSelect:"none",
                              opacity:isG?.3:1,transition:"opacity .1s,filter .1s",
                            }}
                            onMouseEnter={e=>{if(!dragRef.current){e.currentTarget.style.filter="brightness(0.93)";e.currentTarget.style.zIndex=20;}}}
                            onMouseLeave={e=>{e.currentTarget.style.filter="";e.currentTarget.style.zIndex=10;}}>
                            <div style={{fontSize:short?10:11,fontWeight:500,color:c.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.3,pointerEvents:"none"}}>
                              {ev.service_name||ev.client_name||"Booking"}
                            </div>
                            {!short&&(
                              <div style={{fontSize:9,color:c.text,opacity:.7,marginTop:1,fontFamily:"var(--font-mono)",pointerEvents:"none"}}>
                                {fmt12(ev.start_time)}–{fmt12(ev.end_time)}
                                {ev.client_name&&ev.client_name!=="Client"?` · ${ev.client_name}`:""}
                              </div>
                            )}
                            <div onPointerDown={e=>{e.stopPropagation();startDrag(e,ev,"resize");}}
                              style={{position:"absolute",bottom:0,left:0,right:0,height:7,cursor:"ns-resize",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <div style={{width:22,height:1.5,borderRadius:1,background:hexRgba(c.base,.4)}}/>
                            </div>
                          </div>
                        );
                      })}

                      {/* Ghost (drag preview) */}
                      {ghost&&ghost.date===dayISO&&(()=>{
                        const isWH=ghost._type==="availability";
                        const c=isWH?{base:"#22c55e",bg:"rgba(34,197,94,0.18)",border:"rgba(34,197,94,0.6)",text:"rgba(22,163,74,0.9)"}:bkColor(ghost);
                        const gh=durPx(ghost.start_time,ghost.end_time);
                        return (
                          <div style={{position:"absolute",top:toPx(ghost.start_time)+1,left:3,right:3,height:gh-2,
                            borderRadius:5,background:c.bg,
                            border:`1px dashed ${c.base}`,
                            zIndex:50,pointerEvents:"none",
                            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
                          }}>
                            <span style={{fontSize:10,fontWeight:500,color:c.text}}>{isWH?"Working hours":(ghost.service_name||ghost.client_name||"Booking")}</span>
                            <span style={{fontSize:9,opacity:.7,fontFamily:"var(--font-mono)",color:c.text}}>{fmt12(ghost.start_time)}–{fmt12(ghost.end_time)}</span>
                          </div>
                        );
                      })()}

                      {/* Now line */}
                      {isToday&&(()=>{
                        const t=toPx(nowTime); if(t<0||t>GRID_H)return null;
                        return (
                          <div style={{position:"absolute",top:t,left:0,right:0,zIndex:25,pointerEvents:"none"}}>
                            <div style={{position:"absolute",left:-3,top:-3,width:6,height:6,borderRadius:"50%",background:"#ef4444"}}/>
                            <div style={{height:1,background:"#ef4444",opacity:.75}}/>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* Empty state */}
                {events.length===0&&(
                  <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:40,pointerEvents:"none",
                    textAlign:"center",background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",
                    borderRadius:"var(--border-radius-lg)",padding:"24px 28px",maxWidth:280,
                    boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
                    <i className="ti ti-calendar" style={{fontSize:32,color:"var(--color-text-tertiary)",display:"block",marginBottom:10}} aria-hidden="true"/>
                    <p style={{fontSize:13,fontWeight:500,color:"var(--color-text-secondary)",margin:"0 0 6px"}}>No events yet</p>
                    <p style={{fontSize:11,color:"var(--color-text-tertiary)",lineHeight:1.65,margin:0}}>
                      Click a time slot to add a booking, or use the sidebar to set working hours.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────── */}
      {modal?.type==="create"&&<CreateModal initial={modal} services={services} onSave={onCreate} onClose={()=>setModal(null)}/>}
      {modal?.type==="edit"&&<EditModal event={modal.event} services={services} onSave={onUpdate} onDelete={onDelete} onClose={()=>setModal(null)}/>}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────
function Backdrop({children,onClose}){
  return(
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:20,width:"100%",maxWidth:392,boxShadow:"0 16px 48px rgba(0,0,0,0.16)",animation:"slideUp .18s ease both"}}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
        {children}
      </div>
    </div>
  );
}

function FL({label,children,s}){return<div style={s}><label style={{display:"block",fontSize:11,fontWeight:500,color:"var(--color-text-secondary)",marginBottom:5}}>{label}</label>{children}</div>;}
function Err({children}){return<div style={{padding:"8px 11px",borderRadius:6,background:"var(--color-background-danger)",border:"0.5px solid var(--color-border-danger)",color:"var(--color-text-danger)",fontSize:12,marginBottom:11}}>{children}</div>;}
function NoSvc(){return<div style={{padding:"10px 12px",borderRadius:6,background:"var(--color-background-warning)",border:"0.5px solid var(--color-border-warning)",fontSize:12,color:"var(--color-text-warning)",lineHeight:1.65}}>No services yet — go to <strong>Services</strong> to add one first.</div>;}
function Opt(){return<span style={{color:"var(--color-text-tertiary)",fontWeight:400}}> (optional)</span>;}
function NavBtn({onClick,children,title}){return<button onClick={onClick} title={title} style={{width:26,height:26,borderRadius:5,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .1s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--color-border-primary)";e.currentTarget.style.color="var(--color-text-primary)";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--color-border-tertiary)";e.currentTarget.style.color="var(--color-text-secondary)";}}>{children}</button>;}
function useEsc(fn){useEffect(()=>{const h=e=>{if(e.key==="Escape")fn();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[fn]);}
const todayISOf=todayISO;

function CreateModal({initial,services,onSave,onClose}){
  const[mode,setMode]=useState(initial.defMode||"booking");
  const[form,setForm]=useState({date:initial.date||"",start_time:initial.start_time||"09:00",end_time:initial.end_time||"10:00",client_name:"",phone:"",service_id:services[0]?.id||""});
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState("");
  useEsc(onClose);
  const sf=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  function onSvc(e){const sid=e.target.value,svc=services.find(s=>String(s.id)===String(sid));setForm(f=>({...f,service_id:sid,end_time:svc&&f.start_time?addM(f.start_time,svc.duration):f.end_time}));}
  async function submit(e){
    e.preventDefault();setError("");
    if(!form.date){setError("Date is required.");return;}
    if(form.start_time>=form.end_time){setError("End time must be after start time.");return;}
    if(isPastDate(form.date)){setError("Cannot create events in the past.");return;}
    setSaving(true);
    const err=await onSave({...form,status:mode==="hours"?"available":"booked",...(mode==="hours"?{}:{service_id:form.service_id,client_name:form.client_name,phone:form.phone})});
    setSaving(false);if(err)setError(err);
  }
  const noSvc=mode==="booking"&&services.length===0;
  return(
    <Backdrop onClose={onClose}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)",margin:0}}>New event</h3>
        <button onClick={onClose} style={{width:24,height:24,border:"none",background:"none",cursor:"pointer",color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,fontSize:14}}>
          <i className="ti ti-x" aria-hidden="true"/>
        </button>
      </div>
      {/* Mode tabs */}
      <div style={{display:"flex",marginBottom:14,background:"var(--color-background-secondary)",borderRadius:7,padding:3,gap:2}}>
        {[["hours","Working Hours","ti-clock"],["booking","Booking","ti-calendar-event"]].map(([v,l,ico])=>(
          <button key={v} type="button" onClick={()=>{setMode(v);setError("");}}
            style={{flex:1,padding:"7px 0",borderRadius:5,border:"none",cursor:"pointer",fontSize:11,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all .1s",
              background:mode===v?"var(--color-background-primary)":"transparent",
              color:mode===v?"var(--color-text-primary)":"var(--color-text-tertiary)",
              boxShadow:mode===v?"0 0.5px 2px rgba(0,0,0,0.08)":"none"}}>
            <i className={`ti ${ico}`} style={{fontSize:13}} aria-hidden="true"/>{l}
          </button>
        ))}
      </div>
      <div style={{padding:"8px 11px",borderRadius:6,marginBottom:13,fontSize:11,lineHeight:1.65,
        background:mode==="hours"?"rgba(34,197,94,0.06)":"rgba(255,122,0,0.06)",
        border:`0.5px solid ${mode==="hours"?"rgba(34,197,94,0.2)":"rgba(255,122,0,0.2)"}`,
        color:mode==="hours"?"var(--color-text-success)":"var(--color-text-warning)"}}>
        {mode==="hours"?"Sets your open hours — shown as a green background lane on the grid.":"Creates a specific booking on your calendar."}
      </div>
      {error&&<Err>{error}</Err>}
      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:11}}>
        <FL label="Date"><input type="date" value={form.date} onChange={sf("date")} min={todayISOf()} required style={{width:"100%",fontSize:13}}/></FL>
        <div style={{display:"flex",gap:8}}>
          <FL label="Start" s={{flex:1}}><input type="time" value={form.start_time} onChange={sf("start_time")} required style={{width:"100%",fontSize:13}}/></FL>
          <FL label="End" s={{flex:1}}><input type="time" value={form.end_time} onChange={sf("end_time")} required style={{width:"100%",fontSize:13}}/></FL>
        </div>
        {mode==="booking"&&(noSvc?<NoSvc/>:<>
          <FL label="Service"><select value={form.service_id} onChange={onSvc} style={{width:"100%",fontSize:13}}>
            <option value="">Select service…</option>
            {services.map(s=><option key={s.id} value={s.id}>{s.name} · ${parseFloat(s.price||0).toFixed(2)} · {s.duration}min</option>)}
          </select></FL>
          <FL label={<>Client name<Opt/></>}><input type="text" value={form.client_name} onChange={sf("client_name")} placeholder="e.g. John Smith" style={{width:"100%",fontSize:13}}/></FL>
          <FL label={<>Phone<Opt/></>}><input type="tel" value={form.phone} onChange={sf("phone")} placeholder="+1 234 567 890" style={{width:"100%",fontSize:13}}/></FL>
        </>)}
        <div style={{display:"flex",gap:7,marginTop:4}}>
          <button type="submit" disabled={saving||noSvc}
            style={{flex:1,padding:"10px 0",borderRadius:7,border:"none",fontWeight:500,fontSize:13,cursor:(saving||noSvc)?"not-allowed":"pointer",transition:"filter .1s",
              background:mode==="hours"?"#22c55e":"#ff7a00",color:mode==="hours"?"#fff":"#fff",opacity:(saving||noSvc)?.5:1}}>
            {saving?"Saving…":mode==="hours"?"Add working hours":"Create booking"}
          </button>
          <button type="button" onClick={onClose} style={{padding:"10px 16px",borderRadius:7,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",fontWeight:400,fontSize:13,cursor:"pointer"}}>Cancel</button>
        </div>
      </form>
    </Backdrop>
  );
}

function EditModal({event,services,onSave,onDelete,onClose}){
  const isWH=event._type==="availability"||event.status==="available";
  const[form,setForm]=useState({date:event.date,start_time:event.start_time,end_time:event.end_time,service_id:event.service_id||(services[0]?.id||""),client_name:event.client_name||"",phone:event.phone||""});
  const[saving,setSaving]=useState(false);
  const[conf,setConf]=useState(false);
  const[error,setError]=useState("");
  useEsc(onClose);
  const sf=k=>e=>setForm(f=>({...f,[k]:e.target.value}));
  function onSvc(e){const sid=e.target.value,svc=services.find(s=>String(s.id)===String(sid));setForm(f=>({...f,service_id:sid,end_time:svc&&f.start_time?addM(f.start_time,svc.duration):f.end_time}));}
  async function submit(e){
    e.preventDefault();setError("");
    if(form.start_time>=form.end_time){setError("End time must be after start time.");return;}
    setSaving(true);
    const err=await onSave({...event,...form});
    setSaving(false);if(err)setError(err);
  }
  const svc=services.find(s=>String(s.id)===String(event.service_id));
  const c=isWH?{base:"#22c55e"}:bkColor(event);
  return(
    <Backdrop onClose={onClose}>
      <div style={{height:2,background:c.base,borderRadius:"8px 8px 0 0",margin:"-20px -20px 16px"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <h3 style={{fontSize:15,fontWeight:500,color:"var(--color-text-primary)",margin:0}}>
          {isWH?"Edit working hours":(svc?.name||"Edit booking")}
        </h3>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:10,fontWeight:500,padding:"2px 7px",borderRadius:4,
            background:isWH?"var(--color-background-success)":"rgba(255,122,0,0.08)",
            color:isWH?"var(--color-text-success)":"#ff7a00",
            border:`0.5px solid ${isWH?"var(--color-border-success)":"rgba(255,122,0,0.25)"}`}}>
            {isWH?"Open":"Booked"}
          </span>
          <button onClick={onClose} style={{width:24,height:24,border:"none",background:"none",cursor:"pointer",color:"var(--color-text-tertiary)",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:4,fontSize:14}}>
            <i className="ti ti-x" aria-hidden="true"/>
          </button>
        </div>
      </div>
      {error&&<Err>{error}</Err>}
      <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:11}}>
        <FL label="Date"><input type="date" value={form.date} onChange={sf("date")} required style={{width:"100%",fontSize:13}}/></FL>
        <div style={{display:"flex",gap:8}}>
          <FL label="Start" s={{flex:1}}><input type="time" value={form.start_time} onChange={sf("start_time")} required style={{width:"100%",fontSize:13}}/></FL>
          <FL label="End" s={{flex:1}}><input type="time" value={form.end_time} onChange={sf("end_time")} required style={{width:"100%",fontSize:13}}/></FL>
        </div>
        {!isWH&&services.length>0&&<>
          <FL label="Service"><select value={form.service_id} onChange={onSvc} style={{width:"100%",fontSize:13}}>
            <option value="">Select service…</option>
            {services.map(s=><option key={s.id} value={s.id}>{s.name} · ${parseFloat(s.price||0).toFixed(2)} · {s.duration}min</option>)}
          </select></FL>
          <FL label={<>Client name<Opt/></>}><input type="text" value={form.client_name} onChange={sf("client_name")} style={{width:"100%",fontSize:13}}/></FL>
          <FL label={<>Phone<Opt/></>}><input type="tel" value={form.phone} onChange={sf("phone")} style={{width:"100%",fontSize:13}}/></FL>
        </>}
        <div style={{display:"flex",gap:7,marginTop:4}}>
          <button type="submit" disabled={saving}
            style={{flex:2,padding:"10px 0",borderRadius:7,border:"none",fontWeight:500,fontSize:13,cursor:saving?"not-allowed":"pointer",
              background:isWH?"#22c55e":"#ff7a00",color:"#fff",opacity:saving?.5:1,transition:"filter .1s"}}
            onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.92)"}
            onMouseLeave={e=>e.currentTarget.style.filter=""}>
            {saving?"Saving…":"Save changes"}
          </button>
          {!conf&&<button type="button" onClick={()=>setConf(true)}
            style={{flex:1,padding:"10px 0",borderRadius:7,border:"0.5px solid var(--color-border-danger)",background:"var(--color-background-danger)",color:"var(--color-text-danger)",fontWeight:400,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
            <i className="ti ti-trash" style={{fontSize:13}} aria-hidden="true"/> Delete
          </button>}
          {conf&&<button type="button" onClick={()=>onDelete(event)}
            style={{flex:1,padding:"10px 0",borderRadius:7,border:"none",background:"#ef4444",color:"#fff",fontWeight:500,fontSize:13,cursor:"pointer"}}>
            Confirm
          </button>}
          <button type="button" onClick={conf?()=>setConf(false):onClose}
            style={{flex:1,padding:"10px 0",borderRadius:7,border:"0.5px solid var(--color-border-tertiary)",background:"var(--color-background-primary)",color:"var(--color-text-secondary)",fontWeight:400,fontSize:13,cursor:"pointer"}}>
            {conf?"Cancel":"Close"}
          </button>
        </div>
      </form>
    </Backdrop>
  );
}
