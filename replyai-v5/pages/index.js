import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";

const O  = "#ff7a00";
const O2 = "#ff9a3c";
const BG = "#0b0b0b";

const css = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:${BG};color:#e8e8e8;font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
  @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(255,122,0,.3)}50%{box-shadow:0 0 40px rgba(255,122,0,.6)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  .au{animation:fadeUp .55s ease both}
  .d1{animation-delay:.05s}.d2{animation-delay:.1s}.d3{animation-delay:.15s}.d4{animation-delay:.2s}
  .glow-btn:hover{animation:glow .8s ease infinite}
`;

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen]   = useState(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <Head>
        <title>ReplyAI — Automate bookings & FAQ responses</title>
        <meta name="description" content="Smart FAQ chatbot + calendar scheduling for small businesses. Auto-respond on WhatsApp, manage bookings, and grow — without hiring support staff."/>
        <style dangerouslySetInnerHTML={{__html: css}}/>
      </Head>

      {/* ── NAV ── */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",
        background:scrolled?"rgba(11,11,11,.92)":"transparent",
        backdropFilter:scrolled?"blur(12px)":"none",
        borderBottom:scrolled?"1px solid #1f1f1f":"none",
        transition:"all .3s"}}>
        <Logo/>
        <div style={{display:"flex",gap:28,fontSize:14,color:"#888"}}>
          {[["#features","Features"],["#how","How it works"],["#pricing","Pricing"],["#faq","FAQ"]].map(([h,l])=>(
            <a key={h} href={h} style={{transition:"color .15s"}} onMouseEnter={e=>e.target.style.color="#fff"} onMouseLeave={e=>e.target.style.color="#888"}>{l}</a>
          ))}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <Link href="/login" style={{fontSize:13,color:"#888",padding:"8px 14px",borderRadius:8,transition:"color .15s"}} onMouseEnter={e=>e.currentTarget.style.color="#fff"} onMouseLeave={e=>e.currentTarget.style.color="#888"}>Sign in</Link>
          <Link href="/register" style={{fontSize:13,fontWeight:700,color:"#000",background:O,padding:"8px 18px",borderRadius:8,transition:"box-shadow .15s"}} className="glow-btn">Start free →</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"120px 24px 80px",textAlign:"center",position:"relative",overflow:"hidden"}}>
        {/* background glow */}
        <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:700,height:400,background:"radial-gradient(ellipse,rgba(255,122,0,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
        {/* grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,122,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,122,0,.025) 1px,transparent 1px)",backgroundSize:"48px 48px",pointerEvents:"none"}}/>

        <div style={{position:"relative",maxWidth:800}}>
          <div className="au" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"7px 16px",borderRadius:20,border:"1px solid #2a2a2a",background:"rgba(255,122,0,.07)",fontSize:12,fontWeight:700,color:O,marginBottom:28,letterSpacing:".04em"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:O,animation:"glow .8s ease infinite"}}/>
            NO AI APIS NEEDED · WORKS OFFLINE
          </div>

          <h1 className="au d1" style={{fontFamily:"Syne,sans-serif",fontSize:"clamp(36px,5.5vw,72px)",fontWeight:800,lineHeight:1.1,color:"#fff",marginBottom:24}}>
            Your business on<br/>
            <span style={{background:`linear-gradient(135deg,${O},${O2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>autopilot.</span>
          </h1>

          <p className="au d2" style={{fontSize:"clamp(16px,2vw,20px)",color:"#888",lineHeight:1.7,marginBottom:40,maxWidth:580,margin:"0 auto 40px"}}>
            ReplyAI answers customer questions, books appointments, and manages your schedule — automatically. Built for small businesses, zero coding required.
          </p>

          <div className="au d3" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",marginBottom:20}}>
            <Link href="/register" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 32px",borderRadius:10,background:O,color:"#000",fontWeight:800,fontSize:16,transition:"all .15s",boxShadow:`0 0 32px rgba(255,122,0,.35)`}} className="glow-btn">
              Start for free →
            </Link>
            <a href="#how" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"14px 28px",borderRadius:10,border:"1px solid #2a2a2a",color:"#bbb",fontWeight:600,fontSize:16,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#fff";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.color="#bbb";}}>
              See how it works
            </a>
          </div>

          <p className="au d4" style={{fontSize:13,color:"#444"}}>Free plan · No credit card · Setup in 5 minutes</p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{borderTop:"1px solid #1a1a1a",borderBottom:"1px solid #1a1a1a",background:"#0f0f0f",padding:"20px 24px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:20}}>
          {[["<100ms","Response time"],["13/13","Test cases"],["0","External APIs"],["5 min","Setup time"]].map(([v,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:28,background:`linear-gradient(135deg,${O},${O2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{v}</div>
              <div style={{fontSize:12,color:"#555",marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" style={{padding:"100px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <SectionBadge>Features</SectionBadge>
          <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"clamp(28px,4vw,48px)",color:"#fff",marginTop:16,marginBottom:16}}>
            Everything you need.<br/>Nothing you don't.
          </h2>
          <p style={{color:"#666",fontSize:17,maxWidth:520,marginBottom:64,lineHeight:1.7}}>A complete business automation platform, built to save you hours every week.</p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
            {[
              {icon:"🤖",title:"Smart FAQ Bot",desc:"Keyword + Jaccard similarity matching with synonym expansion. Finds the right answer even when phrasing differs. No AI API needed — works offline."},
              {icon:"📅",title:"Calendar & Bookings",desc:"Full week-view planner with drag & drop. Clients book via WhatsApp or your booking page. Working hours, service durations, all automated."},
              {icon:"💬",title:"WhatsApp Integration",desc:"Connect your WhatsApp Business number. Auto-reply to FAQs, confirm bookings, and send reminders — all through the official Meta API."},
              {icon:"⚡",title:"Optional AI Upgrade",desc:"Enable OpenRouter AI as a fallback for low-confidence answers. The local matcher runs first — AI is the safety net, not the default."},
              {icon:"🔒",title:"Secure by Default",desc:"Passwords hashed with bcrypt (cost 12). JWT in HttpOnly cookies. All queries parameterized. Rate limiting on every endpoint."},
              {icon:"🔌",title:"Embeddable Widget",desc:"2 lines of code to add your FAQ bot to any website. Instant public URL for sharing. Deploy to Railway in 10 minutes."},
            ].map(f=>(
              <div key={f.title} style={{padding:"28px",borderRadius:14,background:"#111",border:"1px solid #1f1f1f",transition:"border-color .2s,box-shadow .2s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.boxShadow="0 8px 40px rgba(0,0,0,.4)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#1f1f1f";e.currentTarget.style.boxShadow="none";}}>
                <div style={{fontSize:32,marginBottom:16}}>{f.icon}</div>
                <h3 style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:18,color:"#fff",marginBottom:10}}>{f.title}</h3>
                <p style={{fontSize:14,color:"#666",lineHeight:1.7}}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{padding:"100px 24px",background:"#0d0d0d",borderTop:"1px solid #1a1a1a",borderBottom:"1px solid #1a1a1a"}}>
        <div style={{maxWidth:900,margin:"0 auto"}}>
          <SectionBadge>How it works</SectionBadge>
          <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"clamp(28px,4vw,44px)",color:"#fff",marginTop:16,marginBottom:64}}>
            Live in 3 steps.
          </h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:48}}>
            {[
              {n:"01",title:"Add your FAQs & Services",desc:"Create your FAQ knowledge base and list your services with prices and durations. Takes about 5 minutes."},
              {n:"02",title:"Connect WhatsApp",desc:"Link your WhatsApp Business number via the Meta Cloud API. All incoming messages are processed automatically."},
              {n:"03",title:"Watch it run",desc:"Customers get instant answers, bookings appear in your calendar, and you get notified. No manual work."},
            ].map(s=>(
              <div key={s.n}>
                <div style={{fontFamily:"Syne,sans-serif",fontSize:56,fontWeight:800,color:"#1a1a1a",marginBottom:16,lineHeight:1,userSelect:"none"}}>{s.n}</div>
                <h3 style={{fontFamily:"Syne,sans-serif",fontWeight:700,fontSize:20,color:"#fff",marginBottom:10}}>{s.title}</h3>
                <p style={{fontSize:14,color:"#666",lineHeight:1.75}}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{padding:"100px 24px"}}>
        <div style={{maxWidth:1000,margin:"0 auto"}}>
          <SectionBadge>Pricing</SectionBadge>
          <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"clamp(28px,4vw,44px)",color:"#fff",marginTop:16,marginBottom:12}}>
            Simple, honest pricing.
          </h2>
          <p style={{color:"#666",fontSize:16,marginBottom:56}}>Start free. Upgrade when you need more.</p>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16}}>
            {[
              {id:"free",name:"Free",price:"$0",sub:"forever",highlight:false,features:["15 FAQs","3 services","30 bookings/month","100 messages/month","Calendar & scheduling","Email support"],cta:"Start free",href:"/register"},
              {id:"pro",name:"Pro",price:"$19",sub:"/month",highlight:true,features:["200 FAQs","20 services","500 bookings/month","2,000 messages/month","Telegram bot","AI responses","Analytics","API access"],cta:"Start Pro",href:"/register?plan=pro"},
              {id:"business",name:"Business",price:"$49",sub:"/month",highlight:false,features:["Unlimited everything","Unlimited team members","Custom branding","Priority support","All Pro features","White-label widget"],cta:"Start Business",href:"/register?plan=business"},
            ].map(p=>(
              <div key={p.id} style={{padding:"32px",borderRadius:16,background:p.highlight?"#111":"#0e0e0e",border:`1px solid ${p.highlight?`rgba(255,122,0,.35)`:"#1f1f1f"}`,boxShadow:p.highlight?"0 0 48px rgba(255,122,0,.1)":"none",display:"flex",flexDirection:"column",position:"relative"}}>
                {p.highlight&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:O,color:"#000",fontSize:11,fontWeight:800,padding:"4px 14px",borderRadius:20,letterSpacing:".06em",textTransform:"uppercase"}}>Most popular</div>}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                  <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:18,color:"#fff"}}>{p.name}</span>
                  <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:6,textTransform:"uppercase",letterSpacing:".06em",
                    background:p.id==="free"?"rgba(255,255,255,.06)":p.id==="pro"?"rgba(255,122,0,.12)":"rgba(255,215,0,.08)",
                    color:p.id==="free"?"#666":p.id==="pro"?O:"#ffd700",
                    border:`1px solid ${p.id==="free"?"#2a2a2a":p.id==="pro"?"rgba(255,122,0,.25)":"rgba(255,215,0,.2)"}`}}>{p.name}</span>
                </div>
                <div style={{marginBottom:28}}>
                  <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:40,color:"#fff"}}>{p.price}</span>
                  <span style={{color:"#555",fontSize:14,marginLeft:4}}>{p.sub}</span>
                </div>
                <ul style={{flex:1,marginBottom:28,listStyle:"none",display:"flex",flexDirection:"column",gap:10}}>
                  {p.features.map(f=>(
                    <li key={f} style={{display:"flex",alignItems:"center",gap:10,fontSize:13,color:"#999"}}>
                      <span style={{color:O,flexShrink:0,fontSize:11}}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <Link href={p.href} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 0",borderRadius:9,fontWeight:700,fontSize:14,transition:"all .15s",
                  background:p.highlight?O:"transparent",color:p.highlight?"#000":"#888",
                  border:p.highlight?"none":"1px solid #2a2a2a"}}
                  onMouseEnter={e=>{if(!p.highlight){e.currentTarget.style.borderColor="#444";e.currentTarget.style.color="#fff";}}}
                  onMouseLeave={e=>{if(!p.highlight){e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.color="#888";}}}>
                  {p.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{padding:"100px 24px",background:"#0d0d0d",borderTop:"1px solid #1a1a1a"}}>
        <div style={{maxWidth:700,margin:"0 auto"}}>
          <SectionBadge>FAQ</SectionBadge>
          <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"clamp(28px,4vw,40px)",color:"#fff",marginTop:16,marginBottom:48}}>Common questions</h2>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {q:"Do I need to know how to code?",a:"No. Everything is configured through a visual dashboard. You just add your FAQs, connect WhatsApp, and you're live."},
              {q:"Does it work without internet?",a:"The FAQ matching engine and calendar run fully offline. WhatsApp/Telegram integration requires internet, but your data stays on your server."},
              {q:"Can I cancel anytime?",a:"Yes. Cancel from your billing dashboard — no questions asked. You keep access until the end of the billing period."},
              {q:"What happens when I hit the free plan limit?",a:"You'll see a clear message when you're close to your limit. You can upgrade anytime — no service interruption."},
              {q:"Is my data safe?",a:"Yes. Passwords are bcrypt-hashed. JWTs stored in HttpOnly cookies. All DB queries are parameterized. You can self-host on your own server."},
              {q:"Can I use my own domain?",a:"Yes. Deploy to a VPS or Railway, point your domain's DNS to the server, and add a reverse proxy (Caddy handles HTTPS automatically)."},
            ].map((item,i)=>(
              <div key={i} style={{borderRadius:10,border:"1px solid #1f1f1f",overflow:"hidden"}}>
                <button onClick={()=>setFaqOpen(faqOpen===i?null:i)}
                  style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 20px",background:faqOpen===i?"#151515":"transparent",border:"none",color:"#fff",cursor:"pointer",fontSize:15,fontWeight:600,textAlign:"left",transition:"background .15s"}}>
                  {item.q}
                  <span style={{color:"#444",fontSize:20,lineHeight:1,transition:"transform .2s",transform:faqOpen===i?"rotate(45deg)":"none",flexShrink:0,marginLeft:12}}>+</span>
                </button>
                {faqOpen===i&&(
                  <div style={{padding:"0 20px 18px",color:"#777",fontSize:14,lineHeight:1.75,background:"#151515"}}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{padding:"120px 24px",textAlign:"center"}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{width:64,height:64,borderRadius:16,background:O,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 28px",boxShadow:`0 0 40px rgba(255,122,0,.4)`}}>
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/></svg>
          </div>
          <h2 style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:"clamp(28px,4vw,44px)",color:"#fff",marginBottom:16}}>Ready to automate?</h2>
          <p style={{color:"#666",fontSize:17,lineHeight:1.7,marginBottom:40}}>Set up your FAQ bot and booking calendar in under 5 minutes. No credit card required.</p>
          <Link href="/register" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"16px 40px",borderRadius:12,background:O,color:"#000",fontWeight:800,fontSize:17,boxShadow:`0 0 40px rgba(255,122,0,.4)`}} className="glow-btn">
            Create free account →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:"1px solid #1a1a1a",padding:"32px 24px"}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <Logo/>
          <p style={{fontSize:12,color:"#333"}}>© {new Date().getFullYear()} ReplyAI · Built with Next.js</p>
          <div style={{display:"flex",gap:20,fontSize:12,color:"#444"}}>
            {[["Privacy","/privacy"],["Terms","/terms"],["Sign in","/login"],["Register","/register"]].map(([l,h])=>(
              <Link key={h} href={h} style={{transition:"color .15s"}} onMouseEnter={e=>e.target.style.color="#888"} onMouseLeave={e=>e.target.style.color="#444"}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}

function Logo() {
  return (
    <Link href="/" style={{display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:32,height:32,borderRadius:9,background:O,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 14px rgba(255,122,0,.3)`}}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/></svg>
      </div>
      <span style={{fontFamily:"Syne,sans-serif",fontWeight:800,fontSize:18,color:"#fff"}}>ReplyAI</span>
    </Link>
  );
}

function SectionBadge({children}) {
  return (
    <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,border:`1px solid rgba(255,122,0,.2)`,background:`rgba(255,122,0,.07)`,fontSize:11,fontWeight:700,color:O,textTransform:"uppercase",letterSpacing:".07em"}}>
      {children}
    </div>
  );
}
