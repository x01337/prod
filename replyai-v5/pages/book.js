// pages/book.js — Public multilingual booking form
// Auto-detects language from ?lang= param or browser locale
// Usage: /book?userId=123 or /book?userId=123&lang=pl

import { useState, useEffect } from "react";

// ── UI strings ────────────────────────────────────────────────────────────────
const UI = {
  en: {
    title: "Book an Appointment",
    name: "Your name",
    phone: "Phone (optional)",
    date: "Preferred date",
    submit: "Book Now",
    submitting: "Booking…",
    success: "Booking confirmed ✅",
    successSub: "We'll be in touch shortly.",
    errorEmpty: "Please fill in your name and preferred date.",
    errorDate: "Please enter a valid date.",
    langLabel: "Language",
    flag: "🇬🇧",
  },
  pl: {
    title: "Zarezerwuj wizytę",
    name: "Twoje imię",
    phone: "Telefon (opcjonalnie)",
    date: "Preferowany termin",
    submit: "Zarezerwuj",
    submitting: "Rezerwowanie…",
    success: "Rezerwacja potwierdzona ✅",
    successSub: "Wkrótce się skontaktujemy.",
    errorEmpty: "Wpisz imię i preferowany termin.",
    errorDate: "Podaj prawidłową datę.",
    langLabel: "Język",
    flag: "🇵🇱",
  },
  pt: {
    title: "Agendar Horário",
    name: "Seu nome",
    phone: "Telefone (opcional)",
    date: "Data preferida",
    submit: "Agendar",
    submitting: "Agendando…",
    success: "Agendamento confirmado ✅",
    successSub: "Entraremos em contato em breve.",
    errorEmpty: "Preencha o nome e a data.",
    errorDate: "Insira uma data válida.",
    langLabel: "Idioma",
    flag: "🇧🇷",
  },
};

const LANGS = [
  { code: "en", label: "English 🇬🇧" },
  { code: "pl", label: "Polski 🇵🇱" },
  { code: "pt", label: "Português 🇧🇷" },
];

function detectBrowserLang() {
  if (typeof navigator === "undefined") return "en";
  const l = (navigator.language || "en").toLowerCase();
  if (l.startsWith("pl")) return "pl";
  if (l.startsWith("pt")) return "pt";
  return "en";
}

export default function BookPage() {
  const [lang, setLang]         = useState("en");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [date, setDate]         = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [userId, setUserId]     = useState(null);

  // Read ?lang= and ?userId= from URL on mount
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const paramLang = p.get("lang");
    const paramUser = p.get("userId");
    setLang(paramLang && UI[paramLang] ? paramLang : detectBrowserLang());
    if (paramUser) setUserId(paramUser);
  }, []);

  const ui = UI[lang] || UI.en;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !date.trim()) {
      setError(ui.errorEmpty);
      return;
    }

    setLoading(true);
    try {
      const endpoint = userId
        ? `/api/appointments?userId=${userId}`
        : "/api/appointments";

      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: name, phone, date, language: lang }),
      });
      const d = await r.json();

      if (!r.ok) {
        setError(d.error || "Something went wrong.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0b0b0b; color: #eee; font-family: system-ui, sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .card { background: #111; border: 1px solid #222; border-radius: 16px; padding: 36px 32px; width: 100%; max-width: 420px; }
        h1 { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
        .sub { font-size: 13px; color: #666; margin-bottom: 28px; }
        .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        label { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
        input, select { background: #0e0e0e; border: 1px solid #2a2a2a; border-radius: 8px; color: #eee; font-size: 14px; padding: 10px 14px; outline: none; transition: border-color 0.15s; width: 100%; }
        input:focus, select:focus { border-color: #ff7a00; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.6); }
        .btn { background: #ff7a00; border: none; border-radius: 8px; color: #fff; cursor: pointer; font-size: 14px; font-weight: 700; padding: 12px; width: 100%; transition: opacity 0.15s; margin-top: 8px; }
        .btn:hover:not(:disabled) { opacity: 0.88; }
        .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; color: #f87171; font-size: 13px; padding: 10px 14px; margin-top: 12px; }
        .success-box { text-align: center; padding: 24px 0; }
        .success-box .icon { font-size: 48px; margin-bottom: 12px; }
        .success-box h2 { font-size: 20px; font-weight: 800; margin-bottom: 6px; }
        .success-box p { color: #666; font-size: 14px; }
        .lang-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; }
        .lang-select { background: #0e0e0e; border: 1px solid #2a2a2a; border-radius: 8px; color: #eee; font-size: 13px; padding: 6px 10px; cursor: pointer; }
      `}</style>

      <div className="card">
        {success ? (
          <div className="success-box">
            <div className="icon">🎉</div>
            <h2>{ui.success}</h2>
            <p>{ui.successSub}</p>
          </div>
        ) : (
          <>
            <div className="lang-row">
              <h1>{ui.title}</h1>
              <select
                className="lang-select"
                value={lang}
                onChange={e => setLang(e.target.value)}
              >
                {LANGS.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>{ui.name}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={ui.name}
                  autoFocus
                />
              </div>

              <div className="field">
                <label>{ui.phone}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+48 123 456 789"
                />
              </div>

              <div className="field">
                <label>{ui.date}</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>

              {error && <div className="error">{error}</div>}
              <button className="btn" type="submit" disabled={loading}>
                {loading ? ui.submitting : ui.submit}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}
