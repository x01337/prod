// pages/reset-password.js
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function ResetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [form,    setForm]    = useState({ password: "", confirm: "" });
  const [done,    setDone]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [show,    setShow]    = useState({ pw: false, conf: false });

  // Validate token exists in URL
  useEffect(() => {
    if (router.isReady && !token) {
      setError("Invalid or missing reset link. Please request a new one.");
    }
  }, [router.isReady, token]);

  const sf = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const pw = form.password;
  const strength = pw.length === 0 ? 0 : pw.length < 6 ? 1 : pw.length < 10 ? 2 : pw.length < 14 || !/[^a-zA-Z0-9]/.test(pw) ? 3 : 4;
  const strengthLabels = ["", "Too short", "Weak", "Good", "Strong"];
  const strengthColors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    if (!token) { setError("Invalid reset link. Please request a new one."); return; }

    setLoading(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password: form.password }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Reset failed. Please request a new link."); return; }
      setDone(true);
      // Auto-redirect to dashboard after 2.5s (user is now logged in via cookie)
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Head><title>Reset password — ReplyAI</title></Head>
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

            {done ? (
              /* ── Success state ── */
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%", margin: "0 auto 20px",
                  background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 24px rgba(34,197,94,0.2)",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 20, color: "var(--text)", margin: "0 0 10px" }}>
                  Password updated!
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
                  Your password has been changed successfully.
                  You're now signed in — redirecting to your dashboard…
                </p>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 28, height: 28, border: "2.5px solid rgba(255,122,0,0.2)", borderTopColor: "var(--orange)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <div style={{ marginBottom: 28 }}>
                  <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", margin: "0 0 8px" }}>
                    Set a new password
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.65, margin: 0 }}>
                    Choose something strong — at least 8 characters.
                  </p>
                </div>

                {error && (
                  <div style={{
                    background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.2)",
                    borderRadius: 8, padding: "10px 14px", marginBottom: 18,
                    fontSize: 13, color: "#f87171",
                  }}>
                    {error}
                    {error.includes("request a new") && (
                      <div style={{ marginTop: 8 }}>
                        <Link href="/forgot-password" style={{ color: "var(--orange)", fontWeight: 600 }}>
                          Request a new reset link →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={submit}>
                  {/* New password */}
                  <div style={{ marginBottom: 16 }}>
                    <label className="label">New password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input"
                        type={show.pw ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        required
                        autoFocus
                        value={form.password}
                        onChange={sf("password")}
                        style={{ paddingRight: 44 }}
                      />
                      <button type="button"
                        onClick={() => setShow(s => ({ ...s, pw: !s.pw }))}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 13, padding: 0 }}>
                        {show.pw ? "Hide" : "Show"}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {form.password.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
                          {[1,2,3,4].map(i => (
                            <div key={i} style={{
                              flex: 1, height: 3, borderRadius: 2,
                              background: i <= strength ? strengthColors[strength] : "var(--border)",
                              transition: "background 0.2s",
                            }}/>
                          ))}
                        </div>
                        <p style={{ fontSize: 11, color: strengthColors[strength], margin: 0, fontWeight: 600 }}>
                          {strengthLabels[strength]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div style={{ marginBottom: 24 }}>
                    <label className="label">Confirm new password</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="input"
                        type={show.conf ? "text" : "password"}
                        placeholder="Repeat your password"
                        required
                        value={form.confirm}
                        onChange={sf("confirm")}
                        style={{
                          paddingRight: 44,
                          borderColor: form.confirm && form.confirm !== form.password
                            ? "rgba(239,68,68,0.5)" : undefined,
                        }}
                      />
                      <button type="button"
                        onClick={() => setShow(s => ({ ...s, conf: !s.conf }))}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: 13, padding: 0 }}>
                        {show.conf ? "Hide" : "Show"}
                      </button>
                    </div>
                    {form.confirm && form.confirm !== form.password && (
                      <p style={{ fontSize: 11, color: "#f87171", margin: "5px 0 0", fontWeight: 500 }}>
                        Passwords don't match
                      </p>
                    )}
                    {form.confirm && form.confirm === form.password && form.password.length >= 8 && (
                      <p style={{ fontSize: 11, color: "#4ade80", margin: "5px 0 0", fontWeight: 500 }}>
                        ✓ Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !token}
                    style={{
                      width: "100%", padding: "12px", borderRadius: 9, border: "none",
                      background: "var(--orange)", color: "#000", fontWeight: 700,
                      fontSize: 14, cursor: (loading || !token) ? "not-allowed" : "pointer",
                      opacity: (loading || !token) ? 0.6 : 1,
                      boxShadow: (loading || !token) ? "none" : "0 0 20px rgba(255,122,0,0.3)",
                      transition: "all 0.15s", display: "flex",
                      alignItems: "center", justifyContent: "center", gap: 8,
                    }}>
                    {loading ? <Spinner /> : "Update password →"}
                  </button>
                </form>
              </>
            )}
          </div>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-dim)" }}>
            <Link href="/login" style={{ color: "var(--text-muted)", textDecoration: "none" }}>
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
