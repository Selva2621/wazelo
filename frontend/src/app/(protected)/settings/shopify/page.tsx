"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Zap,
  Package,
  RotateCcw,
  Copy,
  Check,
  Activity,
  Clock,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useIntegrations,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useTestIntegration,
} from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth-store";
import type { IntegrationConfig } from "@/lib/types/settings";

// ─── Webhook URL helper ────────────────────────────────────────────────────────

function WebhookUrlCard({ orgId }: { orgId: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "https://your-backend.com";
  const url = `${baseUrl}/api/v1/webhooks/shopify/${orgId}`;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl bg-surface-container border border-outline-variant/10 p-4 space-y-2">
      <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
        Your Shopify Webhook URL
      </p>
      <p className="text-[11px] text-on-surface-variant/60 leading-relaxed">
        Register this URL in Shopify Admin → Settings → Notifications → Webhooks.
        Subscribe to: <span className="font-mono text-primary">orders/create</span>,{" "}
        <span className="font-mono text-primary">orders/fulfilled</span>,{" "}
        <span className="font-mono text-primary">checkouts/create</span>.
      </p>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/10">
        <code className="flex-1 text-[11px] font-mono text-on-surface truncate">{url}</code>
        <button
          onClick={handleCopy}
          className="shrink-0 p-1 rounded hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface"
          title="Copy URL"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Event pills ──────────────────────────────────────────────────────────────

const SHOPIFY_EVENTS = [
  { icon: Package, label: "Order Created", desc: "Auto-create/update contact + note when customer places order" },
  { icon: Zap, label: "Order Fulfilled", desc: "Fire automation when order is shipped" },
  { icon: RotateCcw, label: "Cart Abandoned", desc: "Trigger WhatsApp reminder when checkout is abandoned" },
];

// ─── Setup / Edit form ────────────────────────────────────────────────────────

interface ShopifyFormProps {
  existing?: IntegrationConfig;
  onSuccess: () => void;
  onCancel: () => void;
}

function ShopifyForm({ existing, onSuccess, onCancel }: ShopifyFormProps) {
  const createIntegration = useCreateIntegration();
  const updateIntegration = useUpdateIntegration();

  const [shopDomain, setShopDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = createIntegration.isPending || updateIntegration.isPending;
  const isEditing = !!existing;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const domain = shopDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (!domain.endsWith(".myshopify.com") && !domain.includes(".")) {
      setError("Enter a valid shop domain (e.g. mystore.myshopify.com)");
      return;
    }

    const credentials = { shopDomain: domain, accessToken: accessToken.trim(), webhookSecret: webhookSecret.trim() };

    if (isEditing && existing) {
      updateIntegration.mutate(
        { id: existing.id, credentials, version: existing.version },
        {
          onSuccess,
          onError: (err: Error) => setError(err.message),
        },
      );
    } else {
      createIntegration.mutate(
        { provider: "SHOPIFY", displayName: `Shopify — ${domain}`, credentials },
        {
          onSuccess,
          onError: (err: Error) => setError(err.message),
        },
      );
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant/15 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Shop domain */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-on-surface-variant">
          Shop Domain <span className="text-error">*</span>
        </label>
        <input
          type="text"
          value={shopDomain}
          onChange={(e) => setShopDomain(e.target.value)}
          required={!isEditing}
          placeholder="mystore.myshopify.com"
          className={inputCls}
        />
        {isEditing && (
          <p className="text-[11px] text-on-surface-variant/50">
            Currently connected. Leave blank to keep existing domain.
          </p>
        )}
      </div>

      {/* Access Token */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-on-surface-variant">
          Admin API Access Token <span className="text-error">*</span>
        </label>
        <div className="relative">
          <input
            type={showToken ? "text" : "password"}
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            required={!isEditing}
            placeholder={isEditing ? "Leave blank to keep existing" : "shpat_xxxxxxxxxxxx"}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[11px] text-on-surface-variant/50">
          Shopify Admin → Apps → Develop apps → Admin API access token.
          Requires: <code className="text-primary">read_orders</code>, <code className="text-primary">read_customers</code>.
        </p>
      </div>

      {/* Webhook Secret */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-on-surface-variant">
          Webhook Signing Secret <span className="text-error">*</span>
        </label>
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            required={!isEditing}
            placeholder={isEditing ? "Leave blank to keep existing" : "Your webhook signing secret"}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[11px] text-on-surface-variant/50">
          Shopify Admin → Settings → Notifications → Webhooks → Signing secret.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-error/10 border border-error/20">
          <AlertCircle className="h-4 w-4 text-error shrink-0" />
          <p className="text-[12px] text-error">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          {isEditing ? "Update" : "Connect Shopify"}
        </Button>
      </div>
    </form>
  );
}

// ─── Connected card ───────────────────────────────────────────────────────────

interface ConnectedCardProps {
  integration: IntegrationConfig;
  orgId: string;
  onEdit: () => void;
}

function ConnectedCard({ integration, orgId, onEdit }: ConnectedCardProps) {
  const testIntegration = useTestIntegration();
  const deleteIntegration = useDeleteIntegration();
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  function handleTest() {
    setTestResult(null);
    testIntegration.mutate(integration.id, {
      onSuccess: (result) => setTestResult(result),
      onError: (err) => setTestResult({ success: false, error: err.message }),
    });
  }

  function handleDelete() {
    if (!confirm("Disconnect Shopify? Existing contacts and notes will be kept.")) return;
    deleteIntegration.mutate(integration.id);
  }

  const statusColor =
    integration.status === "ACTIVE" ? "text-green-600 bg-green-100" :
    integration.status === "ERROR"  ? "text-red-600 bg-red-100" :
    "text-on-surface-variant bg-surface-container";

  return (
    <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
      {/* Status header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/8">
        <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-on-surface">{integration.displayName}</p>
          <p className="text-[11px] text-on-surface-variant/60">Connected · {new Date(integration.updatedAt).toLocaleDateString()}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColor}`}>
          {integration.status}
        </span>
      </div>

      {/* Events list */}
      <div className="px-4 py-3 space-y-2.5 border-b border-outline-variant/8">
        <p className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Listening For</p>
        {SHOPIFY_EVENTS.map((ev) => {
          const Icon = ev.icon;
          return (
            <div key={ev.label} className="flex items-start gap-2.5">
              <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-on-surface">{ev.label}</p>
                <p className="text-[11px] text-on-surface-variant/60">{ev.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sync Status */}
      <div className="px-4 py-3 border-b border-outline-variant/8 space-y-2">
        <p className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Sync Status</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container">
            <Activity className="h-3.5 w-3.5 text-on-surface-variant/50 shrink-0" />
            <div>
              <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wide">Status</p>
              <p className={`text-[12px] font-medium ${integration.status === "ACTIVE" ? "text-green-600" : integration.status === "ERROR" ? "text-red-600" : "text-on-surface-variant"}`}>
                {integration.status === "ACTIVE" ? "Receiving" : integration.status === "ERROR" ? "Error" : "Inactive"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container">
            <Clock className="h-3.5 w-3.5 text-on-surface-variant/50 shrink-0" />
            <div>
              <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wide">Last Tested</p>
              <p className="text-[12px] font-medium text-on-surface">
                {integration.lastTestedAt
                  ? new Date(integration.lastTestedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "Never"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="px-4 py-3 border-b border-outline-variant/8">
        <WebhookUrlCard orgId={orgId} />
      </div>

      {/* Error message */}
      {integration.lastError && (
        <div className="px-4 py-2 border-b border-outline-variant/8">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-error/8 border border-error/15">
            <AlertCircle className="h-3.5 w-3.5 text-error shrink-0 mt-0.5" />
            <p className="text-[11px] text-error">{integration.lastError}</p>
          </div>
        </div>
      )}

      {/* Test result */}
      {testResult && (
        <div className="px-4 py-2 border-b border-outline-variant/8">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${testResult.success ? "bg-green-50 border border-green-200" : "bg-error/8 border border-error/15"}`}>
            {testResult.success
              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
              : <AlertCircle className="h-3.5 w-3.5 text-error shrink-0" />
            }
            <p className={`text-[11px] ${testResult.success ? "text-green-700" : "text-error"}`}>
              {testResult.success ? "Connection verified — credentials are valid" : testResult.error}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Button variant="secondary" size="sm" onClick={handleTest} disabled={testIntegration.isPending}>
          {testIntegration.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          Test Connection
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit Credentials
        </Button>
        <a
          href={`https://${integration.displayName.replace("Shopify — ", "")}/admin`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-on-surface-variant hover:text-primary transition-colors"
        >
          Open Shopify Admin
          <ExternalLink className="h-3 w-3" />
        </a>
        <button
          onClick={handleDelete}
          disabled={deleteIntegration.isPending}
          className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant/40 hover:text-error transition-colors"
          title="Disconnect Shopify"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShopifySettingsPage() {
  usePageTitle("Shopify Integration");
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: integrations, isLoading } = useIntegrations();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);

  const shopifyIntegration = integrations?.find((i) => i.provider === "SHOPIFY");

  useEffect(() => {
    if (!isLoading && !shopifyIntegration) {
      setShowForm(true);
    }
  }, [isLoading, shopifyIntegration]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 flex items-center gap-3 border-b border-outline-variant/10">
        <button
          onClick={() => router.push("/settings")}
          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-8 w-8 rounded-xl bg-green-100 flex items-center justify-center">
          <ShoppingBag className="h-4.5 w-4.5 text-green-600" />
        </div>
        <div>
          <h1 className="text-[17px] font-semibold text-on-surface">Shopify Integration</h1>
          <p className="text-[12px] text-on-surface-variant/60">
            Sync orders, customers, and abandoned carts with your CRM
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl px-6 py-5 space-y-5">

        {/* What you get section */}
        {!shopifyIntegration && (
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4 space-y-3">
            <p className="text-[13px] font-semibold text-on-surface">What this integration does</p>
            <div className="space-y-2.5">
              {SHOPIFY_EVENTS.map((ev) => {
                const Icon = ev.icon;
                return (
                  <div key={ev.label} className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-on-surface">{ev.label}</p>
                      <p className="text-[12px] text-on-surface-variant/60 mt-0.5">{ev.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Connected state */}
        {shopifyIntegration && !editing && (
          <ConnectedCard
            integration={shopifyIntegration}
            orgId={user?.orgId ?? ""}
            onEdit={() => setEditing(true)}
          />
        )}

        {/* Setup / Edit form */}
        {(!shopifyIntegration || editing) && (showForm || editing) && (
          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5">
            <h2 className="text-[14px] font-semibold text-on-surface mb-4">
              {editing ? "Update Shopify Credentials" : "Connect Your Shopify Store"}
            </h2>
            <ShopifyForm
              existing={editing ? shopifyIntegration : undefined}
              onSuccess={() => { setShowForm(false); setEditing(false); }}
              onCancel={() => { setShowForm(false); setEditing(false); }}
            />
          </div>
        )}

        {/* Help section */}
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4 space-y-2">
          <p className="text-[12px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">Setup Guide</p>
          <ol className="space-y-2 text-[12px] text-on-surface-variant leading-relaxed list-decimal list-inside">
            <li>Go to Shopify Admin → Apps → Develop apps → Create an app</li>
            <li>Under Admin API, add scopes: <code className="text-primary bg-primary/8 px-1 rounded">read_orders</code> <code className="text-primary bg-primary/8 px-1 rounded">read_customers</code></li>
            <li>Install the app and copy the Admin API access token</li>
            <li>Go to Settings → Notifications → Webhooks and copy the signing secret</li>
            <li>Paste the Webhook URL (shown after connecting) and subscribe to the 3 topics</li>
          </ol>
        </div>
      </div>
      </div>
    </div>
  );
}
