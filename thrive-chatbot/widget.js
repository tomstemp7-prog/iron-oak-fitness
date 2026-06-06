(function () {
  "use strict";

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var CLIENT_ID = script.getAttribute("data-client") || "thrive";
  var API_URL = (script.getAttribute("data-api") || "").replace(/\/$/, "");
  var PRIMARY_COLOR = script.getAttribute("data-color") || "#FF5C35";
  var BUSINESS_NAME = script.getAttribute("data-name") || "Thrive London";
  var WELCOME_MSG = script.getAttribute("data-welcome") ||
    "Hi! I’m the Thrive London assistant. Ask me anything about our coffee machines, service plans, or getting a quote.";

  var conversationHistory = [];
  var isOpen = false;
  var isWaiting = false;

  /* ── Styles ─────────────────────────────────────────────────────────── */
  var css = [
    "#tcw-bubble{position:fixed;bottom:24px;right:24px;z-index:2147483647;width:56px;height:56px;border-radius:50%;background:" + PRIMARY_COLOR + ";cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,.22);transition:transform .15s ease;}",
    "#tcw-bubble:hover{transform:scale(1.08);}",
    "#tcw-bubble svg{width:26px;height:26px;fill:#fff;transition:opacity .15s;}",
    "#tcw-window{position:fixed;bottom:92px;right:24px;z-index:2147483646;width:380px;height:520px;border-radius:16px;background:#fff;box-shadow:0 8px 40px rgba(0,0,0,.18);display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;transform:scale(.92) translateY(12px);opacity:0;pointer-events:none;transition:transform .2s ease,opacity .2s ease;}",
    "#tcw-window.tcw-open{transform:scale(1) translateY(0);opacity:1;pointer-events:all;}",
    "#tcw-header{background:" + PRIMARY_COLOR + ";color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}",
    "#tcw-header-title{font-weight:600;font-size:15px;letter-spacing:.01em;}",
    "#tcw-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.8);padding:2px;display:flex;align-items:center;justify-content:center;border-radius:4px;transition:color .1s;}",
    "#tcw-close:hover{color:#fff;}",
    "#tcw-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}",
    "#tcw-messages::-webkit-scrollbar{width:4px;}",
    "#tcw-messages::-webkit-scrollbar-track{background:transparent;}",
    "#tcw-messages::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px;}",
    ".tcw-msg{max-width:82%;padding:10px 13px;border-radius:16px;line-height:1.5;word-break:break-word;animation:tcwFadeIn .18s ease;}",
    "@keyframes tcwFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}",
    ".tcw-msg-bot{background:#f0f0f0;color:#1a1a1a;border-bottom-left-radius:4px;align-self:flex-start;}",
    ".tcw-msg-user{background:" + PRIMARY_COLOR + ";color:#fff;border-bottom-right-radius:4px;align-self:flex-end;}",
    ".tcw-msg a{color:inherit;text-decoration:underline;}",
    "#tcw-typing{display:flex;gap:5px;align-items:center;padding:10px 13px;background:#f0f0f0;border-radius:16px;border-bottom-left-radius:4px;align-self:flex-start;animation:tcwFadeIn .18s ease;}",
    "#tcw-typing span{width:7px;height:7px;border-radius:50%;background:#aaa;animation:tcwDot 1.2s infinite;}",
    "#tcw-typing span:nth-child(2){animation-delay:.2s;}",
    "#tcw-typing span:nth-child(3){animation-delay:.4s;}",
    "@keyframes tcwDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}",
    "#tcw-footer{border-top:1px solid #efefef;padding:10px 12px;flex-shrink:0;}",
    "#tcw-form{display:flex;gap:8px;align-items:flex-end;}",
    "#tcw-input{flex:1;border:1px solid #ddd;border-radius:10px;padding:9px 12px;font-size:14px;font-family:inherit;resize:none;outline:none;max-height:100px;overflow-y:auto;line-height:1.4;transition:border-color .15s;}",
    "#tcw-input:focus{border-color:" + PRIMARY_COLOR + ";}",
    "#tcw-send{background:" + PRIMARY_COLOR + ";border:none;border-radius:10px;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}",
    "#tcw-send:hover{opacity:.88;}",
    "#tcw-send:disabled{opacity:.4;cursor:not-allowed;}",
    "#tcw-send svg{width:17px;height:17px;fill:#fff;}",
    "#tcw-powered{text-align:center;font-size:11px;color:#bbb;padding:4px 0 2px;letter-spacing:.02em;}",
    "@media(max-width:440px){#tcw-window{width:calc(100vw - 16px);right:8px;bottom:80px;height:calc(100vh - 100px);max-height:560px;}#tcw-bubble{right:16px;bottom:16px;}}"
  ].join("");

  /* ── DOM helpers ─────────────────────────────────────────────────────── */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "innerHTML") node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (children) children.forEach(function (c) { node.appendChild(c); });
    return node;
  }

  function injectStyles() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── Build UI ────────────────────────────────────────────────────────── */
  function buildWidget() {
    var bubble = el("button", { id: "tcw-bubble", "aria-label": "Open chat" });
    bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

    var header = el("div", { id: "tcw-header" }, [
      el("span", { id: "tcw-header-title", innerHTML: escapeHtml(BUSINESS_NAME) }),
      (function () {
        var btn = el("button", { id: "tcw-close", "aria-label": "Close chat" });
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        return btn;
      })()
    ]);

    var messages = el("div", { id: "tcw-messages", role: "log", "aria-live": "polite" });

    var inputEl = el("textarea", { id: "tcw-input", placeholder: "Ask a question…", rows: "1", "aria-label": "Message" });
    var sendBtn = el("button", { id: "tcw-send", "aria-label": "Send" });
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

    var form = el("div", { id: "tcw-form" }, [inputEl, sendBtn]);
    var powered = el("div", { id: "tcw-powered" });
    powered.textContent = "Powered by AI";
    var footer = el("div", { id: "tcw-footer" }, [form, powered]);

    var win = el("div", { id: "tcw-window", role: "dialog", "aria-label": BUSINESS_NAME + " chat" }, [header, messages, footer]);

    document.body.appendChild(bubble);
    document.body.appendChild(win);

    // events
    bubble.addEventListener("click", toggleChat);
    document.getElementById("tcw-close").addEventListener("click", toggleChat);
    sendBtn.addEventListener("click", handleSend);
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    inputEl.addEventListener("input", autoResize);

    // welcome
    appendMessage("bot", WELCOME_MSG);
  }

  /* ── Chat logic ──────────────────────────────────────────────────────── */
  function toggleChat() {
    isOpen = !isOpen;
    var win = document.getElementById("tcw-window");
    if (isOpen) {
      win.classList.add("tcw-open");
      document.getElementById("tcw-input").focus();
    } else {
      win.classList.remove("tcw-open");
    }
  }

  function handleSend() {
    if (isWaiting) return;
    var input = document.getElementById("tcw-input");
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    autoResize.call(input);
    appendMessage("user", text);
    sendMessage(text);
  }

  function sendMessage(text) {
    isWaiting = true;
    document.getElementById("tcw-send").disabled = true;
    showTyping();

    var payload = JSON.stringify({
      message: text,
      client_id: CLIENT_ID,
      conversation_history: conversationHistory
    });

    fetch(API_URL + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        hideTyping();
        isWaiting = false;
        document.getElementById("tcw-send").disabled = false;
        if (result.ok) {
          conversationHistory = result.data.conversation_history || [];
          appendMessage("bot", result.data.response || "Sorry, I didn’t get a response. Please try again.");
        } else {
          appendMessage("bot", "Sorry, something went wrong. Please try again or call us on 020 3151 2000.");
        }
      })
      .catch(function () {
        hideTyping();
        isWaiting = false;
        document.getElementById("tcw-send").disabled = false;
        appendMessage("bot", "Sorry, something went wrong. Please try again or call us on 020 3151 2000.");
      });
  }

  function appendMessage(role, text) {
    var messages = document.getElementById("tcw-messages");
    var div = document.createElement("div");
    div.className = "tcw-msg tcw-msg-" + role;
    div.innerHTML = formatText(text);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    var messages = document.getElementById("tcw-messages");
    var indicator = document.createElement("div");
    indicator.id = "tcw-typing";
    indicator.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(indicator);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var indicator = document.getElementById("tcw-typing");
    if (indicator) indicator.parentNode.removeChild(indicator);
  }

  /* ── Utilities ───────────────────────────────────────────────────────── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatText(text) {
    // escape HTML then restore safe links and line breaks
    var escaped = escapeHtml(text);
    // linkify URLs
    escaped = escaped.replace(
      /(https?:\/\/[^\s<>"]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    // line breaks
    escaped = escaped.replace(/\n/g, "<br>");
    return escaped;
  }

  function autoResize() {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 100) + "px";
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  function init() {
    if (!API_URL) {
      console.warn("[Thrive Chat Widget] data-api attribute is required.");
      return;
    }
    injectStyles();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", buildWidget);
    } else {
      buildWidget();
    }
  }

  init();
})();
