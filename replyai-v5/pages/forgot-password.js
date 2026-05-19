// pages/forgot-password.js
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function submit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json();
      if (r.ok) { setSent(true); return; }
      setError(d.error || "Something went wrong.");
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Head><title>Forgot password — ReplyAI</title></Head>
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg)", padding: "24px",
      }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Logo */}
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 40, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/>
              </svg>
            </div>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 18, color: "var(--text)" }}>
              Reply<span style={{ color: "var(--orange)" }}>AI</span>
            </span>
          </Link>

          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "36px 32px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}>

            {sent ? (
              /* ── Success state ── */
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                }}>
                  ✉️
                </div>
                <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 20, color: "var(--text)", margin: "0 0 10px" }}>
                  Check your inbox
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>
                  If <strong style={{ color: "var(--text)" }}>{email}</strong> is registered,
                  you'll receive a password reset link in the next few minutes.
                </p>
                <p style={{ color: "var(--text-dim)", fontSize: 12, lineHeight: 1.6, margin: "0 0 28px" }}>
                  Don't see it? Check your spam folder.
                  The link expires in <strong style={{ color: "var(--text-muted)" }}>30 minutes</strong>.
                </p>

                {/* Resend */}
                <button
                  onClick={() => setSent(false)}
                  style={{ background: "transparent", border: "none", color: "var(--orange)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                  Send another link
                </button>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", margin: "0 0 8px" }}>
                    Forgot your password?
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                </div>

                {error && (
                  <div style={{
                    background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)",
                    borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#f87171",
                  }}>
                    {error}
                  </div>
                )}

                <form onSubmit={submit}>
                  <div style={{ marginBottom: 20 }}>
                    <label className="label">Email address</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoFocus
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 9, border: "none",
                      background: "var(--orange)", color: "#000", fontWeight: 700,
                      fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                      boxShadow: loading ? "none" : "0 0 20px rgba(255,122,0,0.3)",
                      transition: "all 0.15s", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8,
                    }}>
                    {loading ? <Spinner /> : "Send reset link →"}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Back to login */}
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-dim)" }}>
            <Link href="/login" style={{ color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
