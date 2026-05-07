"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Globe, Code, Copy, Smartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWidgetConfig, useUpdateWidgetConfig } from "@/hooks/use-widget";
import { uploadApi } from "@/lib/api/messages";
import { usePageTitle } from "@/hooks/use-page-title";
import { cn } from "@/lib/utils";

const POSITIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
];

function SkeletonBox({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-container-highest", className)} />;
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0",
        enabled ? "bg-primary" : "bg-surface-container-highest",
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </div>
  );
}

const inputCls =
  "w-full mt-1 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors";

// ── Build the inline widget HTML injected into the preview iframe ─────────────

function buildPreviewHtml(cfg: {
  primaryColor: string;
  companyName: string;
  welcomeMessage: string;
  placeholder: string;
  position: string;
  preChatFormEnabled: boolean;
  whatsappNumber: string;
  aiAssistantEnabled: boolean;
  avatarUrl: string;
}): string {
  const color = /^#[0-9A-Fa-f]{3,6}$/.test(cfg.primaryColor) ? cfg.primaryColor : "#6366f1";
  const aiBadge = cfg.aiAssistantEnabled
    ? `<span style="background:#e0f2fe;color:#0369a1;font-size:10px;padding:2px 6px;border-radius:9px;font-weight:600;margin-left:6px;vertical-align:middle">AI</span>`
    : "";

  // Inline widget script — same logic as the backend generator but with config
  // injected directly (no fetch needed), so it works fully offline in the preview.
  const script = `
(function () {
  var cfg = ${JSON.stringify({
    companyName: cfg.companyName || "Chat Support",
    welcomeMessage: cfg.welcomeMessage || "Hi! How can we help you?",
    placeholder: cfg.placeholder || "Type a message...",
    position: cfg.position || "bottom-right",
    primaryColor: color,
    preChatFormEnabled: cfg.preChatFormEnabled,
    whatsappNumber: cfg.whatsappNumber || "",
    aiAssistantEnabled: cfg.aiAssistantEnabled,
    avatarUrl: cfg.avatarUrl || "",
    aiBadgeHtml: aiBadge,
  })};

  var color = cfg.primaryColor;
  var pos = cfg.position;
  var isRight = pos.indexOf('right') >= 0;
  var isCenter = pos.indexOf('center') >= 0;

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function appendBubble(chatArea, text, sender) {
    var isV = sender === 'visitor';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:' + (isV ? 'flex-end' : 'flex-start') + ';margin-bottom:8px;';
    var bubble = document.createElement('div');
    bubble.style.cssText =
      'max-width:80%;padding:8px 12px;border-radius:' + (isV ? '14px 14px 4px 14px' : '14px 14px 14px 4px') + ';' +
      'font-size:13px;line-height:1.4;word-break:break-word;' +
      (isV ? 'background:' + color + ';color:#fff;' : 'background:#f1f5f9;color:#1e293b;');
    bubble.textContent = text;
    row.appendChild(bubble);
    chatArea.appendChild(row);
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  var host = document.createElement('div');
  host.style.cssText =
    'position:fixed;z-index:2147483647;bottom:20px;' +
    (isCenter ? 'left:50%;transform:translateX(-50%);' : isRight ? 'right:20px;' : 'left:20px;') +
    'font-family:system-ui,-apple-system,sans-serif;';

  var shadow = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = [
    '* { box-sizing:border-box; margin:0; padding:0; }',
    '.panel { width:320px; background:#fff; border-radius:16px;',
    '  box-shadow:0 8px 40px rgba(0,0,0,.18); display:none; flex-direction:column;',
    '  overflow:hidden; margin-bottom:12px; max-height:460px; }',
    '.panel.open { display:flex; }',
    '.header { background:' + color + '; color:#fff; padding:14px 16px; flex-shrink:0; }',
    '.header-name { font-size:15px; font-weight:600; }',
    '.header-sub { font-size:11px; opacity:.75; margin-top:3px; }',
    '.chat-area { flex:1; overflow-y:auto; padding:12px 14px; background:#fff; min-height:100px; }',
    '.pre-chat { padding:14px; display:flex; flex-direction:column; gap:10px; }',
    '.pre-chat p { font-size:12px; color:#64748b; font-weight:500; }',
    '.pre-chat input { width:100%; padding:8px 10px; border:1px solid #e2e8f0;',
    '  border-radius:8px; font-size:13px; outline:none; background:#f8fafc; }',
    '.pre-chat input:focus { border-color:' + color + '; background:#fff; }',
    '.submit-btn { padding:9px 16px; background:' + color + '; color:#fff; border:none;',
    '  border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; transition:opacity .15s; }',
    '.submit-btn:hover { opacity:.85; }',
    '.error-msg { font-size:11px; color:#ef4444; }',
    '.input-row { display:flex; gap:8px; padding:10px 12px; border-top:1px solid #f1f5f9; flex-shrink:0; }',
    '.input-row textarea { flex:1; resize:none; border:1px solid #e2e8f0; border-radius:8px;',
    '  padding:8px 10px; font-size:13px; line-height:1.4; height:40px; max-height:120px;',
    '  overflow-y:auto; outline:none; font-family:inherit; background:#f8fafc; }',
    '.input-row textarea:focus { border-color:' + color + '; background:#fff; }',
    '.send-btn { width:38px; height:38px; border-radius:50%; background:' + color + ';',
    '  border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; }',
    '.send-btn:hover { opacity:.85; }',
    '.send-btn svg { width:17px; height:17px; fill:white; }',
    '.wa-row { padding:10px 12px; border-top:1px solid #f1f5f9; }',
    '.wa-link { display:flex; align-items:center; gap:8px; background:#25D366; color:#fff;',
    '  text-decoration:none; padding:9px 14px; border-radius:10px; font-size:13px; font-weight:500; justify-content:center; }',
    '.wa-link svg { width:18px; height:18px; fill:white; flex-shrink:0; }',
    '.fab { width:54px; height:54px; border-radius:50%; background:' + color + ';',
    '  border:none; cursor:pointer; display:flex; align-items:center;',
    '  justify-content:center; box-shadow:0 4px 16px rgba(0,0,0,.22);',
    '  transition:transform .2s,box-shadow .2s; }',
    '.fab:hover { transform:scale(1.08); box-shadow:0 6px 22px rgba(0,0,0,.28); }',
    '.fab svg { width:24px; height:24px; fill:white; }',
  ].join('\\n');
  shadow.appendChild(style);

  var panel = document.createElement('div');
  panel.className = 'panel';

  // Header
  var header = document.createElement('div');
  header.className = 'header';
  var avatarHtml = cfg.avatarUrl
    ? '<img src="' + cfg.avatarUrl + '" style="width:34px;height:34px;border-radius:50%;object-fit:cover;margin-right:10px;border:2px solid rgba(255,255,255,0.3);flex-shrink:0;" />'
    : '<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);margin-right:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;">' + esc((cfg.companyName||'C')[0].toUpperCase()) + '</div>';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.innerHTML =
    avatarHtml +
    '<div><div class="header-name">' + esc(cfg.companyName) + (cfg.aiBadgeHtml || '') + '</div>' +
    '<div class="header-sub">Typically replies in minutes</div></div>';
  panel.appendChild(header);

  // Chat area
  var chatArea = document.createElement('div');
  chatArea.className = 'chat-area';

  // Pre-chat form
  var preChatEl = null;
  var chatVisible = !cfg.preChatFormEnabled;

  if (cfg.preChatFormEnabled) {
    preChatEl = document.createElement('div');
    preChatEl.className = 'pre-chat';

    var lbl = document.createElement('p');
    lbl.textContent = 'Tell us about yourself';

    var nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Your name *';

    var phoneInput = document.createElement('input');
    phoneInput.type = 'tel';
    phoneInput.placeholder = 'Phone number (optional)';

    var errorEl = document.createElement('div');
    errorEl.className = 'error-msg';

    var submitBtn = document.createElement('button');
    submitBtn.className = 'submit-btn';
    submitBtn.textContent = 'Start Chat';

    submitBtn.onclick = function () {
      if (!nameInput.value.trim()) { errorEl.textContent = 'Please enter your name.'; return; }
      errorEl.textContent = '';
      panel.removeChild(preChatEl);
      appendBubble(chatArea, cfg.welcomeMessage, 'agent');
      panel.insertBefore(chatArea, inputRowEl);
      chatVisible = true;
    };

    preChatEl.appendChild(lbl);
    preChatEl.appendChild(nameInput);
    preChatEl.appendChild(phoneInput);
    preChatEl.appendChild(errorEl);
    preChatEl.appendChild(submitBtn);
    panel.appendChild(preChatEl);
  } else {
    appendBubble(chatArea, cfg.welcomeMessage, 'agent');
    panel.appendChild(chatArea);
  }

  // Input / WA row
  var inputRowEl = document.createElement('div');

  if (cfg.whatsappNumber) {
    inputRowEl.className = 'wa-row';
    var waLink = document.createElement('a');
    waLink.className = 'wa-link';
    waLink.href = '#';
    waLink.onclick = function(e) { e.preventDefault(); };
    waLink.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.476A11.93 11.93 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.115 0-4.142-.659-5.853-1.903l-.42-.298-2.744.877.877-2.622-.326-.448A9.71 9.71 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg>' +
      'Continue on WhatsApp';
    inputRowEl.appendChild(waLink);
  } else {
    inputRowEl.className = 'input-row';
    var textarea = document.createElement('textarea');
    textarea.placeholder = cfg.placeholder;
    var sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';

    var aiReplies = [
      'Sure! Let me check our Knowledge Base for that.',
      'Great question — based on our docs, I can help with that.',
      'Thanks for reaching out! Here\\'s what I found in our Knowledge Base.',
      'I\\'ll look that up for you right away.',
      'Based on our product info, here\\'s what you need to know.',
    ];
    var aiReplyIndex = 0;

    function doSend() {
      var text = textarea.value.trim();
      if (!text || !chatVisible) return;
      appendBubble(chatArea, text, 'visitor');
      textarea.value = '';
      textarea.style.height = '40px';
      setTimeout(function() {
        var reply;
        if (cfg.aiAssistantEnabled) {
          reply = aiReplies[aiReplyIndex % aiReplies.length];
          aiReplyIndex++;
        } else {
          reply = 'Thanks! We\\'ll get back to you shortly.';
        }
        appendBubble(chatArea, reply, 'agent');
      }, 800);
    }
    sendBtn.onclick = doSend;
    textarea.onkeydown = function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } };
    textarea.oninput = function() { this.style.height='40px'; this.style.height=Math.min(this.scrollHeight,120)+'px'; };
    inputRowEl.appendChild(textarea);
    inputRowEl.appendChild(sendBtn);
  }

  panel.appendChild(inputRowEl);

  // FAB
  var iconChat = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  var iconClose = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  var fab = document.createElement('button');
  fab.className = 'fab';
  fab.innerHTML = iconChat;

  var isOpen = false;
  fab.onclick = function () {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    fab.innerHTML = isOpen ? iconClose : iconChat;
  };

  shadow.appendChild(panel);
  shadow.appendChild(fab);
  document.body.appendChild(host);
})();
`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 100%; height: 100vh;
    background: linear-gradient(135deg, #f0f4ff 0%, #fafafa 60%, #f0fdf4 100%);
    font-family: system-ui, sans-serif;
    overflow: hidden;
  }
  .page-mock {
    padding: 28px 24px;
    opacity: 0.55;
  }
  .bar { height: 10px; border-radius: 6px; background: #cbd5e1; margin-bottom: 10px; }
  .btn-mock { display:inline-block; width:90px; height:30px; border-radius:8px; background:#94a3b8; margin-top:14px; }
</style>
</head>
<body>
<div class="page-mock">
  <div class="bar" style="width:55%;background:#94a3b8;height:14px;margin-bottom:14px;"></div>
  <div class="bar" style="width:100%"></div>
  <div class="bar" style="width:88%"></div>
  <div class="bar" style="width:95%"></div>
  <div class="bar" style="width:72%"></div>
  <div class="bar" style="width:83%"></div>
  <div class="btn-mock"></div>
</div>
<script>${script}</script>
</body>
</html>`;
}

// ── Widget Preview iframe ─────────────────────────────────────────────────────

function WidgetPreview({ form }: { form: Parameters<typeof buildPreviewHtml>[0] }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [key, setKey] = useState(0);

  const html = useMemo(() => buildPreviewHtml(form), [
    form.primaryColor,
    form.companyName,
    form.welcomeMessage,
    form.placeholder,
    form.position,
    form.preChatFormEnabled,
    form.whatsappNumber,
    form.aiAssistantEnabled,
    form.avatarUrl,
  ]);

  useEffect(() => {
    // Revoke previous blob URL
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const blob = new Blob([html], { type: "text/html" });
    blobUrlRef.current = URL.createObjectURL(blob);
    setKey((k) => k + 1);
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, [html]);

  return (
    <iframe
      key={key}
      ref={iframeRef}
      src={blobUrlRef.current ?? "about:blank"}
      className="w-full h-full border-0 rounded-b-2xl"
      sandbox="allow-scripts allow-same-origin"
      title="Widget Preview"
    />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChatWidgetSettingsPage() {
  usePageTitle("Chat Widget");

  const { data: config, isLoading } = useWidgetConfig();
  const updateConfig = useUpdateWidgetConfig();
  const orgSlug = config?.orgSlug || "";

  const [form, setForm] = useState({
    enabled: false,
    position: "bottom-right",
    primaryColor: "#6366f1",
    welcomeMessage: "Hi! How can we help you?",
    placeholder: "Type a message...",
    companyName: "",
    avatarUrl: "",
    whatsappNumber: "",
    preChatFormEnabled: false,
    aiAssistantEnabled: false,
    aiSystemPrompt: "",
  });
  const [copied, setCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const result = await uploadApi.uploadFile(file);
      setForm((f) => ({ ...f, avatarUrl: result.url }));
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (config) {
      setForm({
        enabled: config.enabled,
        position: config.position || "bottom-right",
        primaryColor: config.primaryColor || "#6366f1",
        welcomeMessage: config.welcomeMessage || "Hi! How can we help you?",
        placeholder: config.placeholder || "Type a message...",
        companyName: config.companyName || "",
        avatarUrl: config.avatarUrl || "",
        whatsappNumber: config.whatsappNumber || "",
        preChatFormEnabled: config.preChatFormEnabled ?? false,
        aiAssistantEnabled: config.aiAssistantEnabled ?? false,
        aiSystemPrompt: config.aiSystemPrompt || "",
      });
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate({
      ...form,
      companyName: form.companyName || null,
      avatarUrl: form.avatarUrl || null,
      whatsappNumber: form.whatsappNumber || null,
      aiSystemPrompt: form.aiSystemPrompt || null,
    });
  };

  const embedCode = `<script src="${typeof window !== "undefined" ? window.location.origin : ""}/api/v1/widgets/${orgSlug}/embed.js" async></script>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex gap-6 h-full">
        <div className="flex-1 space-y-4">
          <SkeletonBox className="h-7 w-48" />
          <SkeletonBox className="h-20 rounded-2xl" />
          <SkeletonBox className="h-72 rounded-2xl" />
          <SkeletonBox className="h-20 rounded-2xl" />
        </div>
        <div className="w-[360px] flex-shrink-0">
          <SkeletonBox className="h-[540px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">

      {/* ── Left: Form ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">

        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Chat Widget
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Embed a live chat widget on your website
          </p>
        </div>

        {/* Enable */}
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-on-surface">Enable Widget</p>
              <p className="text-[12px] text-on-surface-variant">Show widget on your website</p>
            </div>
            <Toggle enabled={form.enabled} onChange={() => setForm((f) => ({ ...f, enabled: !f.enabled }))} />
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4 space-y-3">
          <p className="text-[13px] font-semibold text-on-surface">Appearance</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">Company Name</label>
              <input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Your company" className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">Position</label>
              <select value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className={inputCls}>
                {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">Primary Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} className="h-9 w-9 rounded-lg border border-outline-variant/30 cursor-pointer p-0.5" />
                <input value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} className="flex-1 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">WhatsApp Number</label>
              <input value={form.whatsappNumber} onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))} placeholder="+919876543210" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">Welcome Message</label>
            <textarea value={form.welcomeMessage} onChange={(e) => setForm((f) => ({ ...f, welcomeMessage: e.target.value }))} rows={2} maxLength={500} className={cn(inputCls, "resize-none")} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">Input Placeholder</label>
            <input value={form.placeholder} onChange={(e) => setForm((f) => ({ ...f, placeholder: e.target.value }))} placeholder="Type a message..." maxLength={255} className={inputCls} />
          </div>
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">Avatar / Logo</label>
            <div className="flex items-center gap-2 mt-1">
              {/* Preview */}
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="avatar" className="h-10 w-10 rounded-full object-cover border border-outline-variant/30 flex-shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 text-[10px] text-on-surface-variant/40 border border-outline-variant/20">
                  Logo
                </div>
              )}
              {/* URL input */}
              <input
                value={form.avatarUrl}
                onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
                className={cn(inputCls, "mt-0 flex-1")}
              />
              {/* Upload button */}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="flex-shrink-0 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[12px] text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                {avatarUploading ? "Uploading..." : "Upload"}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>
        </div>

        {/* Pre-chat form */}
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-on-surface">Pre-chat Form</p>
              <p className="text-[12px] text-on-surface-variant">Collect visitor name &amp; phone before chat starts</p>
            </div>
            <Toggle enabled={form.preChatFormEnabled} onChange={() => setForm((f) => ({ ...f, preChatFormEnabled: !f.preChatFormEnabled }))} />
          </div>
        </div>

        {/* AI Assistant */}
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-medium text-on-surface">AI Assistant</p>
              <p className="text-[12px] text-on-surface-variant">
                Auto-reply using your org&apos;s Knowledge Base &amp; product data
              </p>
            </div>
            <Toggle
              enabled={form.aiAssistantEnabled}
              onChange={() => setForm((f) => ({ ...f, aiAssistantEnabled: !f.aiAssistantEnabled }))}
            />
          </div>
          {form.aiAssistantEnabled && (
            <div>
              <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
                Custom Instructions (optional)
              </label>
              <textarea
                value={form.aiSystemPrompt}
                onChange={(e) => setForm((f) => ({ ...f, aiSystemPrompt: e.target.value }))}
                rows={4}
                maxLength={2000}
                placeholder={`e.g. You are a friendly sales assistant for ${form.companyName || "our company"}. Only answer questions about our products. If unsure, ask the visitor to leave their contact details.`}
                className={cn(inputCls, "resize-none mt-1")}
              />
              <p className="text-[11px] text-on-surface-variant/40 mt-1 text-right">
                {(form.aiSystemPrompt ?? "").length}/2000
              </p>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? "Saving..." : "Save Settings"}
          </Button>
          {updateConfig.isSuccess && (
            <span className="text-[13px] text-success flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
          {updateConfig.isError && (
            <span className="text-[13px] text-error">Failed to save. Try again.</span>
          )}
        </div>

        {/* Embed Code */}
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-semibold text-on-surface">Embed Code</p>
          </div>
          <p className="text-[12px] text-on-surface-variant">Paste before the closing &lt;/body&gt; tag.</p>
          <div className="relative">
            <pre className="rounded-xl bg-surface-container-highest p-3 text-[11px] text-on-surface overflow-x-auto pr-10">
              <code>{embedCode}</code>
            </pre>
            <button onClick={copyEmbed} className="absolute top-2 right-2 p-1.5 rounded-lg bg-surface hover:bg-surface-container transition-colors" title="Copy">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-on-surface-variant" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Right: Live Preview ──────────────────────────────────────────── */}
      <div className="w-[380px] flex-shrink-0 sticky top-6">
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-outline-variant/10">
            <Smartphone className="h-4 w-4 text-primary" />
            <p className="text-[13px] font-semibold text-on-surface">Live Preview</p>
            <span className="ml-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
              Interactive
            </span>
            <p className="ml-auto text-[11px] text-on-surface-variant/50">Updates as you type</p>
          </div>

          {/* Browser chrome */}
          <div className="px-3 py-2 bg-surface-container-highest flex items-center gap-2 border-b border-outline-variant/10">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
            </div>
            <div className="flex-1 rounded-md bg-surface px-3 py-1 text-[10px] text-on-surface-variant/40 truncate">
              https://yourwebsite.com
            </div>
          </div>

          {/* iframe */}
          <div className="h-[480px]">
            <WidgetPreview form={form} />
          </div>

          {/* Hint */}
          <div className="px-4 py-2.5 border-t border-outline-variant/10 flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 text-on-surface-variant/40" />
            <p className="text-[11px] text-on-surface-variant/50">
              Click the chat button · Type a message · Test pre-chat form{form.aiAssistantEnabled ? " · AI enabled" : ""}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
