import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
const O = "#ff7a00";
export default function ForgotPassword() {
  const [email, setEmail]   = useState("");
  const [sent,  setSent]    = useState(false);
  const [loading,setLoading]= useState(false);
  const [error, setError]   = useState("");
  async function submit(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
      const d = await r.json();
      if (r.ok) { setSent(true); return; }
      setError(d.error || "Something went wrong.");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }
  return (
    <>
      <Head><title>Forgot password — ReplyAI</title></Head>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",padding:24,fontFamily:"DM Sans,system-ui,sans-serif"}}>
        <div style={{width:"100%",maxWidth:420}}>
          <Link href="/" style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:36,textDecoration:"none"}}>
            <div style={{width:30,height:30,borderRadius:8,background:O,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/></svg>
            </div>
            <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:17,color:"var(--text)"}}>Reply<span style={{color:O}}>AI</span></span>
          </Link>
          <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"36px 32px",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
            {sent ? (
              <div style={{textAlign:"center"}}>
                <div style={{width:52,height:52,borderRadius:"50%",margin:"0 auto 20px",background:"rgba(34,197,94,0.1)",border:"1px solid rgba(34,197,94,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>✉️</div>
                <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:20,color:"var(--text)",margin:"0 0 10px"}}>Check your inbox</h2>
                <p style={{color:"var(--text-muted)",fontSize:14,lineHeight:1.7,margin:"0 0 6px"}}>
                  If <strong style={{color:"var(--text)"}}>{email}</strong> is registered, you'll receive a reset link shortly.
                </p>
                <p style={{color:"var(--text-dim)",fontSize:12,margin:"0 0 24px"}}>The link expires in <strong style={{color:"var(--text-muted)"}}>30 minutes</strong>.</p>
                <button onClick={()=>setSent(false)} style={{background:"transparent",border:"none",color:O,fontSize:13,fontWeight:600,cursor:"pointer",textDecoration:"underline"}}>Send another link</button>
              </div>
            ) : (
              <>
                <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:22,color:"var(--text)",margin:"0 0 8px"}}>Forgot your password?</h2>
                <p style={{color:"var(--text-muted)",fontSize:14,lineHeight:1.65,margin:"0 0 24px"}}>Enter your email and we'll send you a reset link.</p>
                {error && <div style={{padding:"9px 13px",borderRadius:8,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",fontSize:13,marginBottom:16}}>{error}</div>}
                <form onSubmit={submit}>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Email address</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoFocus
                    style={{width:"100%",marginBottom:18,fontSize:14}} className="input"/>
                  <button type="submit" disabled={loading}
                    style={{width:"100%",padding:"12px",borderRadius:9,border:"none",background:O,color:"#000",fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",opacity:loading?.6:1,boxShadow:loading?"none":`0 0 20px rgba(255,122,0,0.3)`,transition:"all 0.15s"}}>
                    {loading ? "Sending…" : "Send reset link →"}
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
