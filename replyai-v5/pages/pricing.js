import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import { PLANS } from "../lib/plans";

const O = "#ff7a00";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(null);

  async function upgrade(plan) {
    const priceId = annual ? plan.stripePriceIdAnnual : plan.stripePriceIdMonthly;
    if (!priceId) { window.location.href = "/register?plan=" + plan.id; return; }
    setLoading(plan.id);
    try {
      const r = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else if (r.status === 401) window.location.href = "/register?plan=" + plan.id;
      else alert(d.error || "Something went wrong.");
    } catch { alert("Network error."); }
    finally { setLoading(null); }
  }

  const plans = Object.values(PLANS);

  return (
    <>
      <Head><title>Pricing — ReplyAI</title></Head>
      <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#e8e8e8", fontFamily: "'DM Sans',system-ui,sans-serif" }}>

        {/* Nav */}
        <nav style={{ padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1a1a1a" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: O, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v8H9.5L7 13V10H2V2z" fill="#fff"/></svg>
            </div>
            <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 17, color: "#fff" }}>ReplyAI</span>
          </Link>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/login" style={{ fontSize: 13, color: "#666", padding: "7px 14px", borderRadius: 7, border: "1px solid #222", transition: "all .15s" }}>Sign in</Link>
            <Link href="/register" style={{ fontSize: 13, fontWeight: 700, color: "#000", background: O, padding: "7px 16px", borderRadius: 7 }}>Start free</Link>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "72px 24px 48px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,122,0,.2)", background: "rgba(255,122,0,.07)", fontSize: 11, fontWeight: 700, color: O, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 20 }}>
            Simple pricing
          </div>
          <h1 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: "clamp(32px,5vw,56px)", color: "#fff", marginBottom: 14, lineHeight: 1.15 }}>
            Start free, scale when ready
          </h1>
          <p style={{ color: "#666", fontSize: 17, marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
            No surprises. Cancel anytime. Every plan includes the core features.
          </p>

          {/* Billing toggle */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#111", border: "1px solid #222", borderRadius: 10, padding: "6px 8px" }}>
            <button onClick={() => setAnnual(false)} style={{ padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all .15s", background: !annual ? O : "transparent", color: !annual ? "#000" : "#666" }}>Monthly</button>
            <button onClick={() => setAnnual(true)} style={{ padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all .15s", background: annual ? O : "transparent", color: annual ? "#000" : "#666" }}>
              Annual <span style={{ fontSize: 10, color: annual ? "#000" : "#22c55e", fontWeight: 800, marginLeft: 4 }}>-20%</span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 24px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16, alignItems: "start" }}>
          {plans.map(plan => {
            const isPro  = plan.id === "pro";
            const price  = annual ? plan.priceAnnual : plan.price;
            const isLoad = loading === plan.id;

            return (
              <div key={plan.id} style={{ borderRadius: 16, padding: "32px 28px", background: isPro ? "#111" : "#0e0e0e", border: `1px solid ${isPro ? "rgba(255,122,0,.35)" : "#1f1f1f"}`, boxShadow: isPro ? "0 0 48px rgba(255,122,0,.1)" : "none", position: "relative", display: "flex", flexDirection: "column" }}>
                {isPro && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: O, color: "#000", fontSize: 10, fontWeight: 800, padding: "4px 14px", borderRadius: 20, letterSpacing: ".07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>Most popular</div>}

                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <h2 style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 20, color: "#fff" }}>{plan.name}</h2>
                    <PlanBadge id={plan.id} />
                  </div>
                  <p style={{ fontSize: 13, color: "#555" }}>{plan.tagline}</p>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 44, color: "#fff" }}>
                    {price === 0 ? "$0" : `$${price}`}
                  </span>
                  {price > 0 && <span style={{ color: "#444", fontSize: 14, marginLeft: 6 }}>/month{annual ? " · billed annually" : ""}</span>}
                  {price === 0 && <span style={{ color: "#444", fontSize: 14, marginLeft: 6 }}>forever</span>}
                  {annual && price > 0 && (
                    <div style={{ fontSize: 12, color: "#22c55e", marginTop: 4 }}>Save ${(((plan.price - plan.priceAnnual) * 12)).toFixed(0)}/year</div>
                  )}
                </div>

                {/* Limits */}
                <div style={{ marginBottom: 24, padding: "16px", borderRadius: 10, background: "#0a0a0a", border: "1px solid #1a1a1a" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>Limits</p>
                  {[
                    ["FAQs",           plan.limits.faqs,           "entries"],
                    ["Bookings",       plan.limits.bookingsMonth,  "/month"],
                    ["Messages",       plan.limits.messagesMonth,  "/month"],
                    ["Services",       plan.limits.services,       "max"],
                    ["Team members",   plan.limits.teamMembers,    "seats"],
                  ].map(([lbl, val, unit]) => (
                    <div key={lbl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: "#666" }}>{lbl}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: val === -1 ? "#4ade80" : "#bbb" }}>
                        {val === -1 ? "Unlimited" : val.toLocaleString()} <span style={{ fontWeight: 400, color: "#444", fontSize: 11 }}>{val !== -1 && unit}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul style={{ flex: 1, marginBottom: 28, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                  {Object.entries(plan.features).map(([key, enabled]) => (
                    <li key={key} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: enabled ? "#bbb" : "#333", textDecoration: enabled ? "none" : "line-through" }}>
                      <span style={{ color: enabled ? "#22c55e" : "#333", fontSize: 10, flexShrink: 0 }}>{enabled ? "✓" : "✗"}</span>
                      {featureLabel(key)}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => upgrade(plan)}
                  disabled={isLoad}
                  style={{ width: "100%", padding: "12px 0", borderRadius: 9, border: "none", cursor: isLoad ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: isPro ? O : "transparent",
                    color: isPro ? "#000" : "#777",
                    border: isPro ? "none" : "1px solid #2a2a2a",
                    boxShadow: isPro ? "0 0 20px rgba(255,122,0,.3)" : "none",
                    opacity: isLoad ? .6 : 1,
                  }}
                  onMouseEnter={e => { if (!isPro && !isLoad) { e.currentTarget.style.borderColor="#444"; e.currentTarget.style.color="#fff"; } }}
                  onMouseLeave={e => { if (!isPro) { e.currentTarget.style.borderColor="#2a2a2a"; e.currentTarget.style.color="#777"; } }}>
                  {isLoad ? <Spinner/> : plan.price === 0 ? "Start free →" : `Get ${plan.name} →`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Comparison footer note */}
        <div style={{ textAlign: "center", padding: "0 24px 80px", color: "#444", fontSize: 13 }}>
          All plans include: calendar, booking page, FAQ bot, email support, and SQLite/PostgreSQL storage.
          <br/>Questions? <a href="mailto:hello@replyai.app" style={{ color: O }}>hello@replyai.app</a>
        </div>
      </div>
    </>
  );
}

function PlanBadge({ id }) {
  const styles = {
    free:     { bg: "rgba(255,255,255,.05)", color: "#555", border: "#2a2a2a" },
    pro:      { bg: "rgba(255,122,0,.1)",    color: O,     border: "rgba(255,122,0,.2)" },
    business: { bg: "rgba(255,215,0,.08)",   color: "#ffd700", border: "rgba(255,215,0,.15)" },
  };
  const s = styles[id] || styles.free;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, textTransform: "uppercase", letterSpacing: ".07em", background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {id}
    </span>
  );
}

function featureLabel(key) {
  const labels = {
    calendar:"Calendar & scheduling", whatsapp:"WhatsApp integration", telegram:"Telegram bot",
    aiResponses:"AI responses", googleCalSync:"Google Calendar sync", emailNotify:"Email notifications",
    analyticsBasic:"Basic analytics", analyticsAdv:"Advanced analytics",
    customBranding:"Custom branding", apiAccess:"API access", prioritySupport:"Priority support",
  };
  return labels[key] || key;
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,.2)", borderTopColor: "#000", borderRadius: "50%", animation: "spin .7s linear infinite" }}/>;
}
