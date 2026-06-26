/**
 * pages/chat/[userId].js — Public embedded chat for any business
 *
 * URL: /chat/123
 * Supports: en | pl | pt (auto-detected from browser or ?lang=)
 */

import { useState, useEffect, useRef } from "react";

const UI = {
  en: { placeholder: "Type a message…", send: "Send", title: "Chat with us", subtitle: "We usually reply in seconds", typing: "Typing…" },
  pl: { placeholder: "Napisz wiadomość…", send: "Wyślij", title: "Porozmawiaj z nami", subtitle: "Zwykle odpowiadamy w kilka sekund", typing: "Pisze…" },
  pt: { placeholder: "Digite uma mensagem…", send: "Enviar", title: "Fale conosco", subtitle: "Geralmente respondemos em segundos", typing: "Digitando…" },
};

function detectBrowserLang() {
  if (typeof navigator === "undefined") return "en";
  const l = (navigator.language || "en").toLowerCase();
  if (l.startsWith("pl")) return "pl";
  if (l.startsWith("pt")) return "pt";
  return "en";
}

export default function ChatPage({ userId }) {
  const [lang, setLang]       = useState("en");
  const [msgs, setMsgs]       = useState([]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [ready, setReady]     = useState(false);
  const bottomRef             = useRef(null);
  const ui                    = UI[lang] || UI.en;

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const lp = p.get("lang");
    const detected = lp && UI[lp] ? lp : detectBrowserLang();
    setLang(detected);

    const greeting = detected === "pl"
      ? "Cześć! 👋 W czym mogę pomóc? Mogę odpowiedzieć na pytania lub pomóc Ci zarezerwować wizytę."
      : detected === "pt"
      ? "Olá! 👋 Como posso ajudar? Posso responder perguntas ou agendar um horário para você."
      : "Hi there! 👋 How can I help? I can answer questions or help you book an appointment.";

    setMsgs([{ role: "bot", text: greeting }]);
    setReady(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  async function send(e) {
    e?.preventDefault();
    const q = input.trim();
    if (!q || typing || !ready) return;
    setInput("");
    setMsgs(m => [...m, { role: "user", text: q }]);
    setTyping(true);

    await new Promise(r => setTimeout(r, 500 + Math.random() * 500));

    try {
      const r = await fetch(`/api/public/ask?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await r.json();
      setMsgs(m => [...m, { role: "bot", text: d.answer || "Sorry, something went wrong.", type: d.type }]);
    } catch {
      setMsgs(m => [...m, { role: "bot", text: "⚠️ Network error. Please try again." }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0b0b0b; font-family: system-ui, -apple-system, sans-serif; }
        .chat-shell { display: flex; flex-direction: column; height: 100vh; max-width: 540px; margin: 0 auto; background: #111; border-left: 1px solid #222; border-right: 1px solid #222; }
        .chat-header { background: #111; border-bottom: 1px solid #222; padding: 16px 20px; display: flex; align-items: center; gap: 12px; }
        .avatar { width: 40px; height: 40px; border-radius: 50%; background: #ff7a00; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .header-text h1 { font-size: 15px; font-weight: 700; color: #f0f0f0; }
        .header-text p  { font-size: 12px; color: #666; margin-top: 2px; }
        .online-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; display: inline-block; margin-right: 4px; }
        .messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
        .msg-row-user { display: flex; justify-content: flex-end; }
        .msg-row-bot  { display: flex; justify-content: flex-start; }
        .bubble { max-width: 75%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-break: break-word; }
        .bubble-user { background: #ff7a00; color: #fff; border-bottom-right-radius: 4px; }
        .bubble-bot  { background: #1a1a1a; color: #e0e0e0; border: 1px solid #2a2a2a; border-bottom-left-radius: 4px; }
        .typing-row { display: flex; gap: 5px; align-items: center; padding: 10px 14px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px; border-bottom-left-radius: 4px; width: fit-content; }
        .dot { width: 7px; height: 7px; border-radius: 50%; background: #555; animation: blink 1.2s infinite; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%,80%,100%{opacity:.3} 40%{opacity:1} }
        .input-row { display: flex; gap: 10px; padding: 14px 16px; border-top: 1px solid #222; background: #111; }
        .chat-input { flex: 1; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 22px; color: #e0e0e0; font-size: 14px; padding: 10px 16px; outline: none; transition: border-color 0.15s; resize: none; }
        .chat-input:focus { border-color: #ff7a00; }
        .send-btn { width: 42px; height: 42px; border-radius: 50%; background: #ff7a00; border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s; }
        .send-btn:hover:not(:disabled) { opacity: 0.85; }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      `}</style>

      <div className="chat-shell">
        <header className="chat-header">
          <div className="avatar">💬</div>
          <div className="header-text">
            <h1>{ui.title}</h1>
            <p><span className="online-dot" />{ui.subtitle}</p>
          </div>
        </header>

        <div className="messages">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "msg-row-user" : "msg-row-bot"}>
              <div className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"}`}>
                {m.type === "booking"
                  ? <span dangerouslySetInnerHTML={{ __html: m.text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#ff7a00;text-decoration:underline">$1</a>') }} />
                  : m.text
                }
              </div>
            </div>
          ))}
          {typing && (
            <div className="msg-row-bot">
              <div className="typing-row">
                <div className="dot" /><div className="dot" /><div className="dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="input-row" onSubmit={send}>
          <input
            className="chat-input"
            placeholder={ui.placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
            disabled={typing}
            autoFocus
          />
          <button className="send-btn" type="submit" disabled={typing || !input.trim()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </>
  );
}

export async function getServerSideProps({ params }) {
  const userId = parseInt(params?.userId, 10);
  if (!userId || isNaN(userId)) return { notFound: true };
  return { props: { userId } };
}
