// pages/dashboard.js  —  ReplyAI v2 Dashboard (orange-black theme)
import Head from "next/head";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import CalendarView from "../components/CalendarView";
import AnalyticsDashboard from "../components/AnalyticsDashboard";

// ─── Auth hook ───────────────────────────────────────────────────────────────
function useAuth() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!d) { router.replace("/login"); return; } setUser(d.user); })
      .finally(() => setChecking(false));
  }, []);
  return { user, checking };
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, checking } = useAuth();
  const [faqs, setFaqs] = useState([]);
  const [view, setView] = useState("chat");
  const [mobileOpen, setMobileOpen] = useState(false);

  const loadFaqs = useCallback(async () => {
    const r = await fetch("/api/faqs");
    if (r.ok) setFaqs(await r.json());
  }, []);

  useEffect(() => { if (user) loadFaqs(); }, [user]);

  if (checking) return <FullLoader />;

  return (
    <>
      <Head><title>Dashboard — ReplyAI</title></Head>
      <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 20 }}
            className="lg:hidden" />
        )}

        {/* ── Sidebar ── */}
        <aside style={{
          width: 220, flexShrink: 0,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, height: "100%", zIndex: 30,
          transition: "transform 0.25s ease",
        }}
          className={`${mobileOpen ? "" : "-translate-x-full"} lg:translate-x-0`}>

          {/* Logo */}
          <div style={{ padding: "18px 16px", borderBottom: "1px solid var(--border)", borderTop: "2px solid var(--orange)" }}>
            <Logo />
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            <NavBtn icon={<ChatIcon />} label="Chat Bot" active={view === "chat"}
              badge={null}
              onClick={() => { setView("chat"); setMobileOpen(false); }} />
            <NavBtn icon={<ListIcon />} label="FAQ Manager" active={view === "faqs"}
              badge={faqs.length}
              onClick={() => { setView("faqs"); setMobileOpen(false); }} />
            <NavBtn icon={<ServicesIcon />} label="Services" active={view === "services"}
              badge={null}
              onClick={() => { setView("services"); setMobileOpen(false); }} />
            <NavBtn icon={<CalendarIcon />} label="Appointments" active={view === "appointments"}
              badge={null}
              onClick={() => { setView("appointments"); setMobileOpen(false); }} />
            <NavBtn icon={<GridCalIcon />} label="Calendar" active={view === "calendar"}
              badge={null}
              onClick={() => { setView("calendar"); setMobileOpen(false); }} />
            <NavBtn icon={<AnalyticsIcon />} label="Analytics" active={view === "analytics"}
              badge={null}
              onClick={() => { setView("analytics"); setMobileOpen(false); }} />
            <NavBtn icon={<BillingIcon />} label="Billing" active={view === "billing"}
              badge={null}
              onClick={() => { setView("billing"); setMobileOpen(false); }} />
            <NavBtn icon={<MessageIcon />} label="Messages" active={view === "messages"}
              badge={null}
              onClick={() => { setView("messages"); setMobileOpen(false); }} />
            <NavBtn icon={<AlertIcon />} label="Missed" active={view === "missed"}
              badge={null}
              onClick={() => { setView("missed"); setMobileOpen(false); }} />
            <NavBtn icon={<EmailIcon />} label="Send Email" active={view === "email"}
              badge={null}
              onClick={() => { setView("email"); setMobileOpen(false); }} />
            <NavBtn icon={<SettingsIcon />} label="Settings" active={view === "settings"}
              badge={null}
              onClick={() => { setView("settings"); setMobileOpen(false); }} />
          </nav>

          {/* User bar */}
          <UserBar user={user} />
        </aside>

        {/* ── Main ── */}
        <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", marginLeft: 0 }}
          className="lg:ml-[220px]">

          {/* Mobile topbar */}
          <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
            className="lg:hidden">
            <button className="btn-icon" onClick={() => setMobileOpen(true)}><MenuIcon /></button>
            <Logo />
          </header>

          {/* Email verification banner */}
          {user && !(user.email_verified === true || user.email_verified === 1) && (
            <VerificationBanner userId={user.id} />
          )}
          {/* Content */}
          <div style={{
            flex: 1,
            padding: view === "calendar" ? "20px" : "24px",
            maxWidth: view === "calendar" ? "none" : 900,
            width: "100%",
            margin: "0 auto",
            display: view === "calendar" ? "flex" : "block",
            flexDirection: "column",
            overflow: view === "calendar" ? "hidden" : "auto",
            height: view === "calendar" ? "0" : "auto",
          }}>
            {view === "chat"
              ? <ChatPanel faqs={faqs} user={user} />
              : view === "settings"
              ? <SettingsPanel user={user} />
              : view === "appointments"
              ? <AppointmentsPanel />
              : view === "calendar"
              ? <CalendarView />
              : view === "analytics"
              ? <AnalyticsDashboard />
              : view === "billing"
              ? <BillingPanel user={user} />
              : view === "services"
              ? <ServicesPanel />
              : view === "messages"
              ? <MessagesPanel />
              : view === "missed"
              ? <MissedPanel />
              : view === "email"
              ? <EmailPanel />
              : <FaqPanel faqs={faqs} setFaqs={setFaqs} onReload={loadFaqs} />
            }
          </div>
        </main>
      </div>
    </>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ faqs }) {
  const [messages, setMessages] = useState([
    { role: "bot", text: "👋 Hi! Ask me anything — I'll search your FAQ knowledge base for an answer.", score: null }
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [uiLang, setUiLang] = useState("en");
  const bottomRef = useRef(null);

  const PL_HINTS = ["cześć","chcę","zapisać","termin","rezerwacja","umówić","się","jak","gdzie"];
  function detectLangLocal(text) {
    const l = text.toLowerCase();
    return PL_HINTS.some(w => l.includes(w)) ? "pl" : "en";
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  async function send(e) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || typing) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setTyping(true);

    // Simulate natural bot thinking delay
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await r.json();
      setMessages(m => [...m, {
        role: "bot",
        text: d.answer,
        score: d.score,
        source: d.source,
        matched: d.matchedQuestion,
        lang: d.lang,
        type: d.type,
      }]);
    } catch {
      setMessages(m => [...m, { role: "bot", text: "⚠️ Network error. Please try again.", score: null }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Chat Bot Tester"
        subtitle={`${faqs.length} FAQ${faqs.length !== 1 ? "s" : ""} in knowledge base`}
      />

      {/* Chat window */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", overflow: "hidden",
      }}>
        {/* Messages */}
        <div style={{
          height: 420, overflowY: "auto", padding: "20px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {messages.map((m, i) => (
            <div key={i} className="fade-up" style={{ display: "flex", flexDirection: "column" }}>
              {m.role === "user"
                ? <div className="bubble-user">{m.text}</div>
                : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {/* Language + type badges */}
                    {(m.lang || m.type) && (
                      <div style={{ display: "flex", gap: 6, paddingLeft: 2 }}>
                        {m.lang && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: m.lang === "pl" ? "rgba(220,38,38,0.15)" : "rgba(59,130,246,0.15)", color: m.lang === "pl" ? "#f87171" : "#60a5fa", letterSpacing: "0.05em" }}>
                            {m.lang === "pl" ? "🇵🇱 PL" : "🇬🇧 EN"}
                          </span>
                        )}
                        {m.type === "booking" && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, background: "rgba(232,30,140,0.12)", color: "#e81e8c" }}>
                            📅 Booking
                          </span>
                        )}
                      </div>
                    )}
                    {/* Message bubble — render link if booking */}
                    {m.type === "booking"
                      ? <div className="bubble-bot" dangerouslySetInnerHTML={{ __html: m.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--orange);text-decoration:underline">$1</a>') }} />
                      : <div className="bubble-bot">{m.text}</div>
                    }
                    {m.score > 0 && m.type !== "booking" && <ScorePill score={m.score} source={m.source} matched={m.matched} />}
                  </div>
                )
              }
            </div>
          ))}
          {typing && (
            <div className="fade-up bubble-typing">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

        {/* Input */}
        <form onSubmit={send} style={{ display: "flex", gap: 10, padding: "14px 16px" }}>
          <input
            className="input"
            placeholder={faqs.length === 0 ? "Add some FAQs first…" : uiLang === "pl" ? "Zadaj pytanie…" : "Ask a question…"}
            value={input}
            disabled={typing || faqs.length === 0}
            onChange={e => { setInput(e.target.value); setUiLang(detectLangLocal(e.target.value)); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
            style={{ flex: 1 }}
            autoFocus
          />
          <button className="btn btn-orange" type="submit" disabled={typing || !input.trim()}>
            {typing ? <Spinner /> : <SendIcon />}
          </button>
        </form>
      </div>

      {/* Tips */}
      {faqs.length === 0 && (
        <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(255,122,0,0.06)", border: "1px solid rgba(255,122,0,0.2)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--text-muted)" }}>
          💡 Switch to <b>FAQ Manager</b> to add your first FAQ entry.
        </div>
      )}
      <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--text-dim)", display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span>🇵🇱 Polish auto-detected</span>
        
        <span>🤖 AI fallback when enabled</span>
      </div>
    </div>
  );
}

// ─── Score pill ───────────────────────────────────────────────────────────────
function ScorePill({ score, source, matched }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.5 ? "var(--orange)" : score >= 0.3 ? "#f0a500" : "var(--text-dim)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
      <div className="score-bar" style={{ width: 60 }}>
        <div className="score-fill" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "JetBrains Mono,monospace" }}>
        {pct}% {source === "ai" ? "· AI" : ""}
      </span>
      {matched && (
        <span style={{ fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>
          → {matched}
        </span>
      )}
    </div>
  );
}

// ─── FAQ Panel ────────────────────────────────────────────────────────────────
function FaqPanel({ faqs, setFaqs, onReload }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  function startEdit(faq) {
    setEditingId(faq.id);
    setForm({ question: faq.question, answer: faq.answer });
    setShowForm(true);
    setError("");
  }

  function cancelForm() {
    setShowForm(false); setEditingId(null);
    setForm({ question: "", answer: "" }); setError("");
  }

  async function saveForm(e) {
    e.preventDefault();
    if (!form.question.trim() || !form.answer.trim()) {
      setError("Both fields are required."); return;
    }
    setSaving(true); setError("");
    try {
      const url = editingId ? `/api/faqs/${editingId}` : "/api/faqs";
      const method = editingId ? "PUT" : "POST";
      const r = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) { const d = await r.json(); setError(d.error || "Error saving."); return; }
      await onReload();
      cancelForm();
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  }

  async function deleteFaq(id) {
    if (!confirm("Delete this FAQ?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/faqs/${id}`, { method: "DELETE" });
      setFaqs(f => f.filter(x => x.id !== id));
    } finally { setDeletingId(null); }
  }

  const filtered = faqs.filter(f =>
    !search || f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="FAQ Manager"
        subtitle={`${faqs.length} entr${faqs.length !== 1 ? "ies" : "y"}`}
        action={!showForm && (
          <button className="btn btn-orange btn-sm" onClick={() => { setShowForm(true); setEditingId(null); setForm({ question: "", answer: "" }); }}>
            <PlusIcon /> Add FAQ
          </button>
        )}
      />

      {/* Add / Edit form */}
      {showForm && (
        <div className="card fade-up" style={{ marginBottom: 20, borderTop: "2px solid var(--orange)" }}>
          <h3 style={{ fontFamily: "Syne,sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
            {editingId ? "Edit FAQ" : "New FAQ"}
          </h3>
          <form onSubmit={saveForm}>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Question</label>
              <input className="input" placeholder="e.g. How do I reset my password?" required
                value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label className="label">Answer</label>
              <textarea className="input" placeholder="Enter the answer…" required rows={3}
                value={form.answer} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} />
            </div>
            {error && <p style={{ fontSize: 13, color: "#f77", marginBottom: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-orange btn-sm" type="submit" disabled={saving}>
                {saving ? <Spinner /> : editingId ? "Save changes" : "Add FAQ"}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={cancelForm}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      {faqs.length > 4 && (
        <div style={{ marginBottom: 14 }}>
          <input className="input" placeholder="🔍  Search FAQs…" value={search}
            onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
        </div>
      )}

      {/* FAQ list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-dim)", fontSize: 14 }}>
          {faqs.length === 0
            ? <><div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>No FAQs yet. Add your first one!</>
            : "No FAQs match your search."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(faq => (
            <div key={faq.id} className="card fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 6, lineHeight: 1.4 }}>{faq.question}</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{faq.answer}</p>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(faq)}>Edit</button>
                <button className="btn btn-danger btn-sm" disabled={deletingId === faq.id}
                  onClick={() => deleteFaq(faq.id)}>
                  {deletingId === faq.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h2 style={{ fontFamily: "Syne,sans-serif", fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function NavBtn({ icon, label, active, badge, onClick }) {
  return (
    <button className={`nav-item ${active ? "active" : ""}`} onClick={onClick}>
      <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{ fontSize: 10, fontFamily: "JetBrains Mono,monospace", color: active ? "var(--orange)" : "var(--text-dim)", background: active ? "rgba(255,122,0,0.12)" : "var(--surface-2)", padding: "1px 6px", borderRadius: 10 }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function UserBar({ user }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  const plan = user?.plan || "free";
  return (
    <div style={{ padding: "14px 12px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
          {user?.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</div>
          <span className={`badge badge-${plan}`}>{plan}</span>
        </div>
      </div>
      <button className="btn btn-ghost" style={{ fontSize: 12, padding: "7px", width: "100%", justifyContent: "center" }} onClick={logout}>
        Sign out
      </button>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff" />
        </svg>
      </div>
      <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
        Reply<span style={{ color: "var(--orange)" }}>AI</span>
      </span>
    </div>
  );
}

function FullLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--orange)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="17" height="17" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff" /></svg>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="typing-dot" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChatIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const ListIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const MenuIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const SendIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const SettingsIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const CalendarIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const GridCalIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9M15 21V9"/></svg>;
const ServicesIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const AnalyticsIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const BillingIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const MessageIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const AlertIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const EmailIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;

// ── Lang badges ───────────────────────────────────────────────────────────────
const LANG_BADGE = {
  en: { flag: "🇬🇧", label: "EN", color: "#3b82f6" },
  pl: { flag: "🇵🇱", label: "PL", color: "#ef4444" },
  pt: { flag: "🇧🇷", label: "PT", color: "#22c55e" },
};

// ── Appointments Panel ────────────────────────────────────────────────────────

// ─── Planner / Appointments Panel ─────────────────────────────────────────────
function AppointmentsPanel() {
  const [tab, setTab]                   = useState("planner"); // "planner" | "booked"
  const [slots, setSlots]               = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [newDate, setNewDate]           = useState("");
  const [newStart, setNewStart]         = useState("09:00");
  const [newEnd, setNewEnd]             = useState("17:00");
  const [adding, setAdding]             = useState(false);
  const [deleting, setDeleting]         = useState(null);
  const [error, setError]               = useState(null);
  const [success, setSuccess]           = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [slotsR, apptR] = await Promise.all([
        fetch("/api/availability").then(r => r.json()),
        fetch("/api/appointments").then(r => r.json()),
      ]);
      setSlots(Array.isArray(slotsR) ? slotsR : []);
      setAppointments(Array.isArray(apptR) ? apptR : []);
    } catch { setSlots([]); setAppointments([]); }
    finally { setLoading(false); }
  }

  async function addSlot() {
    setError(null); setSuccess(null);
    if (!newDate) { setError("Please pick a date."); return; }
    // Validate not in past
    if (newDate < new Date().toISOString().slice(0, 10)) {
      setError("Cannot add past dates."); return;
    }
    setAdding(true);
    try {
      if (newStart >= newEnd) { setError("End time must be after start time."); return; }
    const r = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, start_time: newStart, end_time: newEnd, is_available: true }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Failed."); return; }
      setNewDate("");
      setSuccess("Slot added ✅");
      await loadAll();
    } catch { setError("Network error."); }
    finally { setAdding(false); }
  }

  async function toggleSlot(slot) {
    try {
      await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: slot.date, is_available: !slot.is_available }),
      });
      await loadAll();
    } catch { setError("Failed to update slot."); }
  }

  async function deleteSlot(id) {
    setDeleting(id);
    try {
      await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
      setSlots(s => s.filter(x => x.id !== id));
    } catch { setError("Failed to delete slot."); }
    finally { setDeleting(null); }
  }

  async function deleteAppt(id) {
    setDeleting(id);
    try {
      await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });
      setAppointments(a => a.filter(x => x.id !== id));
      await loadAll(); // refresh slots (availability restored)
    } catch { setError("Failed to delete appointment."); }
    finally { setDeleting(null); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const freeSlots   = slots.filter(s => s.is_available);
  const busySlots   = slots.filter(s => !s.is_available);

  return (
    <div>
      <PageHeader title="Planner" subtitle="Manage your availability and bookings" />

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatCard label="Open Slots" value={freeSlots.length} color="#22c55e" />
        <StatCard label="Busy Slots" value={busySlots.length} color="#ef4444" />
        <StatCard label="Bookings" value={appointments.length} color="var(--orange)" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["planner","📅 Availability"],["booked","👥 Booked"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              background: tab === id ? "var(--orange)" : "transparent",
              borderColor: tab === id ? "var(--orange)" : "var(--border)",
              color: tab === id ? "#fff" : "var(--text-muted)",
            }}>{label}</button>
        ))}
      </div>

      {/* Feedback */}
      {error   && <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 13, color: "#ef4444" }}>{error}</div>}
      {success && <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", fontSize: 13, color: "#22c55e" }}>{success}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}><Spinner /></div>
      ) : tab === "planner" ? (
        // ── Availability planner ──────────────────────────────────────────────
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Add slot form */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 14 }}>➕ Add Available Date</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="date"
                className="input"
                style={{ width: "auto", flex: "1 1 160px", minWidth: 160 }}
                value={newDate}
                min={today}
                onChange={e => { setNewDate(e.target.value); setError(null); setSuccess(null); }}
              />
              <button
                className="btn btn-primary"
                onClick={addSlot}
                disabled={adding || !newDate}
                style={{ flexShrink: 0 }}
              >
                {adding ? "Adding…" : "Add Slot"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              Add dates when you are available. Clients can only book these dates.
            </div>
          </div>

          {/* Slot list */}
          {slots.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 600 }}>No availability set</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Add dates above to open your calendar.</div>
            </div>
          ) : (
            <div className="card" style={{ overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Date","Status","Bookings","Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, i) => {
                    const isPast = slot.date < today;
                    return (
                      <tr key={slot.id}
                        style={{ borderBottom: i < slots.length - 1 ? "1px solid var(--border)" : "none", opacity: isPast ? 0.55 : 1 }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}>
                        <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                          <div>{slot.date}{isPast && <span style={{ marginLeft: 8, fontSize: 10, color: "#555", fontWeight: 400 }}>past</span>}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", marginTop: 2 }}>{slot.start_time || "09:00"}–{slot.end_time || "17:00"}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            onClick={() => !isPast && toggleSlot(slot)}
                            style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid", fontSize: 12, fontWeight: 700, cursor: isPast ? "default" : "pointer", transition: "all 0.15s",
                              background: slot.is_available ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                              borderColor: slot.is_available ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)",
                              color: slot.is_available ? "#22c55e" : "#ef4444",
                            }}>
                            {slot.is_available ? "✅ Free" : "🔴 Busy"}
                          </button>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>
                          {slot.bookings > 0
                            ? <span style={{ fontWeight: 600, color: "var(--orange)" }}>{slot.bookings} booking{slot.bookings !== 1 ? "s" : ""}</span>
                            : <span style={{ color: "var(--text-dim)" }}>none</span>
                          }
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            onClick={() => deleteSlot(slot.id)}
                            disabled={deleting === slot.id}
                            style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 15, padding: "2px 6px", borderRadius: 4 }}
                            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                            onMouseLeave={e => e.currentTarget.style.color = "#555"}
                            title="Remove slot">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // ── Booked appointments ───────────────────────────────────────────────
        appointments.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
            <div style={{ fontWeight: 600 }}>No bookings yet</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Bookings from chat and WhatsApp appear here.</div>
          </div>
        ) : (
          <div className="card" style={{ overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Name","Date","Phone","Lang","Source","Created",""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map((a, i) => {
                  const b = LANG_BADGE[a.language] || { flag: "🌐", label: (a.language || "?").toUpperCase(), color: "#888" };
                  return (
                    <tr key={a.id} style={{ borderBottom: i < appointments.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{a.client_name || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        {a.service_name ? (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${a.service_color || "#ff7a00"}22`, color: a.service_color || "#ff7a00" }}>{a.service_name}</span>
                        ) : <span style={{ fontSize: 12, color: "var(--text-dim)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--orange)", fontWeight: 700 }}>{a.date || "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{a.start_time || "—"}{a.end_time ? `–${a.end_time}` : ""}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-muted)" }}>{a.phone || "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-dim)", textTransform: "capitalize" }}>{a.source || "web"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-dim)" }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => deleteAppt(a.id)} disabled={deleting === a.id}
                          style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 16, padding: "2px 6px", borderRadius: 4 }}
                          onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                          onMouseLeave={e => e.currentTarget.style.color = "#666"}
                          title="Cancel booking">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 4, minWidth: 90 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ user }) {
  const [tab, setTab]             = useState("profile");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState(null);

  // Profile fields
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");

  // Password fields
  const [curPwd, setCurPwd]       = useState("");
  const [newPwd, setNewPwd]       = useState("");
  const [confPwd, setConfPwd]     = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        setName(d.name || "");
        setEmail(d.email || "");
        setAvatarUrl(d.avatar_url || "");
        setWaPhoneId(d.whatsapp_phone_id || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function feedback(ok, text) { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000); }

  async function saveProfile() {
    if (!name.trim()) { feedback(false, "Name is required."); return; }
    setSaving(true);
    const r = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, whatsapp_phone_id: waPhoneId }),
    });
    const d = await r.json();
    feedback(r.ok, d.ok ? "✅ Profile saved!" : d.error || "Failed.");
    setSaving(false);
  }

  async function savePassword() {
    if (!curPwd) { feedback(false, "Enter your current password."); return; }
    if (!newPwd || newPwd.length < 8) { feedback(false, "New password must be at least 8 characters."); return; }
    if (newPwd !== confPwd) { feedback(false, "Passwords do not match."); return; }
    setSaving(true);
    const r = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: curPwd, new_password: newPwd }),
    });
    const d = await r.json();
    if (r.ok) { setCurPwd(""); setNewPwd(""); setConfPwd(""); }
    feedback(r.ok, d.ok ? "✅ Password changed!" : d.error || "Failed.");
    setSaving(false);
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>;

  const tabs = [["profile","👤 Profile"],["security","🔒 Security"],["integrations","🔗 Integrations"]];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your account and integrations" />
      <div style={{ maxWidth: 580 }}>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => { setTab(id); setMsg(null); }}
              style={{ padding: "8px 16px", borderRadius: "8px 8px 0 0", border: "1px solid", borderBottom: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", marginBottom: -1,
                background: tab === id ? "var(--surface)" : "transparent",
                borderColor: tab === id ? "var(--border)" : "transparent",
                color: tab === id ? "var(--text)" : "var(--text-muted)",
              }}>{label}</button>
          ))}
        </div>

        {/* ── Profile tab ── */}
        {tab === "profile" && (
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Display Name">
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </Field>
            <Field label="Email" hint="Changing email requires re-verification">
              <input className="input" value={email} disabled style={{ opacity: 0.5, cursor: "not-allowed" }} />
            </Field>
            <Field label="Avatar URL" hint="Optional: https link to your profile image">
              <input className="input" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
              {avatarUrl && <img src={avatarUrl} alt="" onError={e => e.target.style.display="none"} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--border)", marginTop: 8 }} />}
            </Field>
            {msg && <Feedback msg={msg} />}
            <button className="btn btn-orange" style={{ alignSelf: "flex-start" }} onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : "Save Profile"}</button>
          </div>
        )}

        {/* ── Security tab ── */}
        {tab === "security" && (
          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 4 }}>Change Password</div>
            <Field label="Current Password">
              <input className="input" type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} autoComplete="current-password" />
            </Field>
            <Field label="New Password" hint="Minimum 8 characters">
              <input className="input" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} autoComplete="new-password" />
            </Field>
            <Field label="Confirm New Password">
              <input className="input" type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} autoComplete="new-password" />
            </Field>
            {msg && <Feedback msg={msg} />}
            <button className="btn btn-orange" style={{ alignSelf: "flex-start" }} onClick={savePassword} disabled={saving}>{saving ? "Saving…" : "Change Password"}</button>
          </div>
        )}

        {/* ── Integrations tab ── */}
        {tab === "integrations" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* WhatsApp */}
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>📱 WhatsApp Business API</div>
              <Field label="Phone Number ID" hint="From Meta Developer Console → WhatsApp → API Setup">
                <input className="input" value={waPhoneId} onChange={e => setWaPhoneId(e.target.value)} placeholder="e.g. 123456789012345" />
              </Field>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Webhook URL to set in Meta console:
                <code style={{ display: "block", marginTop: 6, background: "var(--surface-2)", padding: "6px 10px", borderRadius: 6, fontSize: 11, color: "var(--orange)" }}>
                  {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}/api/whatsapp/webhook
                </code>
              </div>
              {msg && <Feedback msg={msg} />}
              <button className="btn btn-orange" style={{ alignSelf: "flex-start" }} onClick={saveProfile} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>

            {/* Embed + Public Links */}
            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>🧩 Embed Widget</div>
              <pre style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "var(--text)", overflowX: "auto", margin: 0, whiteSpace: "pre-wrap" }}>
{`<script src="https://yourdomain.com/widget.js" data-user-id="${user?.id || "YOUR_ID"}"></script>`}
              </pre>
            </div>

            <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>🔗 Public Links</div>
              {[["Chat", `/chat/${user?.id}`], ["Booking Form", `/booking?userId=${user?.id}`]].map(([label, url]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 90 }}>{label}</span>
                  <code style={{ fontSize: 12, color: "var(--orange)", background: "var(--surface-2)", padding: "4px 8px", borderRadius: 6, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</code>
                  <button onClick={() => navigator.clipboard?.writeText(url)}
                    style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, padding: "3px 8px", borderRadius: 6, cursor: "pointer" }}>Copy</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{hint}</span>}
    </div>
  );
}

function Feedback({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      background: msg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
      border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
      color: msg.ok ? "#22c55e" : "#ef4444" }}>
      {msg.text}
    </div>
  );
}



// ─── Email Panel ──────────────────────────────────────────────────────────────
function EmailPanel() {
  const [to, setTo]           = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null); // { ok, text }

  const MAX_MSG = 2000;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate() {
    if (!to.trim()) return "Email address is required.";
    if (!EMAIL_RE.test(to.trim())) return "Please enter a valid email address.";
    if (!message.trim()) return "Message cannot be empty.";
    if (message.length > MAX_MSG) return `Message too long (max ${MAX_MSG} chars).`;
    return null;
  }

  async function send() {
    const err = validate();
    if (err) { setResult({ ok: false, text: err }); return; }

    setSending(true);
    setResult(null);

    try {
      const r = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), message: message.trim() }),
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setResult({ ok: true, text: "✅ Email sent successfully!" });
        setTo("");
        setMessage("");
      } else {
        setResult({ ok: false, text: d.error || "Failed to send email." });
      }
    } catch {
      setResult({ ok: false, text: "Network error. Please try again." });
    } finally {
      setSending(false);
    }
  }

  const charsLeft = MAX_MSG - message.length;

  return (
    <div>
      <PageHeader
        title="Send Email"
        subtitle="Test your email configuration or send a message to a client"
      />

      <div style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Config notice */}
        <div style={{ padding: "12px 16px", background: "rgba(255,122,0,0.06)", border: "1px solid rgba(255,122,0,0.2)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--orange)" }}>Setup required:</strong> Set <code style={{ background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>EMAIL_USER</code> and <code style={{ background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>EMAIL_PASS</code> in your environment variables to enable sending.
          <div style={{ marginTop: 6, fontSize: 12 }}>💡 For Gmail, use an <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" style={{ color: "var(--orange)" }}>App Password</a> (not your regular password).</div>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* To field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Recipient Email
            </label>
            <input
              className="input"
              type="email"
              placeholder="client@example.com"
              value={to}
              onChange={e => { setTo(e.target.value); setResult(null); }}
              disabled={sending}
              autoComplete="email"
            />
          </div>

          {/* Message field */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Message
              </label>
              <span style={{ fontSize: 11, color: charsLeft < 100 ? "#ef4444" : "var(--text-dim)" }}>
                {charsLeft} / {MAX_MSG}
              </span>
            </div>
            <textarea
              className="input"
              rows={7}
              placeholder="Type your message here…"
              value={message}
              onChange={e => { setMessage(e.target.value); setResult(null); }}
              disabled={sending}
              style={{ resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
              maxLength={MAX_MSG}
            />
          </div>

          {/* Result banner */}
          {result && (
            <div style={{
              padding: "12px 16px",
              borderRadius: 8,
              background: result.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${result.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              fontSize: 13,
              color: result.ok ? "#22c55e" : "#ef4444",
              fontWeight: 500,
            }}>
              {result.text}
            </div>
          )}

          {/* Send button */}
          <button
            className="btn btn-primary"
            onClick={send}
            disabled={sending || !to.trim() || !message.trim()}
            style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start", minWidth: 120, justifyContent: "center" }}
          >
            {sending ? (
              <>
                <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                Sending…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                Send Email
              </>
            )}
          </button>
        </div>

        {/* Tips */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 12 }}>📋 Gmail Setup Steps</div>
          {[
            "Go to your Google Account → Security → 2-Step Verification (enable it first)",
            "Then go to Security → App Passwords",
            'Select "Mail" and your device, click Generate',
            "Copy the 16-character password into EMAIL_PASS",
            "Set EMAIL_USER to your full Gmail address",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--orange)", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Messages Panel ───────────────────────────────────────────────────────────
function MessagesPanel() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [filter, setFilter]    = useState("all"); // all | incoming | outgoing

  useEffect(() => { loadMessages(); }, [filter]);

  async function loadMessages() {
    setLoading(true);
    try {
      const q = filter !== "all" ? `?type=${filter}` : "";
      const r = await fetch(`/api/messages${q}`);
      const d = await r.json();
      setMessages(Array.isArray(d) ? d : []);
    } catch { setMessages([]); }
    finally { setLoading(false); }
  }

  const INTENT_COLOR = {
    greeting: "#22c55e",
    booking:  "#ff7a00",
    cancel:   "#ef4444",
    faq:      "#3b82f6",
    unknown:  "#555",
    spam:     "#991b1b",
  };

  return (
    <div>
      <PageHeader title="Messages Log" subtitle="Every incoming and outgoing message" />

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <StatCard label="Total" value={messages.length} color="var(--orange)" />
        <StatCard label="Incoming" value={messages.filter(m => m.type === "incoming").length} color="#3b82f6" />
        <StatCard label="Outgoing" value={messages.filter(m => m.type === "outgoing").length} color="#22c55e" />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["all", "incoming", "outgoing"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? "btn-orange" : "btn-ghost"}`}
            style={{ textTransform: "capitalize", fontSize: 12 }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spinner /></div>
      ) : messages.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600 }}>No messages yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Messages from chat and WhatsApp appear here.</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Type", "Text", "Intent", "Lang", "Source", "Time"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {messages.map((m, i) => {
                const b = LANG_BADGE[m.language] || { flag: "🌐", label: (m.language || "?").toUpperCase(), color: "#888" };
                const intentColor = INTENT_COLOR[m.intent] || "#555";
                return (
                  <tr key={m.id} style={{ borderBottom: i < messages.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                        background: m.type === "incoming" ? "rgba(59,130,246,0.12)" : "rgba(34,197,94,0.12)",
                        color: m.type === "incoming" ? "#3b82f6" : "#22c55e" }}>
                        {m.type === "incoming" ? "↓ IN" : "↑ OUT"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--text)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.text || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                        background: `${intentColor}22`, color: intentColor }}>
                        {m.intent || "—"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                        background: `${b.color}22`, color: b.color }}>
                        {b.flag} {b.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-dim)", textTransform: "capitalize" }}>{m.source || "web"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-dim)", whiteSpace: "nowrap" }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Missed Messages Panel ────────────────────────────────────────────────────
function MissedPanel() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/missed");
      const d = await r.json();
      setItems(Array.isArray(d) ? d : []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }

  async function remove(id) {
    setDeleting(id);
    try {
      await fetch(`/api/missed?id=${id}`, { method: "DELETE" });
      setItems(prev => prev.filter(x => x.id !== id));
    } finally { setDeleting(null); }
  }

  return (
    <div>
      <PageHeader
        title="Missed Messages"
        subtitle="Questions your bot couldn't answer — review and add as FAQs"
      />

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}><Spinner /></div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <div style={{ fontWeight: 600 }}>No missed messages!</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Every question got an answer. Add more FAQs to improve coverage.</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(255,122,0,0.06)", border: "1px solid rgba(255,122,0,0.2)", borderRadius: 8, fontSize: 13, color: "var(--text-muted)" }}>
            💡 <strong>{items.length}</strong> unanswered question{items.length !== 1 ? "s" : ""} — consider adding these to your FAQ Manager.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map(item => {
              const b = LANG_BADGE[item.language] || { flag: "🌐", label: (item.language || "?").toUpperCase(), color: "#888" };
              return (
                <div key={item.id} className="card fade-up" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, borderLeft: "3px solid var(--orange)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: `${b.color}22`, color: b.color }}>{b.flag} {b.label}</span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "capitalize" }}>{item.source || "web"}</span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)" }}>{item.created_at ? new Date(item.created_at).toLocaleString() : ""}</span>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{item.text}</p>
                  </div>
                  <button onClick={() => remove(item.id)} disabled={deleting === item.id}
                    style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16, padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                    onMouseLeave={e => e.currentTarget.style.color = "#555"}
                    title="Dismiss">✕</button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Email Verification Banner ────────────────────────────────────────────────
function VerificationBanner() {
  const [sent, setSent]   = useState(false);
  const [code, setCode]   = useState("");
  const [step, setStep]   = useState("banner"); // "banner" | "verify"
  const [msg, setMsg]     = useState(null);
  const [busy, setBusy]   = useState(false);

  async function resend() {
    setBusy(true);
    const r = await fetch("/api/auth/resend-verification", { method: "POST" });
    const d = await r.json();
    setSent(true); setStep("verify");
    setMsg({ ok: r.ok, text: d.message || d.error });
    setBusy(false);
  }

  async function verify() {
    if (!/^\d{6}$/.test(code.trim())) { setMsg({ ok: false, text: "Enter the 6-digit code." }); return; }
    setBusy(true);
    const r = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const d = await r.json();
    if (r.ok) { window.location.reload(); return; }
    setMsg({ ok: false, text: d.error || "Invalid code." });
    setBusy(false);
  }

  return (
    <div style={{ background: "rgba(255,122,0,0.08)", borderBottom: "1px solid rgba(255,122,0,0.25)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 14, color: "var(--text)" }}>
        📧 <strong>Verify your email</strong> to unlock all features.
      </span>
      {step === "banner" ? (
        <button onClick={resend} disabled={busy}
          style={{ padding: "5px 14px", borderRadius: 6, background: "var(--orange)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {busy ? "Sending…" : "Send code"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="6-digit code"
            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)", fontSize: 13, width: 130, fontFamily: "monospace", letterSpacing: 2 }}
            maxLength={6} />
          <button onClick={verify} disabled={busy}
            style={{ padding: "5px 14px", borderRadius: 6, background: "var(--orange)", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {busy ? "Verifying…" : "Verify"}
          </button>
          <button onClick={resend} disabled={busy}
            style={{ padding: "5px 10px", borderRadius: 6, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: 12, cursor: "pointer" }}>
            Resend
          </button>
        </div>
      )}
      {msg && <span style={{ fontSize: 12, color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.text}</span>}
    </div>
  );
}

// ─── Services Panel ───────────────────────────────────────────────────────────
function ServicesPanel() {
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({ name: "", price: "", duration: "60" });
  const [editing,  setEditing]  = useState(null); // service id being edited
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/services");
      setServices(r.ok ? await r.json() : []);
    } finally { setLoading(false); }
  }

  async function save() {
    setError(null); setSuccess(null);
    if (!form.name.trim()) { setError("Service name is required."); return; }
    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) < 0) { setError("Enter a valid price."); return; }
    if (isNaN(parseInt(form.duration)) || parseInt(form.duration) < 5) { setError("Duration must be at least 5 minutes."); return; }

    setSaving(true);
    const isNew = !editing;
    const url   = isNew ? "/api/services" : `/api/services/${editing}`;
    const method = isNew ? "POST" : "PUT";

    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name.trim(), price: parseFloat(form.price), duration: parseInt(form.duration), color: form.color }),
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Failed."); setSaving(false); return; }

    setSuccess(isNew ? "Service created ✅" : "Service updated ✅");
    setForm({ name: "", price: "", duration: "60", color: "#ff7a00" });
    setEditing(null);
    await load();
    setSaving(false);
  }

  async function startEdit(svc) {
    setEditing(svc.id);
    setForm({ name: svc.name, price: String(svc.price), duration: String(svc.duration), color: svc.color || "#ff7a00" });
    setError(null); setSuccess(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ name: "", price: "", duration: "60" });
    setError(null); setSuccess(null);
  }

  async function remove(id) {
    setDeleting(id);
    await fetch(`/api/services/${id}`, { method: "DELETE" });
    setServices(s => s.filter(x => x.id !== id));
    setDeleting(null);
  }

  return (
    <div>
      <PageHeader title="Services" subtitle="Manage the services you offer to clients" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── Form ── */}
        <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>
            {editing ? "✏️ Edit Service" : "➕ New Service"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label className="label">Service Name</label>
            <input className="input" placeholder="e.g. Haircut, Consultation…"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label">Price ($)</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label">Duration (min)</label>
              <input className="input" type="number" min="5" max="480" placeholder="60"
                value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label className="label">Color</label>
              <input type="color" value={form.color || "#ff7a00"}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                style={{ width: 44, height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: 2, background: "var(--surface-2)", cursor: "pointer" }} />
            </div>
          </div>

          {error   && <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 13 }}>{error}</div>}
          {success && <div style={{ padding: "8px 12px", borderRadius: 7, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontSize: 13 }}>{success}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-orange" onClick={save} disabled={saving} style={{ flex: 1, justifyContent: "center" }}>
              {saving ? "Saving…" : editing ? "Update" : "Create Service"}
            </button>
            {editing && (
              <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
            )}
          </div>
        </div>

        {/* ── List ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading…</div>
          ) : services.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🛠️</div>
              <div style={{ fontWeight: 600 }}>No services yet</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Create your first service on the left.</div>
            </div>
          ) : services.map(svc => (
            <div key={svc.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: svc.color || "#ff7a00", display: "inline-block", flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{svc.name}</span>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ color: "#22c55e", fontWeight: 700 }}>${parseFloat(svc.price).toFixed(2)}</span>
                  <span>⏱ {svc.duration} min</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => startEdit(svc)}
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.color = "var(--orange)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                  Edit
                </button>
                <button onClick={() => remove(svc.id)} disabled={deleting === svc.id}
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#ef4444", fontSize: 12, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.06)"}>
                  {deleting === svc.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BILLING PANEL ────────────────────────────────────────────────────────────
function BillingPanel({ user }) {
  const [loading, setLoading] = useState(false);
  const plan = user?.plan || "free";
  const isPaid = plan !== "free";

  async function openPortal() {
    setLoading(true);
    try {
      const r = await fetch("/api/stripe/portal", { method: "POST" });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else alert(d.error || "Could not open billing portal.");
    } catch { alert("Network error."); }
    finally { setLoading(false); }
  }

  const planColors = { free: "#666", pro: "#ff7a00", business: "#ffd700" };
  const planColor  = planColors[plan] || "#666";

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: "var(--text)", margin: "0 0 4px" }}>Billing</h1>
        <p style={{ color: "var(--text-dim)", fontSize: 13, margin: 0 }}>Manage your subscription and payment details.</p>
      </div>

      {/* Current plan card */}
      <div style={{ padding: "24px", borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 6px" }}>Current plan</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: "var(--text)", textTransform: "capitalize" }}>{plan}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, textTransform: "uppercase", letterSpacing: ".07em",
                background: `${planColor}18`, color: planColor, border: `1px solid ${planColor}33` }}>
                {isPaid ? "Active" : "Free"}
              </span>
            </div>
          </div>
          {isPaid ? (
            <button onClick={openPortal} disabled={loading}
              style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontWeight: 600, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .6 : 1, transition: "all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--orange)"; e.currentTarget.style.color = "var(--orange)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
              {loading ? "Opening…" : "Manage billing →"}
            </button>
          ) : (
            <a href="/pricing" style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "var(--orange)", color: "#000", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "0 0 14px rgba(255,122,0,.3)", transition: "box-shadow .15s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 24px rgba(255,122,0,.5)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(255,122,0,.3)"}>
              Upgrade plan →
            </a>
          )}
        </div>

        {isPaid && (
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0 }}>
            You can cancel, change plans, or update payment details in the Stripe billing portal.
          </p>
        )}
        {!isPaid && (
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0 }}>
            Free plan includes 15 FAQs, 3 services, and 30 bookings/month. <a href="/pricing" style={{ color: "var(--orange)" }}>See all plans</a>
          </p>
        )}
      </div>

      {/* Plan comparison link */}
      <div style={{ padding: "16px 20px", borderRadius: 10, background: "rgba(255,122,0,.05)", border: "1px solid rgba(255,122,0,.12)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--orange)", margin: "0 0 2px" }}>Compare all plans</p>
          <p style={{ fontSize: 12, color: "var(--text-dim)", margin: 0 }}>Pro ($19/mo) and Business ($49/mo) plans unlock more bookings, AI responses, and team features.</p>
        </div>
        <a href="/pricing" style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 7, background: "transparent", border: "1px solid rgba(255,122,0,.3)", color: "var(--orange)", fontWeight: 700, fontSize: 12, textDecoration: "none", whiteSpace: "nowrap", transition: "background .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,122,0,.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          View pricing →
        </a>
      </div>
    </div>
  );
}
