/**
 * Generates a self-contained embeddable widget JavaScript snippet.
 *
 * Features:
 * - Shadow DOM isolation (host-page CSS cannot bleed in)
 * - Pre-chat form (name + phone) when preChatFormEnabled is set on config
 * - localStorage persistence for visitor ID, identity, and message cache
 * - POSTs messages to /api/v1/widgets/:orgSlug/message
 * - WhatsApp click-to-chat fallback when no API connectivity
 * - Smooth open/close animations
 */
export function generateWidgetScript(orgSlug: string): string {
  // Allow only safe slug characters before embedding into JS string
  const safeSlug = orgSlug.replace(/[^a-z0-9-]/g, '');

  return `
(function () {
  if (window.__wazelo_widget_loaded) return;
  window.__wazelo_widget_loaded = true;

  var SLUG = '${safeSlug}';
  var API_BASE = (function () {
    var s = document.currentScript;
    return s ? new URL(s.src).origin + '/api/v1' : '';
  })();
  var STORAGE_KEY = 'wazelo_' + SLUG;

  // ── LocalStorage helpers ─────────────────────────────────────────────────
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveState(patch) {
    try {
      var s = loadState();
      Object.assign(s, patch);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }
  function getVisitorId() {
    var s = loadState();
    if (!s.vid) {
      s.vid = 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      saveState(s);
    }
    return s.vid;
  }

  // ── XSS escape ───────────────────────────────────────────────────────────
  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ── Fetch config then render ─────────────────────────────────────────────
  function init() {
    fetch(API_BASE + '/widgets/' + encodeURIComponent(SLUG) + '/config', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) { if (cfg) render(cfg); })
      .catch(function () {});
  }

  // ── Send message to backend ──────────────────────────────────────────────
  function sendMessage(cfg, body, visitorName, visitorPhone, onSuccess, onError) {
    fetch(API_BASE + '/widgets/' + encodeURIComponent(SLUG) + '/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: getVisitorId(),
        visitorName: visitorName || undefined,
        visitorPhone: visitorPhone || undefined,
        body: body,
        pageUrl: window.location.href,
      }),
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) { onSuccess(data); })
      .catch(function (err) { onError(err); });
  }

  // ── Add a message bubble to the chat area ────────────────────────────────
  function appendBubble(chatArea, text, sender, color) {
    var isVisitor = sender === 'visitor';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:' + (isVisitor ? 'flex-end' : 'flex-start') + ';margin-bottom:8px;';
    var bubble = document.createElement('div');
    bubble.style.cssText =
      'max-width:80%;padding:8px 12px;border-radius:' + (isVisitor ? '14px 14px 4px 14px' : '14px 14px 14px 4px') + ';' +
      'font-size:13px;line-height:1.4;word-break:break-word;' +
      (isVisitor ? 'background:' + color + ';color:#fff;' : 'background:#f1f5f9;color:#1e293b;');
    bubble.textContent = text;
    row.appendChild(bubble);
    chatArea.appendChild(row);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // ── Render the full widget ────────────────────────────────────────────────
  function render(cfg) {
    var pos = cfg.position || 'bottom-right';
    var isRight = pos.indexOf('right') >= 0;
    var isCenter = pos.indexOf('center') >= 0;
    var color = /^#[0-9A-Fa-f]{3,6}$/.test(cfg.primaryColor) ? cfg.primaryColor : '#6366f1';
    var state = loadState();
    var hasIdentity = !!(state.name || state.phone);

    // ── Outer container ──────────────────────────────────────────────────
    var host = document.createElement('div');
    host.id = 'wazelo-widget-host';
    host.style.cssText =
      'position:fixed;z-index:2147483647;bottom:20px;' +
      (isCenter ? 'left:50%;transform:translateX(-50%);' : isRight ? 'right:20px;' : 'left:20px;') +
      'font-family:system-ui,-apple-system,sans-serif;';

    // ── Shadow DOM ───────────────────────────────────────────────────────
    var shadow = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = [
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      '.panel { width: 340px; background: #fff; border-radius: 16px;',
      '  box-shadow: 0 8px 40px rgba(0,0,0,.16); display: none; flex-direction: column;',
      '  overflow: hidden; margin-bottom: 12px; max-height: 500px; }',
      '.panel.open { display: flex; }',
      '.header { background: ' + color + '; color: #fff; padding: 14px 16px; flex-shrink: 0; }',
      '.header-name { font-size: 15px; font-weight: 600; }',
      '.header-sub { font-size: 12px; opacity: .8; margin-top: 2px; }',
      '.chat-area { flex: 1; overflow-y: auto; padding: 12px 16px; background: #fff; min-height: 100px; }',
      '.pre-chat { padding: 16px; display: flex; flex-direction: column; gap: 10px; }',
      '.pre-chat input { width: 100%; padding: 8px 10px; border: 1px solid #e2e8f0;',
      '  border-radius: 8px; font-size: 13px; outline: none; }',
      '.pre-chat input:focus { border-color: ' + color + '; }',
      '.input-row { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid #f1f5f9; flex-shrink: 0; }',
      '.input-row textarea { flex: 1; resize: none; border: 1px solid #e2e8f0; border-radius: 8px;',
      '  padding: 8px 10px; font-size: 13px; line-height: 1.4; height: 40px; max-height: 120px;',
      '  overflow-y: auto; outline: none; font-family: inherit; }',
      '.input-row textarea:focus { border-color: ' + color + '; }',
      '.send-btn { width: 40px; height: 40px; border-radius: 50%; background: ' + color + ';',
      '  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;',
      '  flex-shrink: 0; }',
      '.send-btn:hover { opacity: .85; }',
      '.send-btn svg { width: 18px; height: 18px; fill: white; }',
      '.wa-link { display: flex; align-items: center; gap: 8px; background: #25D366; color: #fff;',
      '  text-decoration: none; padding: 10px 14px; border-radius: 10px; font-size: 13px;',
      '  font-weight: 500; margin: 12px; }',
      '.wa-link svg { width: 20px; height: 20px; fill: white; flex-shrink: 0; }',
      '.fab { width: 56px; height: 56px; border-radius: 50%; background: ' + color + ';',
      '  border: none; cursor: pointer; display: flex; align-items: center;',
      '  justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,.2);',
      '  transition: transform .2s, box-shadow .2s; }',
      '.fab:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,.25); }',
      '.fab svg { width: 26px; height: 26px; fill: white; }',
      '.submit-btn { padding: 9px 16px; background: ' + color + '; color: #fff; border: none;',
      '  border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; }',
      '.submit-btn:hover { opacity: .85; }',
      '.error-msg { font-size: 12px; color: #ef4444; }',
      '.sent-note { font-size: 12px; color: #64748b; text-align: center; padding: 8px 0; }',
    ].join('\\n');
    shadow.appendChild(style);

    // ── Panel ────────────────────────────────────────────────────────────
    var panel = document.createElement('div');
    panel.className = 'panel';

    // Header
    var header = document.createElement('div');
    header.className = 'header';
    header.innerHTML =
      '<div class="header-name">' + esc(cfg.companyName || 'Chat') + '</div>' +
      '<div class="header-sub">Typically replies in minutes</div>';
    panel.appendChild(header);

    // ── Pre-chat form (shown only on first open if enabled + no identity) ──
    var preChatEl = null;
    if (cfg.preChatFormEnabled && !hasIdentity) {
      preChatEl = document.createElement('div');
      preChatEl.className = 'pre-chat';

      var nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = 'Your name';
      nameInput.value = state.name || '';

      var phoneInput = document.createElement('input');
      phoneInput.type = 'tel';
      phoneInput.placeholder = 'Your phone (optional)';
      phoneInput.value = state.phone || '';

      var errorEl = document.createElement('div');
      errorEl.className = 'error-msg';

      var submitBtn = document.createElement('button');
      submitBtn.className = 'submit-btn';
      submitBtn.textContent = 'Start Chat';

      submitBtn.onclick = function () {
        if (!nameInput.value.trim()) {
          errorEl.textContent = 'Please enter your name.';
          return;
        }
        errorEl.textContent = '';
        saveState({ name: nameInput.value.trim(), phone: phoneInput.value.trim() });
        panel.removeChild(preChatEl);
        panel.insertBefore(chatArea, inputRow);
        preChatEl = null;
      };

      preChatEl.appendChild(nameInput);
      preChatEl.appendChild(phoneInput);
      preChatEl.appendChild(errorEl);
      preChatEl.appendChild(submitBtn);
      panel.appendChild(preChatEl);
    }

    // ── Chat area ─────────────────────────────────────────────────────────
    var chatArea = document.createElement('div');
    chatArea.className = 'chat-area';

    // Restore cached messages
    var cached = state.msgs || [];
    cached.forEach(function (m) { appendBubble(chatArea, m.body, m.sender, color); });

    // Welcome bubble
    if (!cached.length) {
      appendBubble(chatArea, cfg.welcomeMessage || 'Hi! How can we help you?', 'agent', color);
    }

    if (!cfg.preChatFormEnabled || hasIdentity) {
      panel.appendChild(chatArea);
    }

    // ── Input row ─────────────────────────────────────────────────────────
    var inputRow = document.createElement('div');
    inputRow.className = 'input-row';

    if (cfg.whatsappNumber) {
      // Simple WA link mode — still inside the popup
      var waLink = document.createElement('a');
      waLink.className = 'wa-link';
      waLink.href = 'https://wa.me/' + cfg.whatsappNumber.replace(/[^0-9]/g, '') +
        '?text=' + encodeURIComponent(cfg.welcomeMessage || 'Hi!');
      waLink.target = '_blank';
      waLink.rel = 'noopener noreferrer';
      waLink.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.476A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.115 0-4.142-.659-5.853-1.903l-.42-.298-2.744.877.877-2.622-.326-.448A9.71 9.71 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>' +
        'Chat on WhatsApp';
      inputRow.appendChild(waLink);
    } else {
      // Full message input
      var textarea = document.createElement('textarea');
      textarea.placeholder = cfg.placeholder || 'Type a message...';

      var sendBtn = document.createElement('button');
      sendBtn.className = 'send-btn';
      sendBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

      function doSend() {
        var text = textarea.value.trim();
        if (!text) return;
        textarea.value = '';
        textarea.style.height = '40px';

        var s = loadState();
        appendBubble(chatArea, text, 'visitor', color);

        // Persist to local cache (keep last 20)
        var msgs = s.msgs || [];
        msgs.push({ body: text, sender: 'visitor' });
        if (msgs.length > 20) msgs = msgs.slice(-20);
        saveState({ msgs: msgs });

        sendMessage(cfg, text, s.name, s.phone,
          function () {
            // Success — optionally append an auto-reply in future
          },
          function () {
            appendBubble(chatArea, 'Failed to send. Please try again.', 'agent', color);
          }
        );
      }

      sendBtn.onclick = doSend;
      textarea.onkeydown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
      };
      textarea.oninput = function () {
        this.style.height = '40px';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      };

      inputRow.appendChild(textarea);
      inputRow.appendChild(sendBtn);
    }

    panel.appendChild(inputRow);

    // ── FAB button ────────────────────────────────────────────────────────
    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'Open chat');

    var iconChat = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    var iconClose = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    fab.innerHTML = iconChat;

    var isOpen = false;
    fab.onclick = function () {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      fab.innerHTML = isOpen ? iconClose : iconChat;
      fab.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
    };

    shadow.appendChild(panel);
    shadow.appendChild(fab);
    document.body.appendChild(host);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
