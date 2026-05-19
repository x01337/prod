import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Login failed."); return; }
      router.push("/dashboard");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Head><title>Sign in — ReplyAI</title></Head>
      <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>

        {/* Left branding panel */}
        <div style={{
          width: 420, flexShrink: 0, background: "var(--surface)",
          borderRight: "1px solid var(--border)", padding: "48px 40px",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
        }} className="hidden lg:flex">
          <Logo />

          <div>
            {/* Orange accent line */}
            <div style={{ width: 40, height: 3, background: "var(--orange)", borderRadius: 2, marginBottom: 24 }} />
            <h1 style={{ fontFamily: "Syne,sans-serif", fontSize: 28, fontWeight: 800, color: "var(--text)", lineHeight: 1.3, marginBottom: 14 }}>
              Stop answering<br />the same questions.
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7 }}>
              ReplyAI matches your customers' questions to your FAQ entries automatically — no AI APIs, no cloud costs, no repetitive work.
            </p>

            {/* Stats */}
            <div style={{ display: "flex", gap: 32, marginTop: 36 }}>
              {[["13/13","test passes"],["&lt;100ms","response time"],["$0","external APIs"]].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 800, color: "var(--orange)" }}
                    dangerouslySetInnerHTML={{ __html: v }} />
                  <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 10 }}>
              "Cut our support volume by 60% the first week. It just works."
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>S</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>Sarah K.</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Indie founder</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
          <div style={{ width: "100%", maxWidth: 400 }}>
            <div className="lg:hidden" style={{ marginBottom: 36 }}><Logo /></div>

            <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Welcome back</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 32 }}>Sign in to your ReplyAI dashboard</p>

            <form onSubmit={submit}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@example.com" required
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="••••••••" required
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div style={{ textAlign: "right", marginTop: 6 }}>
                <Link href="/forgot-password"
                  style={{ fontSize: 12, color: "var(--text-dim)", textDecoration: "none" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--orange)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-dim)"}>
                  Forgot password?
                </Link>
              </div>

              {error && (
                <div style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#f77" }}>
                  {error}
                </div>
              )}

              <button className="btn btn-orange" type="submit" disabled={loading}
                style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                {loading ? <Spinner /> : "Sign in"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
              No account?{" "}
              <Link href="/register" style={{ color: "var(--orange)", fontWeight: 600 }}>Create one free</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff" />
        </svg>
      </div>
      <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 18, color: "var(--text)" }}>
        Reply<span style={{ color: "var(--orange)" }}>AI</span>
      </span>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
