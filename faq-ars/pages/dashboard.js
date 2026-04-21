// pages/dashboard.js
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

// ── helpers ─────────────────────────────────────────────────────────────────
function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) { router.replace("/login"); return; }
        setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, loading } = useUser();
  const [faqs, setFaqs] = useState([]);
  const [activeTab, setActiveTab] = useState("faqs"); // "faqs" | "test"
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) fetchFaqs();
  }, [user]);

  async function fetchFaqs() {
    const res = await fetch("/api/faqs");
    if (res.ok) setFaqs(await res.json());
  }

  if (loading) return <Loader />;

  return (
    <>
      <Head><title>Dashboard — ReplyAI</title></Head>
      <div className="min-h-screen flex bg-[#0a0b0f]">
        {/* Sidebar overlay (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar
          user={user}
          activeTab={activeTab}
          setActiveTab={(t) => { setActiveTab(t); setSidebarOpen(false); }}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-screen lg:ml-64">
          {/* Top bar */}
          <header className="flex items-center justify-between px-6 py-4 border-b border-[#2a2d3e] bg-[#0f1117]">
            <button
              className="lg:hidden text-[#7c82a8] hover:text-white transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <MenuIcon />
            </button>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs text-[#4a4f6a] font-mono hidden sm:block">
                {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} indexed
              </span>
              <div className="w-px h-4 bg-[#2a2d3e]" />
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-[#0a0b0f] font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            </div>
          </header>

          {/* Content area */}
          <div className="flex-1 p-6 lg:p-8">
            {activeTab === "faqs" && (
              <FAQSection faqs={faqs} onRefresh={fetchFaqs} />
            )}
            {activeTab === "test" && (
              <TestSection faqs={faqs} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, activeTab, setActiveTab, open, onClose }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full w-64 bg-[#0f1117] border-r border-[#2a2d3e]
        flex flex-col z-30 transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#2a2d3e]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 3h12v7H9l-3 3V10H2V3z" fill="#0a0b0f" />
            </svg>
          </div>
          <span className="font-display font-bold text-white text-lg">ReplyAI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <NavItem
          icon={<FAQIcon />}
          label="FAQ Manager"
          active={activeTab === "faqs"}
          onClick={() => setActiveTab("faqs")}
        />
        <NavItem
          icon={<BotIcon />}
          label="Test Bot"
          active={activeTab === "test"}
          onClick={() => setActiveTab("test")}
        />
      </nav>

      {/* User / Logout */}
      <div className="p-4 border-t border-[#2a2d3e]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-[#0a0b0f] font-bold text-xs flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name || "User"}</div>
            <div className="text-xs text-[#4a4f6a] truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-[#4a4f6a] hover:text-red-400 transition-colors py-2 flex items-center gap-2"
        >
          <LogoutIcon /> Sign out
        </button>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
        ${active
          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          : "text-[#7c82a8] hover:text-white hover:bg-[#161820]"
        }
      `}
    >
      <span className={active ? "text-amber-400" : "text-[#4a4f6a]"}>{icon}</span>
      {label}
    </button>
  );
}

// ── FAQ Section ──────────────────────────────────────────────────────────────
function FAQSection({ faqs, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editFaq, setEditFaq] = useState(null);

  function handleEdit(faq) {
    setEditFaq(faq);
    setShowForm(true);
  }

  function handleClose() {
    setShowForm(false);
    setEditFaq(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-xl font-bold text-white">FAQ Manager</h1>
          <p className="text-[#7c82a8] text-sm mt-1">
            Add questions and answers your customers keep asking.
          </p>
        </div>
        <button
          onClick={() => { setEditFaq(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b0f] font-semibold text-sm transition-all glow-amber-sm hover:glow-amber"
        >
          <span className="text-lg leading-none">+</span> Add FAQ
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <FAQForm
          faq={editFaq}
          onSuccess={() => { handleClose(); onRefresh(); }}
          onCancel={handleClose}
        />
      )}

      {/* FAQ List */}
      {faqs.length === 0 ? (
        <EmptyState onAdd={() => setShowForm(true)} />
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQCard
              key={faq.id}
              faq={faq}
              index={i}
              onEdit={() => handleEdit(faq)}
              onDelete={async () => {
                await fetch(`/api/faqs/${faq.id}`, { method: "DELETE" });
                onRefresh();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── FAQ Form ─────────────────────────────────────────────────────────────────
function FAQForm({ faq, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    question: faq?.question || "",
    answer: faq?.answer || "",
    keywords: faq?.keywords || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.question.trim() || !form.answer.trim()) {
      setError("Question and answer are required.");
      return;
    }
    setLoading(true);
    try {
      const url = faq ? `/api/faqs/${faq.id}` : "/api/faqs";
      const method = faq ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save FAQ.");
        return;
      }
      onSuccess();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 p-5 rounded-xl bg-[#161820] border border-[#2a2d3e] animate-fade-up">
      <h3 className="font-display font-semibold text-white text-sm mb-4">
        {faq ? "Edit FAQ" : "New FAQ Entry"}
      </h3>
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-[#7c82a8] mb-1.5 uppercase tracking-wider">Question</label>
          <input
            className="input-field"
            placeholder="e.g. What is your refund policy?"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs text-[#7c82a8] mb-1.5 uppercase tracking-wider">Answer</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="e.g. We offer full refunds within 30 days…"
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs text-[#7c82a8] mb-1.5 uppercase tracking-wider">
            Extra keywords <span className="text-[#4a4f6a] normal-case">(optional, improves matching)</span>
          </label>
          <input
            className="input-field"
            placeholder="e.g. refund return money back cancel"
            value={form.keywords}
            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b0f] font-semibold text-sm transition-all disabled:opacity-50"
          >
            {loading ? "Saving…" : faq ? "Update FAQ" : "Create FAQ"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[#7c82a8] hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── FAQ Card ─────────────────────────────────────────────────────────────────
function FAQCard({ faq, index, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const delay = `${index * 0.05}s`;

  return (
    <div
      className="animate-fade-up rounded-xl bg-[#0f1117] border border-[#2a2d3e] hover:border-[#3a3d52] transition-all duration-200"
      style={{ animationDelay: delay, opacity: 0 }}
    >
      <button
        className="w-full flex items-start justify-between p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xs font-mono text-amber-500 mt-0.5 flex-shrink-0">
            #{String(faq.id).padStart(3, "0")}
          </span>
          <span className="text-sm text-white font-medium truncate">{faq.question}</span>
        </div>
        <ChevronIcon open={expanded} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 animate-fade-up" style={{ opacity: 0 }}>
          <div className="ml-7 space-y-3">
            <p className="text-sm text-[#9ca3c0] leading-relaxed">{faq.answer}</p>
            {faq.keywords && (
              <div className="flex flex-wrap gap-1.5">
                {faq.keywords.split(" ").filter(Boolean).map((kw) => (
                  <span key={kw} className="px-2 py-0.5 rounded-full bg-[#1e2130] text-[#4a4f6a] text-xs font-mono">
                    {kw}
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onEdit}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
              >
                <EditIcon /> Edit
              </button>
              {confirmDelete ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-[#7c82a8]">Sure?</span>
                  <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300 transition-colors">Yes, delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#4a4f6a] hover:text-white transition-colors">No</button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-[#4a4f6a] hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <TrashIcon /> Delete
                </button>
              )}
              <span className="text-xs text-[#2a2d3e] ml-auto font-mono">
                {new Date(faq.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Test Section ─────────────────────────────────────────────────────────────
function TestSection({ faqs }) {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm your FAQ bot. Ask me anything your customers might ask.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleAsk(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;

    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: data.answer || "I couldn't find an answer for that.",
          score: data.score,
          matched: data.matchedQuestion,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: "Error — please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-xl font-bold text-white">Test Bot</h1>
        <p className="text-[#7c82a8] text-sm mt-1">
          Simulate how your FAQ bot responds to customer questions.
        </p>
      </div>

      {faqs.length === 0 ? (
        <div className="rounded-xl bg-[#0f1117] border border-amber-500/20 p-8 text-center">
          <div className="text-3xl mb-3">🤖</div>
          <p className="text-[#7c82a8] text-sm">
            No FAQs yet. Add some in the FAQ Manager first.
          </p>
        </div>
      ) : (
        <div className="max-w-2xl">
          {/* Chat window */}
          <div className="rounded-xl bg-[#0f1117] border border-[#2a2d3e] overflow-hidden">
            {/* Messages */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-3 flex flex-col">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
                  style={{ animationDelay: "0s", opacity: 0 }}
                >
                  {msg.role === "bot" && (
                    <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-[#0a0b0f] text-xs mr-2 flex-shrink-0 mt-0.5">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M2 3h12v7H9l-3 3V10H2V3z" fill="#0a0b0f" />
                      </svg>
                    </div>
                  )}
                  <div className="max-w-[80%]">
                    <div
                      className={`
                        px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed
                        ${msg.role === "user"
                          ? "bg-amber-500 text-[#0a0b0f] font-medium rounded-tr-sm"
                          : "bg-[#161820] text-[#d4d7f0] border border-[#2a2d3e] rounded-tl-sm"
                        }
                      `}
                    >
                      {msg.text}
                    </div>
                    {msg.matched && (
                      <div className="mt-1 text-xs text-[#4a4f6a] font-mono px-1">
                        Matched: "{msg.matched}" · score {(msg.score * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs mr-2 flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                      <path d="M2 3h12v7H9l-3 3V10H2V3z" fill="#0a0b0f" />
                    </svg>
                  </div>
                  <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-[#161820] border border-[#2a2d3e] flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleAsk} className="flex gap-2 p-3 border-t border-[#2a2d3e]">
              <input
                className="input-field flex-1"
                placeholder="Ask a question…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b0f] font-semibold text-sm transition-all disabled:opacity-40 flex-shrink-0"
              >
                Ask
              </button>
            </form>
          </div>

          <p className="mt-3 text-xs text-[#4a4f6a] font-mono">
            {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} in index · keyword + Jaccard similarity
          </p>
        </div>
      )}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }) {
  return (
    <div className="rounded-xl border border-dashed border-[#2a2d3e] p-12 text-center">
      <div className="text-4xl mb-4">📋</div>
      <h3 className="font-display font-semibold text-white mb-2">No FAQs yet</h3>
      <p className="text-sm text-[#7c82a8] mb-6 max-w-xs mx-auto">
        Add your first FAQ entry and your bot will start answering customer questions instantly.
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0a0b0f] font-semibold text-sm transition-all glow-amber-sm"
      >
        Add first FAQ
      </button>
    </div>
  );
}

// ── Loader ────────────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div className="min-h-screen bg-[#0a0b0f] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function FAQIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 9h.01M15 9h.01M9 13h6M3 8l1-4h16l1 4M4 8v10a2 2 0 002 2h12a2 2 0 002-2V8" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4M8 15h.01M16 15h.01" />
    </svg>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      className={`flex-shrink-0 text-[#4a4f6a] transition-transform duration-200 mt-0.5 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
