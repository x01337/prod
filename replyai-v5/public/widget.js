/**
 * ReplyAI Embeddable Chat Widget v3
 * Multilingual (EN + PL + PT) + internal booking
 * Usage: <script src="https://yourdomain.com/widget.js" data-user-id="123"></script>
 */
(function () {
  "use strict";
  const userId = document.currentScript?.getAttribute("data-user-id");
  const apiBase = document.currentScript?.getAttribute("data-api-base") ||
    (document.currentScript?.src || "").replace("/widget.js", "");
  if (!userId) return console.warn("[ReplyAI] data-user-id is required.");

  // ── Polish word detection (mirrors lib/i18n.js) ─────────────────────────────
  const PL_WORDS = [
    "cześć","hej","chcę","chce","chciałbym","chciałabym",
    "zapisać","zapisac","zapisz","termin","terminy",
    "rezerwacja","rezerwacje","rezerwacji","umówić","umowic",
    "umów","jak","gdzie","kiedy","ile","proszę","prosze",
    "dziękuję","dziekuje","dzięki","nie","tak","dobra",
    "wizyta","wizyty","się","sie","co",
  ];

  function detectLang(text) {
    const lower = (text || "").toLowerCase();
    for (const w of PL_WORDS) { if (lower.includes(w)) return "pl"; }
    return "en";
  }

  const UI = {
    en: { title: "💬 Support Chat", placeholder: "Ask a question…", greeting: "Hi! 👋 How can I help you today?" },
    pl: { title: "💬 Czat wsparcia", placeholder: "Zadaj pytanie…", greeting: "Cześć! 👋 W czym mogę pomóc?" },
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const css = `
    #rai-widget * { box-sizing: border-box; font-family: system-ui, sans-serif; }
    #rai-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 52px; height: 52px; border-radius: 50%; border: none; cursor: pointer;
      background: #ff7a00; color: #fff; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(255,122,0,0.5); transition: transform 0.2s ease;
    }
    #rai-btn:hover { transform: scale(1.08); }
    #rai-panel {
      position: fixed; bottom: 88px; right: 24px; z-index: 9999;
      width: 340px; background: #111; border: 1px solid #222; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.7); display: none; flex-direction: column; overflow: hidden;
    }
    #rai-panel.open { display: flex; }
    #rai-header {
      padding: 14px 16px; background: #ff7a00; display: flex; align-items: center; justify-content: space-between;
    }
    #rai-header span { color: #fff; font-weight: 700; font-size: 14px; }
    #rai-close { background: none; border: none; cursor: pointer; color: #fff; font-size: 18px; line-height: 1; }
    #rai-msgs {
      flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column;
      gap: 10px; max-height: 300px; background: #0b0b0b;
    }
    .rai-msg-user { align-self: flex-end; background: #ff7a00; color: #fff; border-radius: 14px 14px 3px 14px; padding: 8px 12px; font-size: 13px; max-width: 80%; word-break: break-word; }
    .rai-msg-bot  { align-self: flex-start; background: #181818; border: 1px solid #222; color: #eee; border-radius: 14px 14px 14px 3px; padding: 8px 12px; font-size: 13px; max-width: 80%; word-break: break-word; }
    .rai-msg-bot a { color: #ff7a00; text-decoration: underline; }
    .rai-badge-booking { display: inline-block; background: #ff7a00; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 8px; margin-bottom: 4px; }
    #rai-inputrow { display: flex; padding: 10px; gap: 8px; border-top: 1px solid #222; background: #111; }
    #rai-input { flex: 1; background: #0e0e0e; border: 1px solid #333; border-radius: 8px; color: #eee; font-size: 13px; padding: 8px 12px; outline: none; }
    #rai-input:focus { border-color: #ff7a00; }
    #rai-send { background: #ff7a00; border: none; border-radius: 8px; width: 34px; height: 34px; cursor: pointer; color: #fff; font-size: 16px; display: flex; align-items: center; justify-content: center; }
    #rai-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #rai-powered { text-align: center; padding: 6px; font-size: 10px; color: #555; background: #0b0b0b; }
    #rai-powered a { color: #ff7a00; text-decoration: none; }
  `;
  const style = document.createElement("style"); style.textContent = css;
  document.head.appendChild(style);

  // ── HTML ─────────────────────────────────────────────────────────────────────
  const wrap = document.createElement("div"); wrap.id = "rai-widget";
  wrap.innerHTML = `
    <button id="rai-btn" title="Chat with us">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
    <div id="rai-panel">
      <div id="rai-header">
        <span id="rai-title">💬 Support Chat</span>
        <button id="rai-close">×</button>
      </div>
      <div id="rai-msgs">
        <div class="rai-msg-bot" id="rai-greeting">Hi! 👋 How can I help you today?</div>
      </div>
      <div id="rai-inputrow">
        <input id="rai-input" placeholder="Ask a question…" autocomplete="off" />
        <button id="rai-send" type="button">➤</button>
      </div>
      <div id="rai-powered">Powered by <a href="https://replyai.app" target="_blank">ReplyAI</a></div>
    </div>
  `;
  document.body.appendChild(wrap);

  // ── Logic ────────────────────────────────────────────────────────────────────
  const panel   = document.getElementById("rai-panel");
  const msgs    = document.getElementById("rai-msgs");
  const input   = document.getElementById("rai-input");
  const send    = document.getElementById("rai-send");
  const title   = document.getElementById("rai-title");
  const greeting = document.getElementById("rai-greeting");

  let currentLang = "en";

  function updateUI(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    const ui = UI[lang] || UI.en;
    title.textContent = ui.title;
    input.placeholder = ui.placeholder;
  }

  document.getElementById("rai-btn").addEventListener("click", () => panel.classList.toggle("open"));
  document.getElementById("rai-close").addEventListener("click", () => panel.classList.remove("open"));

  // Update UI lang as user types
  input.addEventListener("input", () => {
    const lang = detectLang(input.value);
    updateUI(lang);
  });

  send.addEventListener("click", submitQuestion);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) submitQuestion(); });

  async function submitQuestion() {
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    send.disabled = true;

    const lang = detectLang(q);
    updateUI(lang);

    addMsg(q, "user");
    const typing = addMsg("…", "bot");

    try {
      const r = await fetch(`${apiBase}/api/ask?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await r.json();

      if (d.type === "booking" && d.answer) {
        // Render booking response with clickable link
        typing.innerHTML = renderBookingMsg(d.answer, d.lang);
      } else {
        typing.textContent = d.answer || "Sorry, something went wrong.";
      }

      // Update UI language based on server response
      if (d.lang) updateUI(d.lang);

    } catch {
      typing.textContent = currentLang === "pl"
        ? "Przepraszam, coś poszło nie tak. Spróbuj ponownie!"
        : "Sorry, something went wrong. Try again!";
    } finally {
      send.disabled = false;
      input.focus();
    }
  }

  function renderBookingMsg(answer, lang) {
    // Convert URL in answer to clickable link
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const escaped = answer.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return escaped.replace(urlRegex, (url) =>
      `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
    );
  }

  function addMsg(text, role) {
    const el = document.createElement("div");
    el.className = `rai-msg-${role}`;
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }
})();
