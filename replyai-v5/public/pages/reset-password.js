import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
const O = "#ff7a00";
export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;
  const [form,   setForm]   = useState({ password:"", confirm:"" });
  const [done,   setDone]   = useState(false);
  const [loading,setLoading]= useState(false);
  const [error,  setError]  = useState("");
  const [show,   setShow]   = useState({ pw:false, cf:false });
  useEffect(()=>{ if(router.isReady&&!token) setError("Invalid reset link. Please request a new one."); },[router.isReady,token]);
  const pw = form.password;
  const strength = pw.length===0?0:pw.length<6?1:pw.length<10?2:pw.length<14||!/[^a-zA-Z0-9]/.test(pw)?3:4;
  const sColors = ["","#ef4444","#f59e0b","#3b82f6","#22c55e"];
  const sLabels = ["","Too short","Weak","Good","Strong"];
  async function submit(e) {
    e.preventDefault(); setError("");
    if (form.password.length<8) { setError("Password must be at least 8 characters."); return; }
    if (form.password!==form.confirm) { setError("Passwords don't match."); return; }
    if (!token) { setError("Invalid reset link."); return; }
    setLoading(true);
    try {
      const r=await fetch("/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,password:form.password})});
      const d=await r.json();
      if (!r.ok) { setError(d.error||"Reset failed."); return; }
      setDone(true); setTimeout(()=>router.push("/dashboard"),2500);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }
  return (
    <>
      <Head><title>Reset password — ReplyAI</title></Head>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:24,fontFamily:"DM Sans,system-ui,sans-serif"}}>
        <div style={{width:"100%",maxWidth:420}}>
          <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:36,textDecoration:"none"}}>
            <div style={{width:30,height:30,borderRadius:8,background:O,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/></svg>
            </div>
            <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:17,color:"var(--text)"}}>Reply<span style={{color:O}}>AI</span></span>
          </Link>
          <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"36px 32px",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
            {done ? (
              <div style={{textAlign:"center"}}>
                <div style={{width:56,height:56,borderRadius:"50%",margin:"0 auto 20px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:20,color:"var(--text)",margin:"0 0 10px"}}>Password updated!</h2>
                <p style={{color:"var(--text-muted)",fontSize:14,lineHeight:1.7,margin:"0 0 20px"}}>You're signed in — redirecting to your dashboard…</p>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <div style={{width:24,height:24,border:"2px solid rgba(255,122,0,0.2)",borderTopColor:O,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : (
              <>
                <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:22,color:"var(--text)",margin:"0 0 8px"}}>Set a new password</h2>
                <p style={{color:"var(--text-muted)",fontSize:14,lineHeight:1.65,margin:"0 0 24px"}}>At least 8 characters.</p>
                {error && <div style={{padding:"9px 13px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",fontSize:13,marginBottom:16}}>{error}
                  {error.includes("request a new") && <div style={{marginTop:6}}><Link href="/forgot-password" style={{color:O,fontWeight:600}}>Request a new link →</Link></div>}
                </div>}
                <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>New password</label>
                    <div style={{position:"relative"}}>
                      <input type={show.pw?"text":"password"} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required className="input" style={{width:"100%",paddingRight:48,fontSize:14}}/>
                      <button type="button" onClick={()=>setShow(s=>({...s,pw:!s.pw}))} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text-dim)",fontSize:12}}>
                        {show.pw?"Hide":"Show"}
                      </button>
                    </div>
                    {pw.length>0&&<>
                      <div style={{display:"flex",gap:3,marginTop:7}}>
                        {[1,2,3,4].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=strength?sColors[strength]:"var(--border)",transition:"background .2s"}}/>)}
                      </div>
                      <p style={{fontSize:11,color:sColors[strength],margin:"4px 0 0",fontWeight:600}}>{sLabels[strength]}</p>
                    </>}
                  </div>
                  <div>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Confirm password</label>
                    <div style={{position:"relative"}}>
                      <input type={show.cf?"text":"password"} value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} required className="input"
                        style={{width:"100%",paddingRight:48,fontSize:14,borderColor:form.confirm&&form.confirm!==form.password?"rgba(239,68,68,0.5)":undefined}}/>
                      <button type="button" onClick={()=>setShow(s=>({...s,cf:!s.cf}))} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--text-dim)",fontSize:12}}>
                        {show.cf?"Hide":"Show"}
                      </button>
                    </div>
                    {form.confirm&&form.confirm!==form.password&&<p style={{fontSize:11,color:"#f87171",margin:"4px 0 0"}}>Passwords don't match</p>}
                    {form.confirm&&form.confirm===form.password&&form.password.length>=8&&<p style={{fontSize:11,color:"#4ade80",margin:"4px 0 0"}}>✓ Passwords match</p>}
                  </div>
                  <button type="submit" disabled={loading||!token}
                    style={{padding:"12px",borderRadius:9,border:"none",background:O,color:"#000",fontWeight:700,fontSize:14,cursor:(loading||!token)?"not-allowed":"pointer",opacity:(loading||!token)?.6:1,boxShadow:(loading||!token)?"none":`0 0 20px rgba(255,122,0,0.3)`,transition:"all 0.15s",marginTop:4}}>
                    {loading?"Updating…":"Update password →"}
                  </button>
                </form>
              </>
            )}
          </div>
          <p style={{textAlign:"center",marginTop:22,fontSize:13,color:"var(--text-dim)"}}>
            <Link href="/login" style={{color:"var(--text-muted)",textDecoration:"none"}}>← Back to sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
}
