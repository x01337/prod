import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Registration failed."); return; }
      router.push("/dashboard");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Head><title>Create account — ReplyAI</title></Head>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 36 }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <Logo />
            </Link>
          </div>

          {/* Card */}
          <div className="card" style={{ borderTop: "2px solid var(--orange)", padding: 32 }}>
            <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Create your account</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 28 }}>Free forever. No credit card required.</p>

            <form onSubmit={submit}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Name</label>
                <input className="input" type="text" placeholder="Your name" required
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@example.com" required
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="Min. 8 chars, 1 letter, 1 number" required minLength={8}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                <PasswordStrength pwd={form.password} />
              </div>

              {error && (
                <div style={{ background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#f77" }}>
                  {error}
                </div>
              )}

              <button className="btn btn-orange" type="submit" disabled={loading}
                style={{ width: "100%", justifyContent: "center", padding: "12px", borderRadius: "var(--radius-sm)" }}>
                {loading ? <Spinner /> : "Create free account"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--text-muted)" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "var(--orange)", fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 24 }}>
            {["✓ 12 sample FAQs included", "✓ No AI costs", "✓ Works offline"].map(f => (
              <span key={f} style={{ fontSize: 12, color: "var(--text-dim)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px" }}>{f}</span>
            ))}
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

function PasswordStrength({ pwd }) {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[a-zA-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (pwd.length >= 12) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#22c55e"];
  const label = labels[Math.min(score, 5)] || "";
  const color = colors[Math.min(score, 5)];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ flex:1, height:3, borderRadius:2, background: score >= i ? color : "var(--border)", transition:"background 0.2s" }}/>
        ))}
      </div>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}
