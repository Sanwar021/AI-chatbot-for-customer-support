(function () {
  "use strict";

  // Prevent multiple initializations
  if (window.__SUPPORTPILOT_WIDGET_LOADED__) return;
  window.__SUPPORTPILOT_WIDGET_LOADED__ = true;

  // Extract script config
  const currentScript =
    document.currentScript ||
    (function () {
      const scripts = document.getElementsByTagName("script");
      return scripts[scripts.length - 1];
    })();

  const botKey = currentScript?.getAttribute("data-bot-key") || "sp_bot_demo_dental_clinic_2026";
  const apiBase = currentScript?.getAttribute("data-api-base") || (window.location.origin.includes(":3000") ? "http://localhost:8000" : window.location.origin);

  // State management
  let state = {
    isOpen: false,
    botName: "SupportPilot AI",
    primaryColor: "#087b6d",
    position: "bottom-right",
    welcomeMessage: "Hello! How can I help you today?",
    suggestedQuestions: [],
    preChatFormEnabled: true,
    preChatSubmitted: false,
    conversationId: null,
    customerId: localStorage.getItem("sp_customer_id") || "cust_" + Math.random().toString(36).substring(2, 12),
    messages: [],
    isTyping: false,
    ratingSubmitted: false,
  };

  localStorage.setItem("sp_customer_id", state.customerId);

  // Restore prior conversation if available
  const savedConv = localStorage.getItem("sp_conv_" + botKey);
  if (savedConv) {
    try {
      const parsed = JSON.parse(savedConv);
      state.conversationId = parsed.conversationId;
      state.preChatSubmitted = parsed.preChatSubmitted || false;
      state.messages = parsed.messages || [];
    } catch (e) {}
  }

  // Create Container and Shadow DOM for absolute style isolation
  const host = document.createElement("div");
  host.id = "supportpilot-widget-host";
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  // Stylesheet
  const style = document.createElement("style");
  style.textContent = `
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    
    .sp-launcher {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--sp-primary, #087b6d) 0%, #169889 100%);
      box-shadow: 0 8px 24px rgba(8, 123, 109, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 999999;
    }
    .sp-launcher:hover {
      transform: scale(1.06);
      box-shadow: 0 12px 30px rgba(8, 123, 109, 0.45);
    }
    .sp-launcher.left {
      right: auto;
      left: 24px;
    }
    .sp-launcher svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .sp-window {
      position: fixed;
      bottom: 96px;
      right: 24px;
      width: 380px;
      height: 620px;
      max-height: calc(100vh - 120px);
      max-width: calc(100vw - 32px);
      background: #090b0c;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999998;
      backdrop-filter: blur(20px);
    }
    .sp-window.left {
      right: auto;
      left: 24px;
    }
    .sp-window.open {
      display: flex;
      animation: spSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes spSlideUp {
      from { opacity: 0; transform: translateY(16px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Header */
    .sp-header {
      background: linear-gradient(135deg, #07152b 0%, #0d1e38 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
    }
    .sp-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sp-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--sp-primary, #087b6d), #38bdf8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }
    .sp-header-info h4 {
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
    }
    .sp-header-info span {
      font-size: 11px;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .sp-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }
    .sp-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 8px;
      transition: background 0.2s;
    }
    .sp-close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }

    /* Body */
    .sp-body {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      background: #020d0c;
      background-image: radial-gradient(circle at 90% 10%, rgba(23, 150, 132, 0.15), transparent 40%);
    }

    /* Message Bubbles */
    .sp-msg {
      display: flex;
      flex-direction: column;
      max-width: 84%;
    }
    .sp-msg.bot {
      align-self: flex-start;
    }
    .sp-msg.customer {
      align-self: flex-end;
    }
    .sp-msg.agent {
      align-self: flex-start;
    }
    .sp-bubble {
      padding: 12px 14px;
      border-radius: 14px;
      font-size: 13.5px;
      line-height: 1.45;
      word-break: break-word;
    }
    .sp-msg.bot .sp-bubble {
      background: #07152b;
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-bottom-left-radius: 4px;
    }
    .sp-msg.customer .sp-bubble {
      background: linear-gradient(135deg, var(--sp-primary, #087b6d), #169889);
      color: #ffffff;
      border-bottom-right-radius: 4px;
    }
    .sp-msg.agent .sp-bubble {
      background: #1e1b4b;
      color: #e0e7ff;
      border: 1px solid rgba(129, 140, 248, 0.25);
      border-bottom-left-radius: 4px;
    }
    .sp-msg-meta {
      font-size: 10px;
      color: #64748b;
      margin-top: 4px;
      padding: 0 4px;
    }
    .sp-msg.customer .sp-msg-meta {
      text-align: right;
    }

    /* Citations / Sources */
    .sp-sources {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .sp-source-tag {
      background: rgba(56, 189, 248, 0.12);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 6px;
    }

    /* Suggested Questions */
    .sp-suggestions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
    }
    .sp-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 12px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }
    .sp-pill:hover {
      background: rgba(8, 123, 109, 0.15);
      border-color: #169889;
      color: white;
    }

    /* Pre-chat Form */
    .sp-form {
      background: #07152b;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 16px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    .sp-form h5 {
      color: white;
      font-size: 13px;
      margin-bottom: 2px;
    }
    .sp-input {
      background: #050b20;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 8px 12px;
      color: white;
      font-size: 12.5px;
      outline: none;
    }
    .sp-input:focus {
      border-color: #38bdf8;
    }
    .sp-btn-submit {
      background: linear-gradient(135deg, var(--sp-primary, #087b6d), #169889);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 9px;
      font-weight: 600;
      font-size: 12.5px;
      cursor: pointer;
    }

    /* Actions bar (Handoff) */
    .sp-actions-bar {
      padding: 4px 16px;
      background: #050b20;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: flex-end;
    }
    .sp-handoff-link {
      color: #ff6819;
      font-size: 11px;
      background: none;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .sp-handoff-link:hover {
      text-decoration: underline;
    }

    /* Typing indicator */
    .sp-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: #07152b;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      width: fit-content;
    }
    .sp-dot {
      width: 6px;
      height: 6px;
      background: #38bdf8;
      border-radius: 50%;
      animation: spBounce 1.4s infinite ease-in-out both;
    }
    .sp-dot:nth-child(1) { animation-delay: -0.32s; }
    .sp-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes spBounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
      40% { transform: scale(1); opacity: 1; }
    }

    /* Input Footer */
    .sp-footer {
      padding: 12px 14px;
      background: #07152b;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sp-textarea {
      flex: 1;
      background: #050b20;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 9px 12px;
      color: white;
      font-size: 13px;
      resize: none;
      height: 38px;
      outline: none;
    }
    .sp-textarea:focus {
      border-color: #169889;
    }
    .sp-send-btn {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--sp-primary, #087b6d), #169889);
      border: none;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .sp-send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .sp-send-btn svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
    }
  `;
  shadow.appendChild(style);

  // Widget HTML structure
  const widgetRoot = document.createElement("div");
  widgetRoot.innerHTML = `
    <button class="sp-launcher" aria-label="Open AI Customer Support">
      <svg viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>

    <div class="sp-window">
      <div class="sp-header">
        <div class="sp-header-left">
          <div class="sp-avatar">SP</div>
          <div class="sp-header-info">
            <h4 class="sp-bot-name">SupportPilot AI</h4>
            <span><span class="sp-status-dot"></span> Online • Grounded RAG</span>
          </div>
        </div>
        <button class="sp-close-btn" aria-label="Close Chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="6"></line>
          </svg>
        </button>
      </div>

      <div class="sp-body" id="sp-messages-body">
        <!-- Messages will be rendered here -->
      </div>

      <div class="sp-actions-bar">
        <button class="sp-handoff-link" id="sp-handoff-btn">
          💬 Speak with Human Agent
        </button>
      </div>

      <div class="sp-footer">
        <input type="text" class="sp-textarea" placeholder="Ask a question in English or বাংলা..." />
        <button class="sp-send-btn" aria-label="Send message">
          <svg viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `;
  shadow.appendChild(widgetRoot);

  // DOM Elements
  const launcher = shadow.querySelector(".sp-launcher");
  const win = shadow.querySelector(".sp-window");
  const closeBtn = shadow.querySelector(".sp-close-btn");
  const body = shadow.querySelector("#sp-messages-body");
  const input = shadow.querySelector(".sp-textarea");
  const sendBtn = shadow.querySelector(".sp-send-btn");
  const handoffBtn = shadow.querySelector("#sp-handoff-btn");
  const botNameEl = shadow.querySelector(".sp-bot-name");

  // Toggle Widget
  launcher.addEventListener("click", () => {
    state.isOpen = !state.isOpen;
    if (state.isOpen) {
      win.classList.add("open");
      if (!state.conversationId) {
        initSession();
      } else {
        renderMessages();
      }
      setTimeout(() => input.focus(), 200);
    } else {
      win.classList.remove("open");
    }
  });

  closeBtn.addEventListener("click", () => {
    state.isOpen = false;
    win.classList.remove("open");
  });

  // Init Session API Call
  async function initSession(leadData = null) {
    try {
      const payload = {
        bot_key: botKey,
        customer_id: state.customerId,
      };
      if (leadData) {
        payload.customer_name = leadData.name;
        payload.customer_email = leadData.email;
        payload.customer_phone = leadData.phone;
      }

      const res = await fetch(`${apiBase}/api/v1/chat/init`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to initialize session");
      const data = await res.json();

      state.conversationId = data.conversation_id;
      state.botName = data.bot_name || state.botName;
      state.primaryColor = data.primary_color || state.primaryColor;
      state.welcomeMessage = data.welcome_message;
      state.suggestedQuestions = data.suggested_questions || [];
      state.preChatFormEnabled = data.pre_chat_form_enabled;

      host.style.setProperty("--sp-primary", state.primaryColor);
      botNameEl.textContent = state.botName;

      // Add Welcome Message if brand new
      if (state.messages.length === 0) {
        state.messages.push({
          sender: "bot",
          text: state.welcomeMessage,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sources: [],
        });
      }

      saveState();
      renderMessages();
    } catch (err) {
      console.error("SupportPilot Init Error:", err);
      state.messages.push({
        sender: "bot",
        text: "Unable to connect to support assistant. Please try refreshing the page.",
        time: "",
      });
      renderMessages();
    }
  }

  // Render Messages
  function renderMessages() {
    body.innerHTML = "";

    state.messages.forEach((m, idx) => {
      const msgDiv = document.createElement("div");
      msgDiv.className = `sp-msg ${m.sender}`;

      let sourcesHtml = "";
      if (m.sources && m.sources.length > 0) {
        sourcesHtml = `<div class="sp-sources">${m.sources
          .map((s) => `<span class="sp-source-tag">📚 ${escapeHtml(s.source || s.title || "Official Record")}</span>`)
          .join("")}</div>`;
      }

      msgDiv.innerHTML = `
        <div class="sp-bubble">${escapeHtml(m.text).replace(/\n/g, "<br/>")}</div>
        ${sourcesHtml}
        <div class="sp-msg-meta">${m.time || ""}</div>
      `;
      body.appendChild(msgDiv);
    });

    // If pre-chat form enabled and not yet submitted, render form under welcome message
    if (state.preChatFormEnabled && !state.preChatSubmitted && state.messages.length === 1) {
      renderPreChatForm();
    }

    // Render suggested questions pills if available
    if (state.suggestedQuestions.length > 0 && state.messages.length <= 2) {
      const suggestionsDiv = document.createElement("div");
      suggestionsDiv.className = "sp-suggestions";
      state.suggestedQuestions.forEach((q) => {
        const pill = document.createElement("button");
        pill.className = "sp-pill";
        pill.textContent = q;
        pill.addEventListener("click", () => {
          input.value = q;
          sendMessage();
        });
        suggestionsDiv.appendChild(pill);
      });
      body.appendChild(suggestionsDiv);
    }

    // Typing indicator
    if (state.isTyping) {
      const typingDiv = document.createElement("div");
      typingDiv.className = "sp-typing";
      typingDiv.innerHTML = '<span class="sp-dot"></span><span class="sp-dot"></span><span class="sp-dot"></span>';
      body.appendChild(typingDiv);
    }

    body.scrollTop = body.scrollHeight;
  }

  function renderPreChatForm() {
    const formDiv = document.createElement("div");
    formDiv.className = "sp-form";
    formDiv.innerHTML = `
      <h5>Contact Details (Optional)</h5>
      <input type="text" id="sp-form-name" class="sp-input" placeholder="Your Full Name" />
      <input type="email" id="sp-form-email" class="sp-input" placeholder="Email Address" />
      <input type="tel" id="sp-form-phone" class="sp-input" placeholder="Phone Number" />
      <button class="sp-btn-submit" id="sp-form-submit">Continue to Chat</button>
    `;

    formDiv.querySelector("#sp-form-submit").addEventListener("click", () => {
      const name = formDiv.querySelector("#sp-form-name").value.trim();
      const email = formDiv.querySelector("#sp-form-email").value.trim();
      const phone = formDiv.querySelector("#sp-form-phone").value.trim();

      state.preChatSubmitted = true;
      initSession({ name, email, phone });
    });

    body.appendChild(formDiv);
  }

  // Send Message
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || state.isTyping) return;

    input.value = "";
    sendBtn.disabled = true;

    // Add customer message
    state.messages.push({
      sender: "customer",
      text: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    state.isTyping = true;
    renderMessages();

    // Prepare bot message for streaming
    const botMsgIndex = state.messages.length;
    state.messages.push({
      sender: "bot",
      text: "",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sources: [],
    });

    try {
      // Use SSE streaming endpoint
      const streamUrl = `${apiBase}/api/v1/chat/stream?bot_key=${encodeURIComponent(botKey)}&conversation_id=${encodeURIComponent(state.conversationId)}&query=${encodeURIComponent(text)}&customer_id=${encodeURIComponent(state.customerId)}`;
      const response = await fetch(streamUrl);

      if (!response.ok) {
        throw new Error("Streaming error: " + response.statusText);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      state.isTyping = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.substring(6));
              if (eventData.type === "chunk") {
                state.messages[botMsgIndex].text += eventData.text;
                renderMessages();
              } else if (eventData.type === "sources") {
                state.messages[botMsgIndex].sources = eventData.data || [];
              }
            } catch (parseErr) {}
          }
        }
      }
    } catch (err) {
      console.error("Message Error:", err);
      state.isTyping = false;
      state.messages[botMsgIndex].text = "I apologize, but an error occurred while processing your question. Please try again.";
    } finally {
      sendBtn.disabled = false;
      saveState();
      renderMessages();
    }
  }

  // Trigger Human Handoff
  handoffBtn.addEventListener("click", async () => {
    if (!state.conversationId) return;
    try {
      const res = await fetch(`${apiBase}/api/v1/chat/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: state.conversationId,
          reason: "Customer requested live support agent in widget.",
        }),
      });
      const data = await res.json();
      state.messages.push({
        sender: "bot",
        text: data.message || "A human customer support specialist has been alerted and will join shortly.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      saveState();
      renderMessages();
    } catch (e) {
      alert("Handoff request failed. Please try again.");
    }
  });

  // Event Listeners for Input
  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function saveState() {
    localStorage.setItem(
      "sp_conv_" + botKey,
      JSON.stringify({
        conversationId: state.conversationId,
        preChatSubmitted: state.preChatSubmitted,
        messages: state.messages,
      })
    );
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
})();
