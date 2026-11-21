/**
 * Generates a self-contained embeddable widget JavaScript snippet.
 *
 * The visitor's side of the website chat:
 * - Shadow DOM isolation (host-page CSS cannot bleed in)
 * - A form before the chat: first name, mobile and email are required; the
 *   "I agree to be contacted" box is optional (ticked = saved as a contact)
 * - AI answers, "Talk to a person", who is answering now (AI / connecting / a person / ended)
 * - When nobody can take the chat: a one-tap "Yes, contact me"
 * - Polls for replies every 4 s while open; localStorage keeps the visitor id and recent messages
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
  var BASE = API_BASE + '/widgets/' + encodeURIComponent(SLUG);

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

  function post(path, body) {
    return fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) {
          // Field errors ({ errors: { email: ['Enter a valid email'] } }) say more than "Validation failed"
          var fieldMsgs = data && data.errors && typeof data.errors === 'object'
            ? Object.keys(data.errors).map(function (k) { return [].concat(data.errors[k])[0]; }).filter(Boolean)
            : [];
          var msg = fieldMsgs[0] || (data && data.message);
          throw new Error(Array.isArray(msg) ? msg[0] : msg || 'Something went wrong. Please try again.');
        }
        return data;
      });
    });
  }

  // ── Fetch config then render ─────────────────────────────────────────────
  function init() {
    fetch(BASE + '/config', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) { if (cfg) render(cfg); })
      .catch(function () {});
  }

  function render(cfg) {
    var pos = cfg.position || 'bottom-right';
    var isRight = pos.indexOf('right') >= 0;
    var isCenter = pos.indexOf('center') >= 0;
    var color = /^#[0-9A-Fa-f]{3,6}$/.test(cfg.primaryColor) ? cfg.primaryColor : '#6366f1';
    var company = cfg.companyName || 'us';
    var chat = { state: 'AI', agentName: null, offerFollowUp: false, needsDetails: true };

    var host = document.createElement('div');
    host.id = 'wazelo-widget-host';
    host.style.cssText =
      'position:fixed;z-index:2147483647;bottom:20px;' +
      (isCenter ? 'left:50%;transform:translateX(-50%);' : isRight ? 'right:20px;' : 'left:20px;') +
      // Keep the open/close button under the panel's corner (not at its left edge)
      'display:flex;flex-direction:column;align-items:' +
      (isCenter ? 'center' : isRight ? 'flex-end' : 'flex-start') +
      ';font-family:system-ui,-apple-system,sans-serif;';
    var shadow = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = [
      '* { box-sizing: border-box; margin: 0; padding: 0; }',
      '.panel { width: 340px; max-width: calc(100vw - 40px); background: #fff; border-radius: 16px;',
      '  box-shadow: 0 8px 40px rgba(0,0,0,.16); display: none; flex-direction: column;',
      '  overflow: hidden; margin-bottom: 12px; height: 520px; max-height: calc(100vh - 110px); }',
      '.panel.open { display: flex; }',
      '.header { background: ' + color + '; color: #fff; padding: 12px 14px; flex-shrink: 0; display: flex; align-items: center; gap: 10px; }',
      '.header-text { flex: 1; min-width: 0; }',
      '.header-name { font-size: 15px; font-weight: 600; }',
      '.header-sub { font-size: 12px; opacity: .85; margin-top: 2px; }',
      '.end-btn { background: rgba(255,255,255,.18); color: #fff; border: 0; border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; }',
      '.end-btn:focus-visible, button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid ' + color + '; outline-offset: 2px; }',
      '.chat-area { flex: 1; overflow-y: auto; padding: 12px 14px; background: #fff; }',
      '.row { display: flex; margin-bottom: 8px; }',
      '.bubble { max-width: 80%; padding: 8px 12px; font-size: 13px; line-height: 1.45; word-break: break-word; white-space: pre-wrap; }',
      '.visitor { justify-content: flex-end; }',
      '.visitor .bubble { background: ' + color + '; color: #fff; border-radius: 14px 14px 4px 14px; }',
      '.agent .bubble { background: #f1f5f9; color: #1e293b; border-radius: 14px 14px 14px 4px; }',
      '.system { justify-content: center; }',
      '.system .bubble { background: none; color: #64748b; font-size: 12px; padding: 2px 8px; text-align: center; }',
      '.form { padding: 16px; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }',
      '.form h2 { font-size: 15px; color: #0f172a; }',
      '.form p.lead { font-size: 13px; color: #475569; }',
      '.field label { display: block; font-size: 12px; font-weight: 500; color: #334155; margin-bottom: 4px; }',
      '.field input { width: 100%; padding: 9px 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; }',
      '.field input:focus { border-color: ' + color + '; }',
      '.check { display: flex; gap: 8px; align-items: flex-start; font-size: 12px; color: #334155; line-height: 1.4; }',
      '.check input { margin-top: 2px; width: 16px; height: 16px; flex-shrink: 0; }',
      '.primary { padding: 10px 16px; background: ' + color + '; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }',
      '.primary[disabled] { opacity: .6; cursor: default; }',
      '.error-msg { font-size: 12px; color: #dc2626; min-height: 1em; }',
      '.card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin: 4px 0 10px; display: flex; flex-direction: column; gap: 8px; }',
      '.card p { font-size: 13px; color: #334155; }',
      '.person-row { padding: 6px 14px 0; flex-shrink: 0; }',
      '.link-btn { background: none; border: 0; color: ' + color + '; font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 0; }',
      '.input-row { display: flex; gap: 8px; padding: 8px 12px 10px; flex-shrink: 0; }',
      '.input-row textarea { flex: 1; resize: none; border: 1px solid #cbd5e1; border-radius: 8px;',
      '  padding: 9px 10px; font-size: 14px; line-height: 1.4; height: 40px; max-height: 120px;',
      '  overflow-y: auto; outline: none; font-family: inherit; }',
      '.input-row textarea:focus { border-color: ' + color + '; }',
      '.send-btn { width: 40px; height: 40px; border-radius: 50%; background: ' + color + ';',
      '  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }',
      '.send-btn svg { width: 18px; height: 18px; fill: white; }',
      '.fab { width: 56px; height: 56px; border-radius: 50%; background: ' + color + ';',
      '  border: none; cursor: pointer; display: flex; align-items: center;',
      '  justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,.2); transition: transform .2s; }',
      '.fab:hover { transform: scale(1.06); }',
      '.fab svg { width: 26px; height: 26px; fill: white; }',
      '@media (prefers-reduced-motion: reduce) { .fab { transition: none; } }',
    ].join('\\n');
    shadow.appendChild(style);

    var panel = document.createElement('div');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chat with ' + company);

    // ── Header: who is answering ─────────────────────────────────────────
    var header = document.createElement('div');
    header.className = 'header';
    var headerText = document.createElement('div');
    headerText.className = 'header-text';
    var headerName = document.createElement('div');
    headerName.className = 'header-name';
    headerName.textContent = cfg.companyName || 'Chat';
    var headerSub = document.createElement('div');
    headerSub.className = 'header-sub';
    headerSub.setAttribute('aria-live', 'polite');
    headerText.appendChild(headerName);
    headerText.appendChild(headerSub);
    var endBtn = document.createElement('button');
    endBtn.className = 'end-btn';
    endBtn.type = 'button';
    endBtn.textContent = 'End chat';
    header.appendChild(headerText);
    header.appendChild(endBtn);
    panel.appendChild(header);

    // ── Form before the chat ─────────────────────────────────────────────
    var form = document.createElement('form');
    form.className = 'form';
    form.noValidate = true;
    var consentLabel = 'I agree to be contacted by ' + company + ' on WhatsApp and email.';
    form.innerHTML =
      '<h2>Before we start</h2>' +
      '<p class="lead">Tell us who you are, then ask us anything.</p>' +
      field('wz-name', 'First name', 'text', 'given-name') +
      field('wz-phone', 'Mobile number (with country code)', 'tel', 'tel') +
      field('wz-email', 'Email', 'email', 'email') +
      '<label class="check"><input type="checkbox" id="wz-consent" /><span></span></label>' +
      '<div class="error-msg" role="alert" id="wz-error"></div>' +
      '<button type="submit" class="primary" id="wz-start">Start chat</button>';
    form.querySelector('.check span').textContent = consentLabel;
    function field(id, label, type, autocomplete) {
      return '<div class="field"><label for="' + id + '">' + label + '</label>' +
        '<input id="' + id + '" type="' + type + '" autocomplete="' + autocomplete + '" required /></div>';
    }

    // ── Chat ─────────────────────────────────────────────────────────────
    var chatArea = document.createElement('div');
    chatArea.className = 'chat-area';
    chatArea.setAttribute('aria-live', 'polite');

    var followCard = document.createElement('div');
    followCard.className = 'card';
    followCard.innerHTML = '<p></p><button type="button" class="primary">Yes, contact me</button><div class="error-msg" role="alert"></div>';
    followCard.querySelector('p').textContent = consentLabel;

    var personRow = document.createElement('div');
    personRow.className = 'person-row';
    var personBtn = document.createElement('button');
    personBtn.type = 'button';
    personBtn.className = 'link-btn';
    personBtn.textContent = 'Talk to a person';
    personRow.appendChild(personBtn);

    var inputRow = document.createElement('div');
    inputRow.className = 'input-row';
    var textarea = document.createElement('textarea');
    textarea.placeholder = cfg.placeholder || 'Type a message...';
    textarea.setAttribute('aria-label', 'Message');
    var sendBtn = document.createElement('button');
    sendBtn.type = 'button';
    sendBtn.className = 'send-btn';
    sendBtn.setAttribute('aria-label', 'Send');
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
    inputRow.appendChild(textarea);
    inputRow.appendChild(sendBtn);

    function appendBubble(text, sender, remember) {
      var kind = sender === 'visitor' ? 'visitor' : sender === 'system' ? 'system' : 'agent';
      var row = document.createElement('div');
      row.className = 'row ' + kind;
      var bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = text;
      row.appendChild(bubble);
      chatArea.insertBefore(row, followCard.parentNode === chatArea ? followCard : null);
      chatArea.scrollTop = chatArea.scrollHeight;
      if (remember) {
        var s = loadState();
        var msgs = s.msgs || [];
        msgs.push({ body: text, sender: kind });
        if (msgs.length > 30) msgs = msgs.slice(-30);
        saveState({ msgs: msgs });
      }
      return row;
    }

    function rememberReply(id, createdAt) {
      var st = loadState();
      var seen = st.seen || [];
      if (seen.indexOf(id) < 0) seen.push(id);
      if (seen.length > 150) seen = seen.slice(-150);
      var patch = { seen: seen };
      if (createdAt && (!st.lastAt || createdAt > st.lastAt)) patch.lastAt = createdAt;
      saveState(patch);
    }
    function showReply(m) {
      if (!m || !m.id) return;
      if ((loadState().seen || []).indexOf(m.id) < 0) appendBubble(m.body, m.sender, true);
      rememberReply(m.id, m.createdAt);
    }

    // ── What the visitor sees for each state ─────────────────────────────
    function applyChat(next) {
      if (!next) return;
      chat = next;
      var sub =
        // offerFollowUp = nobody can take it now (offline / after hours): don't promise "connecting"
        // The business name, not "our team": reads right for a team and for a solo freelancer
        chat.state === 'WAITING' ? (chat.offerFollowUp ? "You'll get a reply here soon" : 'Connecting you to ' + company + '…') :
        chat.state === 'PERSON' ? (chat.agentName ? chat.agentName + ' from ' + company : 'Chatting with ' + company) :
        chat.state === 'ENDED' ? 'Chat ended · write to start again' :
        cfg.aiAssistantEnabled ? 'AI assistant · replies instantly' : 'Typically replies in minutes';
      headerSub.textContent = sub;
      endBtn.style.display = chat.state === 'ENDED' || chat.needsDetails ? 'none' : '';
      personRow.style.display = chat.state === 'AI' ? '' : 'none';
      var showFollow = chat.state === 'WAITING' && chat.offerFollowUp && !chat.consentGiven;
      if (showFollow && followCard.parentNode !== chatArea) { chatArea.appendChild(followCard); chatArea.scrollTop = chatArea.scrollHeight; }
      if (!showFollow && followCard.parentNode === chatArea) chatArea.removeChild(followCard);
      showView(chat.needsDetails ? 'form' : 'chat');
    }

    var view = null;
    function showView(next) {
      if (view === next) return;
      view = next;
      [form, chatArea, personRow, inputRow].forEach(function (el) { if (el.parentNode === panel) panel.removeChild(el); });
      if (next === 'form') {
        panel.appendChild(form);
        headerSub.textContent = 'Fill in your details to start';
      } else {
        panel.appendChild(chatArea);
        panel.appendChild(personRow);
        panel.appendChild(inputRow);
        chatArea.scrollTop = chatArea.scrollHeight;
      }
    }

    // Restore what this browser already saw
    var state = loadState();
    (state.msgs || []).forEach(function (m) { appendBubble(m.body, m.sender, false); });
    if (!(state.msgs || []).length) appendBubble(cfg.welcomeMessage || 'Hi! How can we help you?', 'agent', true);
    applyChat({ state: 'AI', needsDetails: !state.started, agentName: null, offerFollowUp: false });

    // ── Start the chat ───────────────────────────────────────────────────
    var startBtn = form.querySelector('#wz-start');
    var formError = form.querySelector('#wz-error');
    form.onsubmit = function (e) {
      e.preventDefault();
      var name = form.querySelector('#wz-name').value.trim();
      var phone = form.querySelector('#wz-phone').value.trim();
      var email = form.querySelector('#wz-email').value.trim();
      var consent = form.querySelector('#wz-consent').checked;
      if (!name) { formError.textContent = 'Enter your first name.'; return; }
      if (phone.replace(/\\D/g, '').length < 8) { formError.textContent = 'Enter your mobile number with country code.'; return; }
      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(email)) { formError.textContent = 'Enter a valid email.'; return; }
      formError.textContent = '';
      startBtn.disabled = true;
      post('/start', { visitorId: getVisitorId(), firstName: name, phone: phone, email: email, consent: consent, pageUrl: window.location.href })
        .then(function (data) {
          saveState({ started: true, name: name });
          applyChat(data.chat);
          startPolling();
          textarea.focus();
        })
        .catch(function (err) { formError.textContent = err.message; })
        .then(function () { startBtn.disabled = false; });
    };

    // ── Send ─────────────────────────────────────────────────────────────
    var sending = false;
    function doSend() {
      var text = textarea.value.trim();
      if (!text || sending) return;
      sending = true;
      textarea.value = '';
      textarea.style.height = '40px';
      var mine = appendBubble(text, 'visitor', true);
      var typing = chat.state === 'AI' && cfg.aiAssistantEnabled ? appendBubble('…', 'agent', false) : null;
      post('/message', { visitorId: getVisitorId(), body: text, pageUrl: window.location.href })
        .then(function (data) {
          var ar = data && data.agentReply;
          if (ar && ar.messageId) showReply({ id: ar.messageId, body: ar.body, sender: 'bot', createdAt: ar.createdAt });
          applyChat(data && data.chat);
        })
        .catch(function (err) {
          // Not sent: take it out of the chat and history, and give the text back to resend
          if (mine && mine.parentNode) mine.parentNode.removeChild(mine);
          var st = loadState();
          var msgs = st.msgs || [];
          for (var i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].sender === 'visitor' && msgs[i].body === text) { msgs.splice(i, 1); break; }
          }
          saveState({ msgs: msgs });
          if (!textarea.value) textarea.value = text;
          appendBubble(err.message || 'Failed to send. Please try again.', 'system', false);
          if (/details|name, mobile/i.test(err.message || '')) {
            saveState({ started: false });
            applyChat({ state: 'AI', needsDetails: true });
          }
        })
        .then(function () {
          if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
          sending = false;
        });
    }
    sendBtn.onclick = doSend;
    textarea.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } };
    textarea.oninput = function () { this.style.height = '40px'; this.style.height = Math.min(this.scrollHeight, 120) + 'px'; };

    // ── Talk to a person / Yes, contact me / End chat ────────────────────
    personBtn.onclick = function () {
      personBtn.disabled = true;
      post('/handoff', { visitorId: getVisitorId() })
        .then(function (data) {
          if (data.message) showReply({ id: data.message.id, body: data.message.body, sender: 'bot', createdAt: data.message.createdAt });
          applyChat(data.chat);
        })
        .catch(function (err) { appendBubble(err.message, 'system', false); })
        .then(function () { personBtn.disabled = false; });
    };
    var followBtn = followCard.querySelector('button');
    var followErr = followCard.querySelector('.error-msg');
    followBtn.onclick = function () {
      followBtn.disabled = true;
      post('/consent', { visitorId: getVisitorId(), consent: true })
        .then(function (data) {
          if (data.message) showReply({ id: data.message.id, body: data.message.body, sender: 'bot', createdAt: data.message.createdAt });
          applyChat(data.chat);
          pollReplies();
        })
        .catch(function (err) { followErr.textContent = err.message; })
        .then(function () { followBtn.disabled = false; });
    };
    endBtn.onclick = function () {
      post('/end', { visitorId: getVisitorId() })
        .then(function (data) { applyChat(data.chat); pollReplies(); })
        .catch(function () {});
    };

    // ── Replies from the team or the AI, while the chat is open ──────────
    var polling = false;
    function pollReplies() {
      var st = loadState();
      if (!st.started || polling) return;
      polling = true;
      var url = BASE + '/messages?visitorId=' + encodeURIComponent(getVisitorId()) +
        (st.lastAt ? '&after=' + encodeURIComponent(st.lastAt) : '');
      fetch(url, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          ((data && data.messages) || []).forEach(showReply);
          if (data && data.chat) applyChat(data.chat);
        })
        .catch(function () {})
        .then(function () { polling = false; });
    }
    var pollTimer = null;
    function startPolling() {
      pollReplies();
      if (!pollTimer) pollTimer = setInterval(pollReplies, 4000);
    }
    function stopPolling() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }

    // ── Launcher ─────────────────────────────────────────────────────────
    var fab = document.createElement('button');
    fab.className = 'fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Open chat');
    fab.setAttribute('aria-expanded', 'false');
    var iconChat = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    var iconClose = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    fab.innerHTML = iconChat;
    var isOpen = false;
    fab.onclick = function () {
      isOpen = !isOpen;
      panel.classList.toggle('open', isOpen);
      fab.innerHTML = isOpen ? iconClose : iconChat;
      fab.setAttribute('aria-label', isOpen ? 'Close chat' : 'Open chat');
      fab.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (isOpen) {
        startPolling();
        var first = view === 'form' ? form.querySelector('#wz-name') : textarea;
        setTimeout(function () { first.focus(); }, 0);
      } else stopPolling();
    };

    shadow.appendChild(panel);
    shadow.appendChild(fab);
    document.body.appendChild(host);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
