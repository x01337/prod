/**
 * components/AnalyticsDashboard.js
 * Analytics panel: KPI cards, usage meters, busiest hours, recent bookings.
 */
import { useState, useEffect } from "react";

const O  = "#ff7a00";
const G  = "#22c55e";

function n(v) { return typeof v === "number" ? v : 0; }

// ─── Sparkline bar chart ──────────────────────────────────────────────────────
function MiniBar({ data = [], color = O, height = 40 }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.count || d.n || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height }}>
      {data.map((d, i) => {
        const val = d.count || d.n || 0;
        const h   = Math.max(3, (val / max) * height);
        return (
          <div key={i} title={`${d.date || d.hour || i}: ${val}`}
            style={{ flex: 1, height: h, borderRadius: 2, background: color, opacity: 0.7, transition: "height .3s", cursor: "default" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
            onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
          />
        );
      })}
    </div>
  );
}

// ─── Usage meter bar ──────────────────────────────────────────────────────────
function UsageMeter({ label, used, limit, pct }) {
  const isUnlimited = limit === -1;
  const color = pct > 85 ? "#ef4444" : pct > 60 ? O : G;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: isUnlimited ? G : pct > 85 ? "#ef4444" : "#bbb" }}>
          {isUnlimited ? `${used} / ∞` : `${used} / ${limit}`}
          {!isUnlimited && <span style={{ color: "#444", marginLeft: 6, fontSize: 10 }}>({pct}%)</span>}
        </span>
      </div>
      {!isUnlimited && (
        <div style={{ height: 4, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width .6s ease" }} />
        </div>
      )}
    </div>
  );
}

// ─── KPI stat card ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = "#bbb" }) {
  return (
    <div style={{ padding: "20px 22px", borderRadius: 12, background: "#111", border: "1px solid #1f1f1f", transition: "border-color .2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#2a2a2a"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#1f1f1f"}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 32, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ─── Plan upgrade nudge ───────────────────────────────────────────────────────
function UpgradeNudge({ plan }) {
  if (plan === "pro" || plan === "business") return null;
  return (
    <div style={{ padding: "14px 18px", borderRadius: 10, background: "rgba(255,122,0,.06)", border: "1px solid rgba(255,122,0,.18)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: O, margin: "0 0 3px" }}>Unlock advanced analytics</p>
        <p style={{ fontSize: 12, color: "#666", margin: 0 }}>Conversion rates, message trends, and full booking history are available on Pro.</p>
      </div>
      <a href="/pricing" style={{ flexShrink: 0, padding: "8px 18px", borderRadius: 8, background: O, color: "#000", fontWeight: 700, fontSize: 13, textDecoration: "none", whiteSpace: "nowrap", transition: "box-shadow .15s" }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 18px rgba(255,122,0,.4)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
        Upgrade to Pro →
      </a>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics")
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load analytics."); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 12, color: "#555" }}>
        <div style={{ width: 20, height: 20, border: "2px solid rgba(255,122,0,.2)", borderTopColor: O, borderRadius: "50%", animation: "spin .7s linear infinite" }} />
        <span style={{ fontSize: 13 }}>Loading analytics…</span>
      </div>
    );
  }

  if (error || !data) {
    return <div style={{ padding: 24, color: "#f87171", fontSize: 13 }}>{error || "No data available."}</div>;
  }

  const { plan, usage } = data;

  // Build bookings-by-day chart (last 30 days, fill gaps)
  const bbd = data.bookingsByDay || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", margin: 0 }}>Analytics</h1>
          <p style={{ color: "#444", fontSize: 12, marginTop: 3, fontFamily: "monospace" }}>
            Plan: <span style={{ color: plan === "free" ? "#666" : O, fontWeight: 700, textTransform: "capitalize" }}>{plan}</span>
            &nbsp;·&nbsp;current month snapshot
          </p>
        </div>
        {plan !== "business" && (
          <a href="/pricing" style={{ fontSize: 12, color: O, border: "1px solid rgba(255,122,0,.25)", padding: "6px 14px", borderRadius: 8, textDecoration: "none", transition: "background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,122,0,.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {plan === "free" ? "Upgrade plan →" : "View billing →"}
          </a>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        <StatCard icon="📅" label="Total bookings"    value={n(data.totalBookings)}     sub="all time"              color="#fff" />
        <StatCard icon="📆" label="This month"        value={n(data.bookingsThisMonth)} sub="bookings"              color={O}    />
        <StatCard icon="⚡" label="Last 7 days"       value={n(data.bookingsLast7)}     sub="bookings"              color={O}    />
        <StatCard icon="💬" label="Total messages"    value={n(data.totalMessages)}     sub="received"              color="#bbb" />
        <StatCard icon="📩" label="This month"        value={n(data.messagesThisMonth)} sub="messages"              color="#bbb" />
        <StatCard icon="❓" label="Missed intents"    value={n(data.missedMessages)}    sub="unanswered"            color={n(data.missedMessages) > 0 ? "#ef4444" : G} />
        <StatCard icon="📋" label="FAQ entries"       value={n(data.totalFaqs)}        sub="in knowledge base"     color="#bbb" />
        <StatCard icon="🛠" label="Services"          value={n(data.totalServices)}    sub="configured"            color="#bbb" />
      </div>

      {/* Upgrade nudge */}
      <UpgradeNudge plan={plan} />

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>

        {/* Bookings by day */}
        <div style={{ padding: "20px 22px", borderRadius: 12, background: "#111", border: "1px solid #1f1f1f" }}>
          <p style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Bookings — last 30 days</p>
          <p style={{ fontSize: 11, color: "#333", marginBottom: 16 }}>
            {bbd.reduce((a, b) => a + n(b.count), 0)} total
          </p>
          {bbd.length > 0
            ? <MiniBar data={bbd} color={O} height={56} />
            : <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 12 }}>No bookings yet</div>
          }
        </div>

        {/* Busiest hours */}
        <div style={{ padding: "20px 22px", borderRadius: 12, background: "#111", border: "1px solid #1f1f1f" }}>
          <p style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 16 }}>Busiest hours</p>
          {(data.busyHours || []).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.busyHours.slice(0, 5).map((h, i) => {
                const max = n(data.busyHours[0]?.count);
                const w   = max > 0 ? Math.round((n(h.count) / max) * 100) : 0;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#666", width: 44, flexShrink: 0 }}>{h.hour}</span>
                    <div style={{ flex: 1, height: 6, background: "#1a1a1a", borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${w}%`, background: i === 0 ? O : "#3a3a3a", borderRadius: 3, transition: "width .6s ease" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#555", width: 24, textAlign: "right", flexShrink: 0 }}>{h.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 12 }}>No booking data yet</div>
          )}
        </div>

      </div>

      {/* Usage meters */}
      <div style={{ padding: "20px 22px", borderRadius: 12, background: "#111", border: "1px solid #1f1f1f" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>Plan usage</p>
          <a href="/pricing" style={{ fontSize: 11, color: "#444", textDecoration: "none", transition: "color .15s" }}
            onMouseEnter={e => e.currentTarget.style.color = O}
            onMouseLeave={e => e.currentTarget.style.color = "#444"}>
            {plan === "free" ? "Upgrade for more limits →" : "Manage billing →"}
          </a>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0 40px" }}>
          <UsageMeter label="Bookings this month" used={usage.bookingsMonth.used} limit={usage.bookingsMonth.limit} pct={usage.bookingsMonth.pct} />
          <UsageMeter label="Messages this month" used={usage.messagesMonth.used} limit={usage.messagesMonth.limit} pct={usage.messagesMonth.pct} />
          <UsageMeter label="FAQ entries"         used={usage.faqs.used}          limit={usage.faqs.limit}          pct={usage.faqs.pct}          />
          <UsageMeter label="Services"            used={usage.services.used}      limit={usage.services.limit}      pct={usage.services.pct}      />
        </div>
      </div>

      {/* Recent bookings */}
      {(data.recentBookings || []).length > 0 && (
        <div style={{ padding: "20px 22px", borderRadius: 12, background: "#111", border: "1px solid #1f1f1f" }}>
          <p style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 16 }}>Recent bookings</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {data.recentBookings.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < data.recentBookings.length - 1 ? "1px solid #1a1a1a" : "none" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,122,0,.1)", border: "1px solid rgba(255,122,0,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: O, flexShrink: 0 }}>
                  {(b.client_name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#ddd", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {b.client_name || "Client"}
                  </p>
                  <p style={{ fontSize: 11, color: "#555", margin: 0 }}>
                    {b.service_name || "Service"} · {b.date}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: 11, fontFamily: "monospace", color: "#666", margin: 0 }}>
                    {b.start_time}–{b.end_time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
