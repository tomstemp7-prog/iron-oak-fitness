(function () {
  'use strict';

  var script = document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var CLIENT_ID = script.getAttribute('data-client') || 'thrive';
  var API_URL   = (script.getAttribute('data-api') || '').replace(/\/$/, '');
  var COLOR     = script.getAttribute('data-color') || '#FF5C35';
  var BUSINESS  = script.getAttribute('data-name')  || 'Thrive London';
  var WELCOME   = "Hi! I'm the Thrive London assistant. Ask me anything about our coffee machines, service plans, or getting a quote.";
  var ERROR_MSG = 'Sorry, something went wrong. Please try again or call us on 020 3151 2000.';

  var conversationHistory = [];

  /* ---- Inject styles ---- */
  var css = [
    '#tcw-bubble{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:' + COLOR + ';box-shadow:0 4px 16px rgba(0,0,0,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2147483646;border:none;transition:transform .2s,box-shadow .2s;}',
    '#tcw-bubble:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(0,0,0,0.3);}',
    '#tcw-bubble svg{width:26px;height:26px;fill:#fff;}',
    '#tcw-window{position:fixed;bottom:92px;right:24px;width:380px;height:520px;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.2);display:flex;flex-direction:column;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fff;transition:opacity .2s,transform .2s;}',
    '#tcw-window.tcw-hidden{opacity:0;pointer-events:none;transform:translateY(12px);}',
    '#tcw-header{background:' + COLOR + ';padding:16px 18px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}',
    '#tcw-header-title{color:#fff;font-size:15px;font-weight:700;letter-spacing:.01em;}',
    '#tcw-close{background:none;border:none;cursor:pointer;color:#fff;opacity:.85;padding:4px;display:flex;align-items:center;justify-content:center;border-radius:50%;transition:opacity .15s;}',
    '#tcw-close:hover{opacity:1;}',
    '#tcw-close svg{width:18px;height:18px;stroke:#fff;fill:none;}',
    '#tcw-messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#fafafa;}',
    '#tcw-messages::-webkit-scrollbar{width:4px;}',
    '#tcw-messages::-webkit-scrollbar-thumb{background:#ddd;border-radius:4px;}',
    '.tcw-msg{max-width:82%;padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.5;word-wrap:break-word;}',
    '.tcw-msg-bot{background:#efefef;color:#1a1a1a;align-self:flex-start;border-bottom-left-radius:4px;}',
    '.tcw-msg-user{background:' + COLOR + ';color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}',
    '.tcw-typing{display:flex;gap:5px;align-items:center;padding:10px 14px;background:#efefef;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;}',
    '.tcw-dot{width:7px;height:7px;border-radius:50%;background:#aaa;animation:tcw-bounce .9s infinite ease-in-out;}',
    '.tcw-dot:nth-child(2){animation-delay:.15s;}',
    '.tcw-dot:nth-child(3){animation-delay:.3s;}',
    '@keyframes tcw-bounce{0%,80%,100%{transform:translateY(0);}40%{transform:translateY(-6px);}}',
    '#tcw-footer{padding:10px 12px;border-top:1px solid #ebebeb;display:flex;gap:8px;align-items:center;background:#fff;flex-shrink:0;}',
    '#tcw-input{flex:1;border:1px solid #e0e0e0;border-radius:22px;padding:9px 16px;font-size:14px;outline:none;color:#1a1a1a;transition:border-color .15s;background:#fff;}',
    '#tcw-input:focus{border-color:' + COLOR + ';}',
    '#tcw-send{background:' + COLOR + ';border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s;}',
    '#tcw-send:hover{opacity:.88;}',
    '#tcw-send svg{width:16px;height:16px;fill:#fff;}',
    '#tcw-powered{text-align:center;font-size:11px;color:#bbb;padding:6px 0 4px;background:#fff;flex-shrink:0;}',
    '@media(max-width:440px){#tcw-window{width:calc(100vw - 16px);right:8px;bottom:80px;height:calc(100vh - 100px);border-radius:12px;}#tcw-bubble{bottom:16px;right:16px;}}'
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---- Build DOM ---- */
  var bubble = document.createElement('button');
  bubble.id = 'tcw-bubble';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';

  var win = document.createElement('div');
  win.id = 'tcw-window';
  win.className = 'tcw-hidden';
  win.setAttribute('role', 'dialog');
  win.setAttribute('aria-label', BUSINESS + ' chat');

  win.innerHTML = [
    '<div id="tcw-header">',
      '<span id="tcw-header-title">' + escHtml(BUSINESS) + '</span>',
      '<button id="tcw-close" aria-label="Close chat">',
        '<svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      '</button>',
    '</div>',
    '<div id="tcw-messages"></div>',
    '<div id="tcw-footer">',
      '<input id="tcw-input" type="text" placeholder="Ask a question..." autocomplete="off" maxlength="500">',
      '<button id="tcw-send" aria-label="Send">',
        '<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>',
      '</button>',
    '</div>',
    '<div id="tcw-powered">Powered by AI</div>'
  ].join('');

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  var messagesEl = document.getElementById('tcw-messages');
  var inputEl    = document.getElementById('tcw-input');
  var sendBtn    = document.getElementById('tcw-send');
  var closeBtn   = document.getElementById('tcw-close');

  /* ---- Welcome message ---- */
  appendMessage('bot', WELCOME);

  /* ---- Events ---- */
  bubble.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);
  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  function openChat() {
    win.classList.remove('tcw-hidden');
    bubble.style.display = 'none';
    inputEl.focus();
  }

  function closeChat() {
    win.classList.add('tcw-hidden');
    bubble.style.display = 'flex';
  }

  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    appendMessage('user', text);
    var indicator = showTyping();
    setInputDisabled(true);

    fetch(API_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        client_id: CLIENT_ID,
        conversation_history: conversationHistory
      })
    })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      removeTyping(indicator);
      conversationHistory = data.conversation_history || conversationHistory;
      appendMessage('bot', data.response || ERROR_MSG);
    })
    .catch(function () {
      removeTyping(indicator);
      appendMessage('bot', ERROR_MSG);
    })
    .finally(function () {
      setInputDisabled(false);
      inputEl.focus();
    });
  }

  function appendMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'tcw-msg ' + (role === 'user' ? 'tcw-msg-user' : 'tcw-msg-bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'tcw-typing';
    el.innerHTML = '<div class="tcw-dot"></div><div class="tcw-dot"></div><div class="tcw-dot"></div>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function removeTyping(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function setInputDisabled(disabled) {
    inputEl.disabled  = disabled;
    sendBtn.disabled  = disabled;
    sendBtn.style.opacity = disabled ? '0.5' : '1';
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
})();
