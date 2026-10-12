"use client";

import { useState } from "react";
import { Play, Loader2, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

/** Absolute base URL of the public API, for code samples and the console. */
export function publicApiBase(): string {
  if (/^https?:\/\//.test(API_BASE_URL)) return API_BASE_URL.replace(/\/$/, "");
  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  return `${origin}${API_BASE_URL.startsWith("/") ? "" : "/"}${API_BASE_URL}`.replace(/\/$/, "");
}

interface Endpoint {
  method: "GET" | "POST" | "PUT";
  path: string;
  label: string;
  sampleBody?: object;
  /** Sends a real WhatsApp message */
  sends?: boolean;
}

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/developer/session/status", label: "Check WhatsApp connection" },
  {
    method: "POST",
    path: "/developer/messages/send",
    label: "Send a message",
    sends: true,
    sampleBody: { to: "+919876543210", type: "text", body: "Hello from the Wazelo API!" },
  },
  {
    method: "POST",
    path: "/developer/messages/send-template",
    label: "Send a template",
    sends: true,
    sampleBody: { to: "+919876543210", templateName: "welcome_offer", variables: { name: "Priya" } },
  },
  { method: "GET", path: "/developer/messages?limit=5", label: "List messages" },
  { method: "GET", path: "/developer/messages/:id", label: "Get a message" },
  { method: "GET", path: "/developer/templates", label: "List templates" },
  { method: "GET", path: "/developer/contacts?limit=5", label: "List contacts" },
  {
    method: "POST",
    path: "/developer/contacts",
    label: "Create a contact",
    sampleBody: { name: "Priya Raman", phone: "+919876543210", email: "priya@example.com" },
  },
  { method: "GET", path: "/developer/contacts/:id", label: "Get a contact" },
];

interface Result {
  status: number;
  durationMs: number;
  remaining: string | null;
  body: string;
}

/** Lets admins call the Developer API with a key, straight from Settings. */
export function ApiTryIt() {
  const [endpointIdx, setEndpointIdx] = useState(0);
  const [apiKey, setApiKey] = useState("");
  const [id, setId] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const endpoint = ENDPOINTS[endpointIdx];
  const needsId = endpoint.path.includes(":id");

  function selectEndpoint(idx: number) {
    setEndpointIdx(idx);
    const sample = ENDPOINTS[idx].sampleBody;
    setBody(sample ? JSON.stringify(sample, null, 2) : "");
    setResult(null);
    setError(null);
  }

  async function send() {
    setError(null);
    setResult(null);

    let payload: string | undefined;
    if (endpoint.method !== "GET") {
      try {
        payload = JSON.stringify(JSON.parse(body || "{}"));
      } catch {
        setError("The request body isn't valid JSON.");
        return;
      }
    }

    const url = publicApiBase() + endpoint.path.replace(":id", encodeURIComponent(id.trim()));
    setLoading(true);
    const started = performance.now();
    try {
      const res = await fetch(url, {
        method: endpoint.method,
        headers: {
          "X-API-Key": apiKey.trim(),
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        body: payload,
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON, show as-is
      }
      setResult({
        status: res.status,
        durationMs: Math.round(performance.now() - started),
        remaining: res.headers.get("X-RateLimit-Remaining"),
        body: pretty,
      });
    } catch {
      setError("Couldn't reach the API. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-outline-variant/30 bg-surface text-body text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="try-endpoint" className="text-label font-medium text-on-surface-variant">Endpoint</label>
          <select
            id="try-endpoint"
            value={endpointIdx}
            onChange={(e) => selectEndpoint(Number(e.target.value))}
            className={`mt-1 ${inputCls}`}
          >
            {ENDPOINTS.map((ep, i) => (
              <option key={ep.path + ep.method} value={i}>
                {ep.method} {ep.path.split("?")[0]} ({ep.label})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="try-key" className="text-label font-medium text-on-surface-variant">API key</label>
          <input
            id="try-key"
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="crm_sk_..."
            className={`mt-1 font-mono ${inputCls}`}
          />
          <p className="mt-1 text-caption text-on-surface-variant">Only used for this request. Not saved.</p>
        </div>
      </div>

      {needsId && (
        <div>
          <label htmlFor="try-id" className="text-label font-medium text-on-surface-variant">ID</label>
          <input
            id="try-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Paste an ID from a list response"
            className={`mt-1 font-mono ${inputCls}`}
          />
        </div>
      )}

      {endpoint.method !== "GET" && (
        <div>
          <label htmlFor="try-body" className="text-label font-medium text-on-surface-variant">Request body (JSON)</label>
          <textarea
            id="try-body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`mt-1 font-mono text-label ${inputCls}`}
          />
        </div>
      )}

      {endpoint.sends && (
        <p className="flex items-center gap-2 text-label text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          This sends a real WhatsApp message and counts toward your plan.
        </p>
      )}

      <Button
        onClick={send}
        disabled={loading || !apiKey.trim() || (needsId && !id.trim())}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Send request
      </Button>

      {error && <p className="text-label text-error">{error}</p>}

      {result && (
        <div>
          <div className="flex flex-wrap items-center gap-3 text-label mb-2">
            <span
              className={`px-1.5 py-0.5 rounded font-mono font-medium ${
                result.status < 300 ? "bg-success/10 text-success" :
                result.status < 500 ? "bg-warning/10 text-warning" :
                "bg-error/10 text-error"
              }`}
            >
              {result.status}
            </span>
            <span className="text-on-surface-variant">{result.durationMs} ms</span>
            {result.remaining !== null && (
              <span className="text-on-surface-variant">{result.remaining} requests left this minute</span>
            )}
          </div>
          <pre className="max-h-80 overflow-auto bg-surface-container rounded-xl p-4 text-label font-mono text-on-surface whitespace-pre">
            {result.body}
          </pre>
        </div>
      )}
    </div>
  );
}
