/**
 * ReplyAI Embed Widget — drop this into any website to add your FAQ bot.
 *
 * Usage (replace USER_ID and BASE_URL with your values):
 *
 *   <script>
 *     window.ReplyAIConfig = { userId: "123", baseUrl: "https://your-app.vercel.app" };
 *   </script>
 *   <script src="https://your-app.vercel.app/widget.js" defer></script>
 *
 * Or self-host this file and serve it from your own domain.
 */

(function () {
  "use strict";

  const cfg = window.ReplyAIConfig || {};
  const userId = cfg.userId;
  const baseUrl = (cfg.baseUrl || "").replace(/\/$/, "");
  const accentColor = cfg.accentColor || "#f59e0b";
  const botName = cfg.botName || "FAQ Bot";
  const placeholder = cfg.placeholder || "Ask a question…";
  const position = cfg.position || "right"; // "right" | "left"

  if (!userId || !baseUrl) {
    console.warn("[ReplyAI] Missing userId or baseUrl in window.ReplyAIConfig");
    return;
  }

  // ── Styles ──────────────────────────────────────────────────────────────
  const css = `
    #rai-launcher {
      position: fixed;
      bottom: 24px;
      ${position}: 24px;
      width: 52px; height: 52px;
      border-radius: 50%;
      background: ${accentColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      z-index: 99998;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    #rai-launcher:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.4); }
    #rai-launcher svg { pointer-events: none; }

    #rai-widget {
      position: fixed;
      bottom: 90px;
      ${position}: 24px;
      width: 340px;
      max-height: 480px;
      background: #0f1117;
      border: 1px solid #2a2d3e;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      display: flex; flex-direction: column;
      z-index: 99999;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      opacity: 0;
      transform: translateY(12px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.25s, transform 0.25s;
    }
    #rai-widget.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    #rai-header {
      padding: 14px 16px;
      background: #161820;
      border-bottom: 1px solid #2a2d3e;
      display: flex; align-items: center; gap: 10px;
    }
    #rai-header-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: ${accentColor};
      animation: raiPulse 2s ease-in-out infinite;
    }
    #rai-header-name { color: #fff; font-weight: 600; font-size: 14px; }
    #rai-header-status { color: #4a4f6a; font-size: 11px; margin-top: 1px; }

    #rai-messages {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 8px;
    }
    #rai-messages::-webkit-scrollbar { width: 4px; }
    #rai-messages::-webkit-scrollbar-thumb { background: #2a2d3e; border-radius: 2px; }

    .rai-msg {
      max-width: 85%;
      padding: 9px 13px;
      border-radius: 14px;
      line-height: 1.5;
      font-size: 13px;
      animation: raiFadeUp 0.25s ease forwards;
    }
    .rai-msg.bot {
      background: #1e2130;
      color: #d4d7f0;
      border-radius: 14px 14px 14px 3px;
      align-self: flex-start;
      border: 1px solid #2a2d3e;
    }
    .rai-msg.user {
      background: ${accentColor};
      color: #0a0b0f;
      font-weight: 500;
      border-radius: 14px 14px 3px 14px;
      align-self: flex-end;
    }
    .rai-typing span {
      display: inline-block;
      width: 6px; height: 6px;
      background: ${accentColor};
      border-radius: 50%;
      margin: 0 2px;
      animation: raiBounce 0.9s infinite;
    }
    .rai-typing span:nth-child(2) { animation-delay: 0.15s; }
    .rai-typing span:nth-child(3) { animation-delay: 0.30s; }

    #rai-form {
      display: flex; gap: 8px; padding: 10px;
      border-top: 1px solid #2a2d3e; background: #0f1117;
    }
    #rai-input {
      flex: 1; background: #161820; border: 1px solid #2a2d3e;
      color: #e2e4f0; border-radius: 8px; padding: 8px 12px;
      font-size: 13px; outline: none;
      transition: border-color 0.2s;
    }
    #rai-input::placeholder { color: #4a4f6a; }
    #rai-input:focus { border-color: ${accentColor}; }
    #rai-send {
      background: ${accentColor}; border: none; cursor: pointer;
      border-radius: 8px; padding: 8px 14px;
      color: #0a0b0f; font-weight: 600; font-size: 13px;
      transition: opacity 0.2s;
    }
    #rai-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #rai-branding {
      text-align: center; padding: 6px;
      font-size: 10px; color: #2a2d3e;
    }
    #rai-branding a { color: #3a3d52; text-decoration: none; }
    #rai-branding a:hover { color: #7c82a8; }

    @keyframes raiPulse {
      0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
    }
    @keyframes raiFadeUp {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes raiBounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-5px); }
    }
  `;

  // ── HTML ─────────────────────────────────────────────────────────────────
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Launcher button
  const launcher = document.createElement("button");
  launcher.id = "rai-launcher";
  launcher.setAttribute("aria-label", "Open FAQ chat");
  launcher.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a0b0f" stroke-width="2.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>`;
  document.body.appendChild(launcher);

  // Widget
  const widget = document.createElement("div");
  widget.id = "rai-widget";
  widget.setAttribute("role", "dialog");
  widget.setAttribute("aria-label", `${botName} chat`);
  widget.innerHTML = `
    <div id="rai-header">
      <div id="rai-header-dot"></div>
      <div>
        <div id="rai-header-name">${botName}</div>
        <div id="rai-header-status">Usually answers instantly</div>
      </div>
    </div>
    <div id="rai-messages"></div>
    <form id="rai-form" onsubmit="return false;">
      <input id="rai-input" type="text" placeholder="${placeholder}" autocomplete="off" />
      <button id="rai-send" type="submit">Send</button>
    </form>
    <div id="rai-branding">Powered by <a href="https://replyai.app" target="_blank">ReplyAI</a></div>
  `;
  document.body.appendChild(widget);

  // ── State ────────────────────────────────────────────────────────────────
  let open = false;
  const messagesEl = widget.querySelector("#rai-messages");
  const inputEl = widget.querySelector("#rai-input");
  const sendBtn = widget.querySelector("#rai-send");
  const formEl = widget.querySelector("#rai-form");

  function addMessage(text, role) {
    const div = document.createElement("div");
    div.className = `rai-msg ${role}`;
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function addTyping() {
    const div = document.createElement("div");
    div.className = "rai-msg bot rai-typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  // Welcome message
  addMessage("👋 Hi! Ask me anything — I'll search our FAQ for the best answer.", "bot");

  async function handleSend() {
    const q = inputEl.value.trim();
    if (!q) return;
    inputEl.value = "";
    sendBtn.disabled = true;
    addMessage(q, "user");
    const typing = addTyping();

    try {
      const res = await fetch(`${baseUrl}/api/ask?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      typing.remove();
      addMessage(data.answer || "Sorry, I couldn't find an answer.", "bot");
    } catch {
      typing.remove();
      addMessage("Connection error. Please try again.", "bot");
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  formEl.addEventListener("submit", handleSend);
  sendBtn.addEventListener("click", handleSend);

  launcher.addEventListener("click", () => {
    open = !open;
    widget.classList.toggle("open", open);
    launcher.innerHTML = open
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a0b0f" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a0b0f" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`;
    if (open) setTimeout(() => inputEl.focus(), 300);
  });
})();
