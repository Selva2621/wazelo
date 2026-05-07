"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  MessageSquare,
  ToggleLeft,
  Bell,
  Webhook,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Globe,
  Clock,
  Plug,
  Send,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Zap,
  X,
  Code,
  Key,
  BarChart3,
  FileCode,
  Activity,
  Shield,
  ShoppingBag,
  Package,
  RotateCcw,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";
import {
  useOrgSettings,
  useWhatsAppConfig,
  useWorkingHours,
  useUpdateWorkingHours,
  useFeatureFlags,
  useWebhooks,
  useUpdateOrgSettings,
  useUpdateWhatsAppConfig,
  useUpdateFeatureFlags,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useWebhookDeliveries,
  useIntegrations,
  useCreateIntegration,
  useUpdateIntegration,
  useDeleteIntegration,
  useTestIntegration,
} from "@/hooks/use-settings";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "@/hooks/use-notifications";
import {
  useDeveloperDashboard,
  useDeveloperLogs,
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useRotateApiKey,
} from "@/hooks/use-developer";
import type { DeveloperApiKey } from "@/lib/types/developer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";
import { PAGE_SIZE } from "@/lib/constants";
import type {
  UpdateOrgSettingsRequest,
  UpdateWhatsAppConfigRequest,
  FeatureFlags as FeatureFlagsType,
  Webhook as WebhookType,
  WebhookDelivery,
  WebhookDeliveryStatus,
  IntegrationConfig,
  IntegrationProvider,
  WEBHOOK_EVENT_TYPES,
} from "@/lib/types/settings";
import type {
  NotificationType,
  NotificationPreference,
} from "@/lib/types/notifications";
import { SlaPolicyList } from "@/components/sla/sla-policy-list";
import { SlaPolicyForm } from "@/components/sla/sla-policy-form";
import {
  useSlaPolicies,
  useCreateSlaPolicy,
  useUpdateSlaPolicy,
  useDeleteSlaPolicy,
} from "@/hooks/use-sla";
import {
  useAiMemory,
  useRebuildAiMemory,
  useUpdateAiMemory,
  useUploadAiMemoryDocument,
  useDeleteAiMemoryDocument,
} from "@/hooks/use-settings";
import type { SlaPolicy } from "@/lib/types/sla";

type SettingsTab =
  | "organization"
  | "ai-memory"
  | "whatsapp"
  | "working-hours"
  | "features"
  | "notifications"
  | "webhooks"
  | "developer-api"
  | "sla"
  | "shopify";

const TABS: { id: SettingsTab; label: string; icon: typeof Building2 }[] = [
  { id: "organization", label: "Organization", icon: Building2 },
  { id: "ai-memory", label: "AI Memory", icon: Zap },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "working-hours", label: "Working Hours", icon: Clock },
  { id: "features", label: "Feature Flags", icon: ToggleLeft },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "developer-api", label: "Developer API", icon: Code },
  { id: "sla", label: "SLA Policies", icon: Shield },
  { id: "shopify", label: "Shopify", icon: ShoppingBag },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "ar", label: "Arabic" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
];

function EmployeeSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings/whatsapp");
  }, [router]);
  return null;
}

export default function SettingsPage() {
  usePageTitle("Settings");

  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const VALID_TABS: SettingsTab[] = ["organization","ai-memory","whatsapp","working-hours","features","notifications","webhooks","developer-api","sla","shopify"];
  const rawTab = searchParams.get("tab");
  const tabParam: SettingsTab | null = rawTab && VALID_TABS.includes(rawTab as SettingsTab) ? (rawTab as SettingsTab) : null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(tabParam ?? "organization");

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam);
  }, [tabParam]);

  if (user?.role !== "ADMIN") {
    return <EmployeeSettingsRedirect />;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-on-surface">Settings</h1>
        <p className="text-[13px] text-on-surface-variant mt-1">
          Manage your organization, integrations, and system configuration
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Nav */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
                {activeTab === tab.id && (
                  <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "organization" && <OrganizationSection />}
          {activeTab === "ai-memory" && <AiMemorySection />}
          {activeTab === "whatsapp" && <WhatsAppSection />}
          {activeTab === "working-hours" && <WorkingHoursSection />}
          {activeTab === "features" && (
            <>
              <FeatureFlagsSection />
              <AiSettingsSection />
            </>
          )}
          {activeTab === "notifications" && <NotificationsSection />}
          {activeTab === "webhooks" && <WebhooksSection />}
          {activeTab === "developer-api" && <DeveloperApiSection />}
          {activeTab === "sla" && <SlaSection />}
          {activeTab === "shopify" && <ShopifySection />}
        </div>
      </div>
    </div>
  );
}

// ─── Organization Section ───────────────────────

function OrganizationSection() {
  const { data, isLoading } = useOrgSettings();
  const updateMutation = useUpdateOrgSettings();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("en");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    if (data) {
      setName(data.name ?? "");
      setTimezone(data.timezone ?? "UTC");
      setLanguage(data.language ?? "en");
      setIndustry(data.industry ?? "");
      setDescription(data.description ?? "");
      setWebsite(data.website ?? "");
    }
  }, [data]);

  const handleSave = () => {
    const payload: UpdateOrgSettingsRequest = { name, timezone, language, industry, description, website };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-5 w-5" />
          Organization Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Org Name */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
            Organization Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="My Organization"
          />
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Business Profile */}
        <div className="border-t border-outline-variant/20 pt-5 mt-2">
          <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-4">
            Business Profile
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. E-commerce, Healthcare, Education"
                className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Business Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what your business does..."
                maxLength={2000}
                rows={3}
                className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="text-[11px] text-on-surface-variant/60 text-right">{description.length}/2000</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            size="sm"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          {updateMutation.isSuccess && (
            <span className="ml-3 text-[12px] text-primary">Saved!</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── AI Memory Section ──────────────────────────

function AiMemorySection() {
  const { data, isLoading } = useAiMemory();
  const rebuildMutation = useRebuildAiMemory();
  const updateMutation = useUpdateAiMemory();
  const uploadDocMutation = useUploadAiMemoryDocument();
  const deleteDocMutation = useDeleteAiMemoryDocument();
  const [customContext, setCustomContext] = useState("");
  const [customSaved, setCustomSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setCustomContext(data.customContext ?? "");
    }
  }, [data]);

  const handleSaveCustom = () => {
    updateMutation.mutate({ customContext }, {
      onSuccess: () => {
        setCustomSaved(true);
        setTimeout(() => setCustomSaved(false), 2000);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadDocMutation.mutate(file);
    e.target.value = "";
  };

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5" />
            AI Memory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-[13px] text-on-surface-variant">
            AI Memory gives every AI response context about your business — products, knowledge base, and Shopify store. It auto-rebuilds when you update your profile.
          </p>

          {data ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-on-surface-variant">Last rebuilt</span>
                <span className="text-on-surface font-medium">
                  {data.builtAt
                    ? new Date(data.builtAt).toLocaleString()
                    : "Never"}
                </span>
              </div>
              {data.shopifyStore && (
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-on-surface-variant">Shopify store</span>
                  <span className="text-on-surface font-medium">{data.shopifyStore}</span>
                </div>
              )}
              {data.context && (
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                    Current Context
                  </label>
                  <pre className="w-full rounded-lg border border-outline-variant/30 bg-surface-container px-3 py-2.5 text-[12px] text-on-surface/80 whitespace-pre-wrap font-mono overflow-auto max-h-64">
                    {data.context}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-on-surface-variant/60">
              No memory built yet. Save your Business Profile to generate the first memory.
            </p>
          )}

          <div className="pt-1">
            <Button
              onClick={() => rebuildMutation.mutate()}
              disabled={rebuildMutation.isPending}
              size="sm"
              variant="secondary"
            >
              <RotateCw className="h-4 w-4" />
              {rebuildMutation.isPending ? "Rebuilding..." : "Rebuild Now"}
            </Button>
            {rebuildMutation.isSuccess && (
              <span className="ml-3 text-[12px] text-primary">Rebuilt!</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Business Document</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[13px] text-on-surface-variant">
            Upload a PDF, TXT, or CSV file (e.g. product catalog, company profile, FAQ sheet). The text will be extracted and injected into every AI response.
          </p>

          {data?.documentName ? (
            <div className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container px-4 py-3">
              <FileCode className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-on-surface truncate">{data.documentName}</p>
                <p className="text-[11px] text-on-surface-variant">Document indexed in AI memory</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteDocMutation.mutate()}
                disabled={deleteDocMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-error" />
              </Button>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-outline-variant/30 py-8 cursor-pointer hover:border-primary/50 hover:bg-surface-container/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Activity className="h-8 w-8 text-on-surface-variant/40" />
              <p className="text-[13px] text-on-surface-variant">Click to upload a document</p>
              <p className="text-[11px] text-on-surface-variant/60">PDF, TXT, CSV, Markdown — max 20 MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.csv,.md,text/plain,text/csv,text/markdown,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {!data?.documentName && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDocMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              {uploadDocMutation.isPending ? "Uploading..." : "Choose File"}
            </Button>
          )}

          {uploadDocMutation.isError && (
            <p className="text-[12px] text-error">
              Upload failed. Make sure the file is a valid PDF, TXT, or CSV.
            </p>
          )}
          {uploadDocMutation.isSuccess && (
            <p className="text-[12px] text-primary">
              Document uploaded — {(uploadDocMutation.data as any)?.extractedLength?.toLocaleString()} characters extracted.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[13px] text-on-surface-variant">
            Add extra context that should be injected into every AI response — tone guidelines, specific rules, or business policies.
          </p>
          <textarea
            value={customContext}
            onChange={(e) => setCustomContext(e.target.value)}
            placeholder="e.g. Always respond in a friendly tone. Never mention competitor products. Our support hours are 9am–6pm IST."
            maxLength={2000}
            rows={5}
            className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-[11px] text-on-surface-variant/60 text-right">{customContext.length}/2000</p>
          <Button
            onClick={handleSaveCustom}
            disabled={updateMutation.isPending}
            size="sm"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Instructions"}
          </Button>
          {customSaved && (
            <span className="ml-3 text-[12px] text-primary">Saved!</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── WhatsApp Section ───────────────────────────

function WhatsAppSection() {
  const { data, isLoading } = useWhatsAppConfig();
  const updateMutation = useUpdateWhatsAppConfig();

  const [messageDelay, setMessageDelay] = useState(1000);
  const [retryLimit, setRetryLimit] = useState(3);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(3600);

  useEffect(() => {
    if (data) {
      setMessageDelay(data.messageDelay ?? 1000);
      setRetryLimit(data.retryLimit ?? 3);
      setAutoReconnect(data.autoReconnect ?? true);
      setSessionTimeout(data.sessionTimeout ?? 3600);
    }
  }, [data]);

  const handleSave = () => {
    const payload: UpdateWhatsAppConfigRequest = {
      messageDelay,
      retryLimit,
      autoReconnect,
      sessionTimeout,
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5" />
          WhatsApp Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* WhatsApp QR Connect */}
        <Link
          href="/settings/whatsapp"
          className="flex items-center justify-between p-4 rounded-lg border border-outline-variant/20 bg-surface-container/10 hover:bg-surface-container/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-on-surface">
                WhatsApp Connection
              </p>
              <p className="text-[11px] text-on-surface-variant/60">
                Scan QR code to connect or manage your WhatsApp session
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors" />
        </Link>

        {/* Chat Widget */}
        <Link
          href="/settings/chat-widget"
          className="flex items-center justify-between p-4 rounded-lg border border-outline-variant/20 bg-surface-container/10 hover:bg-surface-container/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-on-surface">
                Chat Widget
              </p>
              <p className="text-[11px] text-on-surface-variant/60">
                Embed a chat widget on your website to connect visitors to WhatsApp
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors" />
        </Link>

        {/* Custom Fields */}
        <Link
          href="/settings/custom-fields"
          className="flex items-center justify-between p-4 rounded-lg border border-outline-variant/20 bg-surface-container/10 hover:bg-surface-container/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ToggleLeft className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-on-surface">Custom Fields</p>
              <p className="text-[11px] text-on-surface-variant/60">Define custom fields for contacts, deals, and conversations</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors" />
        </Link>

        {/* API Keys */}
        <Link
          href="/settings/api-keys"
          className="flex items-center justify-between p-4 rounded-lg border border-outline-variant/20 bg-surface-container/10 hover:bg-surface-container/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-on-surface">API Keys</p>
              <p className="text-[11px] text-on-surface-variant/60">Manage API keys for third-party integrations</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors" />
        </Link>

        {/* Message Delay */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Message Delay (ms)
          </label>
          <input
            type="number"
            value={messageDelay}
            onChange={(e) => setMessageDelay(Number(e.target.value))}
            min={500}
            max={10000}
            step={100}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-on-surface-variant/60">
            Delay between sending messages (500ms - 10,000ms)
          </p>
        </div>

        {/* Retry Limit */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
            Retry Limit
          </label>
          <input
            type="number"
            value={retryLimit}
            onChange={(e) => setRetryLimit(Number(e.target.value))}
            min={0}
            max={10}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-on-surface-variant/60">
            Max retries for failed message delivery
          </p>
        </div>

        {/* Auto Reconnect */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-[13px] font-medium text-on-surface">
              Auto Reconnect
            </p>
            <p className="text-[11px] text-on-surface-variant/60">
              Automatically reconnect on session disconnect
            </p>
          </div>
          <button
            onClick={() => setAutoReconnect(!autoReconnect)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              autoReconnect ? "bg-primary" : "bg-outline-variant/30"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                autoReconnect ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>

        {/* Session Timeout */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
            Session Timeout (seconds)
          </label>
          <input
            type="number"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(Number(e.target.value))}
            min={300}
            max={86400}
            step={300}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="pt-2">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            size="sm"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
          {updateMutation.isSuccess && (
            <span className="ml-3 text-[12px] text-primary">Saved!</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Working Hours Section ──────────────────────

function WorkingHoursSection() {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const { data, isLoading } = useWorkingHours();
  const updateMutation = useUpdateWorkingHours();

  const [enabled, setEnabled] = useState(true);
  const [startHour, setStartHour] = useState("09:00");
  const [endHour, setEndHour] = useState("18:00");
  const [workDays, setWorkDays] = useState([true, true, true, true, true, false, false]);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMessage, setAutoReplyMessage] = useState(
    "Thanks for reaching out! We're currently outside business hours. We'll get back to you as soon as we're open."
  );

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled ?? true);
      setStartHour(data.startHour ?? "09:00");
      setEndHour(data.endHour ?? "18:00");
      setWorkDays(data.workDays ?? [true, true, true, true, true, false, false]);
      setAutoReplyEnabled(data.autoReplyEnabled ?? false);
      setAutoReplyMessage(data.autoReplyMessage ?? "");
    }
  }, [data]);

  const toggleDay = (idx: number) => {
    const next = [...workDays];
    next[idx] = !next[idx];
    setWorkDays(next);
  };

  const handleSave = () => {
    updateMutation.mutate({ enabled, startHour, endHour, workDays, autoReplyEnabled, autoReplyMessage });
  };

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-6">
      {/* Working Hours */}
      <div>
        <h3 className="text-[15px] font-semibold text-on-surface mb-1">
          Business Hours
        </h3>
        <p className="text-[13px] text-on-surface-variant mb-4">
          Set your team&apos;s availability hours. Outside these hours, auto-reply can be sent to customers.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant/30 accent-primary"
            />
            <span className="text-[13px] text-on-surface">Enable business hours</span>
          </label>

          {enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-on-surface-variant">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-on-surface-variant">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-on-surface-variant mb-2 block">
                  Working Days
                </label>
                <div className="flex gap-2">
                  {DAYS.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                        workDays[i]
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-container text-on-surface-variant/50 hover:text-on-surface-variant"
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Auto-Reply */}
      <div className="border-t border-outline-variant/15 pt-6">
        <h3 className="text-[15px] font-semibold text-on-surface mb-1">
          Auto-Reply (Outside Hours)
        </h3>
        <p className="text-[13px] text-on-surface-variant mb-4">
          Automatically reply to customers when a message is received outside working hours.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoReplyEnabled}
              onChange={(e) => setAutoReplyEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant/30 accent-primary"
            />
            <span className="text-[13px] text-on-surface">Enable auto-reply outside business hours</span>
          </label>

          {autoReplyEnabled && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant">
                Auto-Reply Message
              </label>
              <textarea
                value={autoReplyMessage}
                onChange={(e) => setAutoReplyMessage(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Enter your auto-reply message..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-on-primary hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Saving…" : "Save Working Hours"}
        </button>
        {updateMutation.isSuccess && (
          <span className="text-[12px] text-success flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Feature Flags Section ──────────────────────

function FeatureFlagsSection() {
  const { data, isLoading } = useFeatureFlags();
  const updateMutation = useUpdateFeatureFlags();

  const [flags, setFlags] = useState<FeatureFlagsType>({
    campaigns: true,
    automation: true,
    analytics: true,
    scheduler: true,
    billing: true,
  });

  useEffect(() => {
    if (data) setFlags(data);
  }, [data]);

  const toggleFlag = (key: keyof FeatureFlagsType) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    updateMutation.mutate({ [key]: updated[key] });
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  const FLAG_LABELS: Record<keyof FeatureFlagsType, { label: string; description: string }> = {
    campaigns: {
      label: "Campaigns",
      description: "Enable campaign management and bulk messaging",
    },
    automation: {
      label: "Automation",
      description: "Enable automation rules and triggers",
    },
    analytics: {
      label: "Analytics",
      description: "Enable analytics dashboard and reporting",
    },
    scheduler: {
      label: "Scheduler",
      description: "Enable scheduled message sending",
    },
    billing: {
      label: "Billing",
      description: "Enable billing and subscription features",
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ToggleLeft className="h-5 w-5" />
          Feature Flags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {(Object.keys(FLAG_LABELS) as Array<keyof FeatureFlagsType>).map(
          (key) => (
            <div
              key={key}
              className="flex items-center justify-between py-3 border-b border-outline-variant/10 last:border-0"
            >
              <div>
                <p className="text-[13px] font-medium text-on-surface">
                  {FLAG_LABELS[key].label}
                </p>
                <p className="text-[11px] text-on-surface-variant/60">
                  {FLAG_LABELS[key].description}
                </p>
              </div>
              <button
                onClick={() => toggleFlag(key)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  flags[key] ? "bg-primary" : "bg-outline-variant/30"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    flags[key] ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ),
        )}
        {updateMutation.isSuccess && (
          <p className="text-[12px] text-primary pt-2">Updated!</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── AI Settings Section ──────────────────────

function AiSettingsSection() {
  const [aiPurchaseIntent, setAiPurchaseIntent] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load current setting
  useEffect(() => {
    import("@/lib/api/client").then(({ default: apiClient }) => {
      apiClient
        .get("/settings/config/resolve", {
          params: { category: "ai", key: "auto_detect_purchase_intent" },
        })
        .then((r) => {
          setAiPurchaseIntent(r.data?.value === "true");
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  const togglePurchaseIntent = async () => {
    const newValue = !aiPurchaseIntent;
    setAiPurchaseIntent(newValue);
    try {
      const { default: apiClient } = await import("@/lib/api/client");
      await apiClient.post("/settings/config", {
        category: "ai",
        key: "auto_detect_purchase_intent",
        value: String(newValue),
        type: "BOOLEAN",
        scope: "ORG",
      });
    } catch {
      setAiPurchaseIntent(!newValue); // revert on error
    }
  };

  if (loading) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-5 w-5" />
          AI Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-[13px] font-medium text-on-surface">
              Auto-Detect Purchase Intent
            </p>
            <p className="text-[11px] text-on-surface-variant/60">
              AI analyzes incoming messages and auto-creates deals when customers
              show buying intent (e.g., "I want to buy", "send me pricing")
            </p>
          </div>
          <button
            onClick={togglePurchaseIntent}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              aiPurchaseIntent ? "bg-primary" : "bg-outline-variant/30"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                aiPurchaseIntent ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Notifications Section ──────────────────────

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { label: string; description: string }> = {
  MESSAGE_RECEIVED: { label: "Messages", description: "New incoming messages" },
  CONTACT_ASSIGNED: { label: "Contact Assigned", description: "When a contact is assigned to you" },
  CONTACT_REASSIGNED: { label: "Contact Reassigned", description: "When a contact is reassigned" },
  CAMPAIGN_COMPLETED: { label: "Campaign Completed", description: "Campaign finish notifications" },
  CAMPAIGN_FAILED: { label: "Campaign Failed", description: "Campaign failure alerts" },
  AUTOMATION_EXECUTED: { label: "Automation Executed", description: "When an automation rule executes" },
  AUTOMATION_FAILED: { label: "Automation Failed", description: "Automation failure alerts" },
  WHATSAPP_SESSION_DISCONNECTED: { label: "Session Disconnected", description: "WhatsApp session disconnects" },
  PAYMENT_FAILED: { label: "Payment Failed", description: "Payment failure alerts" },
  USAGE_LIMIT_WARNING: { label: "Usage Warning", description: "Approaching plan limits" },
  USAGE_LIMIT_REACHED: { label: "Usage Limit Reached", description: "Plan limit reached alerts" },
  SUBSCRIPTION_EXPIRING: { label: "Subscription Expiring", description: "Subscription expiry warnings" },
  SYSTEM_ALERT: { label: "System Alerts", description: "System-wide notifications" },
};

const ALL_NOTIFICATION_TYPES: NotificationType[] = Object.keys(
  NOTIFICATION_TYPE_LABELS,
) as NotificationType[];

function NotificationsSection() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreference();

  // Build a map from the preferences array for quick lookup
  const prefsMap = (preferences ?? []).reduce(
    (acc, pref) => {
      acc[pref.notificationType] = pref;
      return acc;
    },
    {} as Record<string, NotificationPreference>,
  );

  const getInApp = (type: NotificationType) =>
    prefsMap[type]?.inAppEnabled ?? true;
  const getEmail = (type: NotificationType) =>
    prefsMap[type]?.emailEnabled ?? false;

  const togglePref = (
    type: NotificationType,
    channel: "inAppEnabled" | "emailEnabled",
  ) => {
    const current =
      channel === "inAppEnabled" ? getInApp(type) : getEmail(type);
    updateMutation.mutate({
      notificationType: type,
      [channel]: !current,
    });
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-[12px] text-on-surface-variant/60 mb-4">
          Choose which notifications you receive and how they are delivered.
        </p>
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container/40 border-b border-outline-variant/15">
              <th className="py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Notification Type
              </th>
              <th className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                In-App
              </th>
              <th className="py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {ALL_NOTIFICATION_TYPES.map((type) => {
              const meta = NOTIFICATION_TYPE_LABELS[type];
              return (
                <tr
                  key={type}
                  className="border-b border-outline-variant/10 last:border-0"
                >
                  <td className="py-3">
                    <p className="text-[13px] text-on-surface">{meta.label}</p>
                    <p className="text-[11px] text-on-surface-variant/50">
                      {meta.description}
                    </p>
                  </td>
                  <td className="py-3 text-center">
                    <button
                      onClick={() => togglePref(type, "inAppEnabled")}
                      disabled={updateMutation.isPending}
                      className={`relative rounded-full transition-colors inline-block ${
                        getInApp(type) ? "bg-primary" : "bg-outline-variant/30"
                      } ${updateMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                      style={{ width: 40, height: 22 }}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white transition-transform ${
                          getInApp(type) ? "translate-x-[18px]" : ""
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 text-center">
                    <button
                      onClick={() => togglePref(type, "emailEnabled")}
                      disabled={updateMutation.isPending}
                      className={`relative rounded-full transition-colors inline-block ${
                        getEmail(type) ? "bg-primary" : "bg-outline-variant/30"
                      } ${updateMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                      style={{ width: 40, height: 22 }}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white transition-transform ${
                          getEmail(type) ? "translate-x-[18px]" : ""
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ─── Webhooks Section (EPIC 12 Enhanced) ─────────

const WEBHOOK_EVENTS = [
  "MESSAGE_RECEIVED",
  "MESSAGE_SENT",
  "MESSAGE_DELIVERED",
  "MESSAGE_FAILED",
  "CONTACT_CREATED",
  "CONTACT_UPDATED",
  "CAMPAIGN_COMPLETED",
  "CAMPAIGN_FAILED",
  "PAYMENT_SUCCEEDED",
  "PAYMENT_FAILED",
  "SUBSCRIPTION_CHANGED",
] as const;

function WebhooksSection() {
  const { data, isLoading } = useWebhooks();
  const createMutation = useCreateWebhook();
  const deleteMutation = useDeleteWebhook();

  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newUrl || newEvents.length === 0) return;
    createMutation.mutate(
      {
        url: newUrl,
        events: newEvents as (typeof WEBHOOK_EVENT_TYPES)[number][],
        description: newDescription || undefined,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setNewUrl("");
          setNewDescription("");
          setNewEvents([]);
        },
      },
    );
  };

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event],
    );
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  const webhooks = data?.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 && !showForm ? (
            <div className="text-center py-8">
              <Webhook className="h-10 w-10 text-on-surface-variant/40 mx-auto mb-3" />
              <p className="text-[13px] text-on-surface-variant">
                No webhooks configured
              </p>
              <p className="text-[11px] text-on-surface-variant/60 mt-1">
                Add a webhook to receive real-time event notifications
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <WebhookCard
                  key={wh.id}
                  webhook={wh}
                  expanded={expandedWebhook === wh.id}
                  onToggleExpand={() =>
                    setExpandedWebhook(
                      expandedWebhook === wh.id ? null : wh.id,
                    )
                  }
                  onDelete={() => deleteMutation.mutate(wh.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">New Webhook</CardTitle>
              <button onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-on-surface-variant" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                Endpoint URL
              </label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                Description (optional)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Production event forwarder"
                className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-[14px] text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                Events
              </label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <button
                    key={event}
                    onClick={() => toggleEvent(event)}
                    className={`px-2.5 py-1 rounded-lg text-[12px] font-medium border transition-colors ${
                      newEvents.includes(event)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/50"
                    }`}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={
                  createMutation.isPending ||
                  !newUrl ||
                  newEvents.length === 0
                }
              >
                {createMutation.isPending ? "Creating..." : "Create Webhook"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WebhookCard({
  webhook,
  expanded,
  onToggleExpand,
  onDelete,
}: {
  webhook: WebhookType;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
}) {
  const updateMutation = useUpdateWebhook();
  const testMutation = useTestWebhook();
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDisabled = !webhook.enabled;
  const isAutoDisabled = !!webhook.disabledAt;

  const handleToggleEnabled = () => {
    updateMutation.mutate({
      webhookId: webhook.id,
      enabled: !webhook.enabled,
      version: webhook.version,
    });
  };

  const handleCopySecret = async () => {
    await navigator.clipboard.writeText(webhook.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg bg-surface-container/30 border border-outline-variant/10 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            webhook.enabled ? "bg-primary" : "bg-outline-variant/40"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] text-on-surface font-mono truncate">
              {webhook.url}
            </p>
            {isAutoDisabled && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-error/10 text-error text-[10px] font-medium shrink-0">
                <AlertTriangle className="h-3 w-3" />
                Auto-disabled
              </span>
            )}
          </div>
          {webhook.description && (
            <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
              {webhook.description}
            </p>
          )}
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {webhook.events.map((ev) => (
              <span
                key={ev}
                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant"
              >
                {ev}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => testMutation.mutate(webhook.id)}
            disabled={testMutation.isPending}
            title="Send Test"
          >
            {testMutation.isPending ? (
              <Spinner size="sm" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          <button
            onClick={handleToggleEnabled}
            disabled={updateMutation.isPending}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              webhook.enabled ? "bg-primary" : "bg-outline-variant/30"
            }`}
            title={webhook.enabled ? "Disable" : "Enable"}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                webhook.enabled ? "translate-x-4" : ""
              }`}
            />
          </button>
          <button onClick={onToggleExpand}>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-on-surface-variant" />
            ) : (
              <ChevronDown className="h-4 w-4 text-on-surface-variant" />
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-error hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Test result feedback */}
      {testMutation.isSuccess && (
        <div className="px-4 pb-2">
          <p className="text-[11px] text-primary">
            Test delivery queued (ID: {testMutation.data.deliveryId})
          </p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-outline-variant/10 px-4 py-3 space-y-4">
          {/* Signing Secret */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
              Signing Secret
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[12px] font-mono bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-on-surface">
                {showSecret ? webhook.secret : "whsec_••••••••••••••••"}
              </code>
              <button
                onClick={() => setShowSecret(!showSecret)}
                title={showSecret ? "Hide" : "Reveal"}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4 text-on-surface-variant" />
                ) : (
                  <Eye className="h-4 w-4 text-on-surface-variant" />
                )}
              </button>
              <button onClick={handleCopySecret} title="Copy">
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4 text-on-surface-variant" />
                )}
              </button>
            </div>
          </div>

          {/* Config details */}
          <div className="grid grid-cols-3 gap-4 text-[12px]">
            <div>
              <p className="text-on-surface-variant/60 uppercase tracking-wider text-[10px]">
                Max Retries
              </p>
              <p className="text-on-surface font-medium">{webhook.maxRetries}</p>
            </div>
            <div>
              <p className="text-on-surface-variant/60 uppercase tracking-wider text-[10px]">
                Timeout
              </p>
              <p className="text-on-surface font-medium">
                {webhook.timeoutMs}ms
              </p>
            </div>
            <div>
              <p className="text-on-surface-variant/60 uppercase tracking-wider text-[10px]">
                Failure Count
              </p>
              <p
                className={`font-medium ${webhook.failureCount > 0 ? "text-error" : "text-on-surface"}`}
              >
                {webhook.failureCount}
              </p>
            </div>
          </div>

          {/* Delivery Logs */}
          <WebhookDeliveryLogs webhookId={webhook.id} />
        </div>
      )}
    </div>
  );
}

function WebhookDeliveryLogs({ webhookId }: { webhookId: string }) {
  const [deliveryPage, setDeliveryPage] = useState(1);

  useEffect(() => {
    setDeliveryPage(1);
  }, [webhookId]);

  const { data, isLoading } = useWebhookDeliveries(webhookId, {
    limit: PAGE_SIZE,
    offset: (deliveryPage - 1) * PAGE_SIZE,
  });

  if (isLoading) {
    return (
      <div className="py-4 text-center">
        <Spinner size="sm" className="text-primary" />
      </div>
    );
  }

  const deliveries = data?.data ?? [];

  if (deliveries.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-[11px] text-on-surface-variant/60">
          No deliveries yet
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-1.5">
      <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
        Recent Deliveries
      </p>
      <div className="space-y-1">
        {deliveries.map((d) => (
          <DeliveryRow key={d.id} delivery={d} />
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination
          page={deliveryPage}
          totalPages={totalPages}
          total={data?.total ?? 0}
          onPageChange={setDeliveryPage}
        />
      )}
    </div>
  );
}

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const statusConfig: Record<
    WebhookDeliveryStatus,
    { icon: typeof CheckCircle2; color: string; label: string }
  > = {
    SUCCESS: {
      icon: CheckCircle2,
      color: "text-primary",
      label: "Success",
    },
    FAILED: {
      icon: XCircle,
      color: "text-error",
      label: "Failed",
    },
    RETRYING: {
      icon: RotateCw,
      color: "text-warning",
      label: "Retrying",
    },
    PENDING: {
      icon: Clock,
      color: "text-on-surface-variant",
      label: "Pending",
    },
  };

  const config = statusConfig[delivery.status];
  const StatusIcon = config.icon;
  const timestamp = new Date(delivery.createdAt).toLocaleString();

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded bg-surface-container-lowest/50 text-[12px]">
      <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${config.color}`} />
      <span className="text-on-surface-variant font-mono shrink-0">
        {delivery.eventType}
      </span>
      {delivery.httpStatus && (
        <span
          className={`shrink-0 ${
            delivery.httpStatus >= 200 && delivery.httpStatus < 300
              ? "text-primary"
              : "text-error"
          }`}
        >
          {delivery.httpStatus}
        </span>
      )}
      {delivery.duration !== null && (
        <span className="text-on-surface-variant/50 shrink-0">
          {delivery.duration}ms
        </span>
      )}
      {delivery.error && (
        <span className="text-error/70 truncate min-w-0">
          {delivery.error}
        </span>
      )}
      <span className="text-on-surface-variant/40 ml-auto shrink-0">
        {timestamp}
      </span>
    </div>
  );
}

// ─── Developer API Section ──────────────────────

function DeveloperApiSection() {
  const { data: stats, isLoading: statsLoading } = useDeveloperDashboard();
  const { data: keys, isLoading: keysLoading } = useApiKeys();
  const { data: logs } = useDeveloperLogs(10);
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const rotateKey = useRotateApiKey();

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read", "write", "messages"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState<DeveloperApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "keys" | "docs" | "logs">("overview");
  const [keyConfirm, setKeyConfirm] = useState<{ type: "rotate" | "revoke"; id: string; name: string } | null>(null);

  const AVAILABLE_SCOPES = ["read", "write", "contacts", "messages", "campaigns"];

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    const result = await createKey.mutateAsync({
      name: newKeyName.trim(),
      scopes: newKeyScopes,
      expiresInDays: newKeyExpiry ? Number(newKeyExpiry) : undefined,
    });
    setCreatedKey(result);
    setNewKeyName("");
    setNewKeyExpiry("");
    setShowCreateKey(false);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const usagePercent = stats?.messagesLimit
    ? Math.min(100, Math.round(((stats.messagesUsed ?? 0) / stats.messagesLimit) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit">
        {(
          [
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "keys", label: "API Keys", icon: Key },
            { id: "docs", label: "Quick Start", icon: FileCode },
            { id: "logs", label: "API Logs", icon: Activity },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              activeSubTab === tab.id
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {statsLoading ? (
            <SectionLoader />
          ) : stats ? (
            <>
              {/* Usage Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">Messages Used</p>
                    <p className="text-2xl font-bold text-on-surface mt-1">
                      {(stats.messagesUsed ?? 0).toLocaleString()}
                      <span className="text-[13px] font-normal text-on-surface-variant">
                        {" / "}{(stats.messagesLimit ?? 0) > 0 ? (stats.messagesLimit ?? 0).toLocaleString() : "∞"}
                      </span>
                    </p>
                    {(stats.messagesLimit ?? 0) > 0 && (
                      <div className="mt-2 h-2 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            usagePercent > 90 ? "bg-error" : usagePercent > 70 ? "bg-warning" : "bg-primary"
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">Active Sessions</p>
                    <p className="text-2xl font-bold text-on-surface mt-1">{stats.activeSessions}</p>
                    <p className="text-[12px] text-on-surface-variant mt-1">WhatsApp connected</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">API Keys</p>
                    <p className="text-2xl font-bold text-on-surface mt-1">{stats.activeApiKeys}</p>
                    <p className="text-[12px] text-on-surface-variant mt-1">Active keys</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">Contacts</p>
                    <p className="text-2xl font-bold text-on-surface mt-1">{(stats.totalContacts ?? 0).toLocaleString()}</p>
                    <p className="text-[12px] text-on-surface-variant mt-1">Total contacts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-[15px]">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button size="sm" onClick={() => setActiveSubTab("keys")}>
                    <Key className="h-4 w-4 mr-2" />
                    Manage API Keys
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setActiveSubTab("docs")}>
                    <FileCode className="h-4 w-4 mr-2" />
                    View API Docs
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setActiveSubTab("logs")}>
                    <Activity className="h-4 w-4 mr-2" />
                    View API Logs
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* ── API Keys ── */}
      {activeSubTab === "keys" && (
        <div className="space-y-4">
          {/* Created Key Banner */}
          {createdKey?.rawKey && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-on-surface flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      New API Key — Copy it now, it will never be shown again!
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-[13px] bg-surface-container px-3 py-1.5 rounded-lg font-mono break-all">
                        {createdKey.rawKey}
                      </code>
                      <button
                        onClick={() => handleCopyKey(createdKey.rawKey!)}
                        className="shrink-0 p-1.5 rounded-lg hover:bg-surface-container transition-colors"
                        title="Copy"
                      >
                        {copiedKey ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setCreatedKey(null)} className="p-1 hover:bg-surface-container rounded-lg">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Key Form */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[15px]">API Keys</CardTitle>
              <Button size="sm" onClick={() => setShowCreateKey(!showCreateKey)}>
                <Plus className="h-4 w-4 mr-1" />
                New API Key
              </Button>
            </CardHeader>
            <CardContent>
              {showCreateKey && (
                <div className="mb-6 p-4 border border-outline-variant/20 rounded-xl space-y-4">
                  <div>
                    <label className="text-[12px] font-medium text-on-surface-variant">Key Name</label>
                    <input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production API Key"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant/30 bg-surface text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-on-surface-variant">Scopes</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <button
                          key={scope}
                          onClick={() =>
                            setNewKeyScopes((prev) =>
                              prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
                            )
                          }
                          className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                            newKeyScopes.includes(scope)
                              ? "bg-primary text-on-primary border-primary"
                              : "border-outline-variant/30 text-on-surface-variant hover:border-primary/50"
                          }`}
                        >
                          {scope}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-on-surface-variant">Expires In (days, optional)</label>
                    <input
                      value={newKeyExpiry}
                      onChange={(e) => setNewKeyExpiry(e.target.value)}
                      type="number"
                      placeholder="Leave empty for no expiry"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant/30 bg-surface text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="secondary" onClick={() => setShowCreateKey(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleCreateKey} disabled={createKey.isPending || !newKeyName.trim()}>
                      {createKey.isPending ? <Spinner size="sm" className="mr-2" /> : null}
                      Create Key
                    </Button>
                  </div>
                </div>
              )}

              {/* Keys Table */}
              {keysLoading ? (
                <SectionLoader />
              ) : keys && keys.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-on-surface-variant border-b border-outline-variant/15">
                        <th className="pb-2 font-medium">Name</th>
                        <th className="pb-2 font-medium">Key</th>
                        <th className="pb-2 font-medium">Scopes</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Last Used</th>
                        <th className="pb-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((key) => (
                        <tr key={key.id} className="border-b border-outline-variant/10">
                          <td className="py-3 font-medium text-on-surface">{key.name}</td>
                          <td className="py-3">
                            <code className="text-[12px] bg-surface-container px-2 py-0.5 rounded font-mono">
                              {key.keyPrefix}...
                            </code>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {key.scopes.map((s) => (
                                <span key={s} className="px-1.5 py-0.5 bg-surface-container rounded text-[11px]">{s}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3">
                            {key.isActive ? (
                              <span className="flex items-center gap-1 text-primary text-[12px]">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-error text-[12px]">
                                <XCircle className="h-3.5 w-3.5" /> Revoked
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-on-surface-variant">
                            {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}
                          </td>
                          <td className="py-3">
                            {key.isActive && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => setKeyConfirm({ type: "rotate", id: key.id, name: key.name })}
                                  disabled={rotateKey.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors disabled:opacity-40"
                                >
                                  <RotateCw className="h-3 w-3" />
                                  Rotate
                                </button>
                                <button
                                  onClick={() => setKeyConfirm({ type: "revoke", id: key.id, name: key.name })}
                                  disabled={revokeKey.isPending}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors disabled:opacity-40"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Revoke
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-on-surface-variant text-[13px]">
                  No API keys yet. Create one to get started.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Quick Start / Docs ── */}
      {activeSubTab === "docs" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">Quick Start Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div>
                <h4 className="text-[13px] font-semibold text-on-surface mb-2">1. Get your API Key</h4>
                <p className="text-[13px] text-on-surface-variant mb-2">
                  Go to the &quot;API Keys&quot; tab above and create a new key. Copy it immediately — it&apos;s shown only once.
                </p>
              </div>

              {/* Step 2 */}
              <div>
                <h4 className="text-[13px] font-semibold text-on-surface mb-2">2. Connect WhatsApp</h4>
                <p className="text-[13px] text-on-surface-variant mb-2">
                  Go to Settings → WhatsApp and scan the QR code with your phone. Your session must be connected before sending messages.
                </p>
              </div>

              {/* Step 3 — Send a Message */}
              <div>
                <h4 className="text-[13px] font-semibold text-on-surface mb-2">3. Send a Message</h4>

                {/* cURL */}
                <p className="text-[12px] font-medium text-on-surface-variant mb-1">cURL</p>
                <pre className="bg-surface-container rounded-xl p-4 text-[12px] font-mono text-on-surface overflow-x-auto whitespace-pre">
{`curl -X POST \\
  ${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/v1/developer/messages/send \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "to": "+919876543210",
    "type": "text",
    "body": "Hello from Wazelo CRM API!"
  }'`}
                </pre>

                {/* Node.js */}
                <p className="text-[12px] font-medium text-on-surface-variant mt-4 mb-1">Node.js (axios)</p>
                <pre className="bg-surface-container rounded-xl p-4 text-[12px] font-mono text-on-surface overflow-x-auto whitespace-pre">
{`const axios = require("axios");

const res = await axios.post(
  "${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/v1/developer/messages/send",
  {
    to: "+919876543210",
    type: "text",
    body: "Hello from Wazelo CRM API!",
  },
  {
    headers: { "X-API-Key": "YOUR_API_KEY" },
  }
);

console.log(res.data);
// { message: { id: "...", to: "+91...", status: "QUEUED" } }`}
                </pre>

                {/* Python */}
                <p className="text-[12px] font-medium text-on-surface-variant mt-4 mb-1">Python (requests)</p>
                <pre className="bg-surface-container rounded-xl p-4 text-[12px] font-mono text-on-surface overflow-x-auto whitespace-pre">
{`import requests

res = requests.post(
    "${typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/v1/developer/messages/send",
    json={
        "to": "+919876543210",
        "type": "text",
        "body": "Hello from Wazelo CRM API!",
    },
    headers={"X-API-Key": "YOUR_API_KEY"},
)

print(res.json())`}
                </pre>
              </div>

              {/* Step 4 — Webhooks */}
              <div>
                <h4 className="text-[13px] font-semibold text-on-surface mb-2">4. Receive Messages (Webhooks)</h4>
                <p className="text-[13px] text-on-surface-variant mb-2">
                  Register a webhook URL to receive incoming messages. Go to Settings → Webhooks and add your endpoint with the <code className="bg-surface-container px-1 rounded text-[12px]">message.received</code> event.
                </p>
                <pre className="bg-surface-container rounded-xl p-4 text-[12px] font-mono text-on-surface overflow-x-auto whitespace-pre">
{`// Webhook payload (POST to your URL):
{
  "event": "message.received",
  "payload": {
    "messageId": "uuid",
    "from": "+919876543210",
    "type": "text",
    "body": "Hi, I need help!",
    "timestamp": "2026-04-03T10:30:00Z"
  }
}`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* API Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">API Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-on-surface-variant border-b border-outline-variant/15">
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Endpoint</th>
                      <th className="pb-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-[12px]">
                    {[
                      ["POST", "/developer/messages/send", "Send a WhatsApp message"],
                      ["GET", "/developer/messages", "List sent/received messages"],
                      ["GET", "/developer/messages/:id", "Get message status & events"],
                      ["GET", "/developer/contacts", "List contacts"],
                      ["POST", "/developer/contacts", "Create a contact"],
                      ["GET", "/developer/session/status", "Check WhatsApp connection"],
                      ["POST", "/developer/webhooks", "Register webhook URL"],
                      ["GET", "/developer/webhooks", "List webhooks"],
                      ["PUT", "/developer/webhooks/:id", "Update webhook"],
                      ["DELETE", "/developer/webhooks/:id", "Delete webhook"],
                    ].map(([method, path, desc]) => (
                      <tr key={`${method}-${path}`} className="border-b border-outline-variant/10">
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                            method === "POST" ? "bg-primary/10 text-primary" :
                            method === "DELETE" ? "bg-error/10 text-error" :
                            method === "PUT" ? "bg-warning/10 text-warning" :
                            "bg-surface-container text-on-surface"
                          }`}>
                            {method}
                          </span>
                        </td>
                        <td className="py-2 text-on-surface">/api/v1{path}</td>
                        <td className="py-2 text-on-surface-variant font-sans">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[12px] text-on-surface-variant">
                All Developer API endpoints use <code className="bg-surface-container px-1 rounded">X-API-Key</code> header for authentication. No JWT required.
              </p>
            </CardContent>
          </Card>

          {/* Message Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[15px]">Supported Message Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-[13px] font-semibold text-on-surface">Text Message</p>
                  <pre className="mt-1 bg-surface-container rounded-xl p-3 text-[12px] font-mono text-on-surface overflow-x-auto">
{`{ "to": "+91...", "type": "text", "body": "Hello!" }`}
                  </pre>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-on-surface">Image Message</p>
                  <pre className="mt-1 bg-surface-container rounded-xl p-3 text-[12px] font-mono text-on-surface overflow-x-auto">
{`{ "to": "+91...", "type": "image", "mediaUrl": "https://...", "caption": "Check this out" }`}
                  </pre>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-on-surface">Interactive Buttons</p>
                  <pre className="mt-1 bg-surface-container rounded-xl p-3 text-[12px] font-mono text-on-surface overflow-x-auto">
{`{
  "to": "+91...",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": "Choose an option:",
    "buttons": [
      { "id": "buy", "title": "Buy Now" },
      { "id": "info", "title": "More Info" }
    ]
  }
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── API Logs ── */}
      {activeSubTab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[15px]">Recent API Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {logs?.data && logs.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-on-surface-variant border-b border-outline-variant/15">
                      <th className="pb-2 font-medium">To</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Message</th>
                      <th className="pb-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.data.map((log) => (
                      <tr key={log.id} className="border-b border-outline-variant/10">
                        <td className="py-2.5 font-mono text-[12px]">{log.contactPhone}</td>
                        <td className="py-2.5">
                          <span className="px-1.5 py-0.5 bg-surface-container rounded text-[11px] uppercase">{log.type}</span>
                        </td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                            log.status === "DELIVERED" || log.status === "READ" ? "bg-primary/10 text-primary" :
                            log.status === "SENT" ? "bg-primary/10 text-primary" :
                            log.status === "QUEUED" || log.status === "PROCESSING" ? "bg-warning/10 text-warning" :
                            log.status === "FAILED" ? "bg-error/10 text-error" : "bg-surface-container text-on-surface"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-on-surface-variant max-w-[200px] truncate">{log.body || "—"}</td>
                        <td className="py-2.5 text-on-surface-variant text-[12px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center py-8 text-on-surface-variant text-[13px]">
                No API activity yet. Send your first message using the API.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog for rotate/revoke */}
      <ConfirmDialog
        open={!!keyConfirm}
        title={keyConfirm?.type === "rotate" ? "Rotate API Key" : "Revoke API Key"}
        message={
          keyConfirm?.type === "rotate"
            ? `"${keyConfirm.name}" will be revoked and a new key generated. Copy the new key immediately — it won't be shown again.`
            : `"${keyConfirm?.name}" will be permanently disabled. Any integrations using this key will stop working immediately.`
        }
        confirmLabel={keyConfirm?.type === "rotate" ? "Rotate Key" : "Revoke Key"}
        variant={keyConfirm?.type === "revoke" ? "danger" : "warning"}
        loading={rotateKey.isPending || revokeKey.isPending}
        onCancel={() => setKeyConfirm(null)}
        onConfirm={() => {
          if (!keyConfirm) return;
          if (keyConfirm.type === "rotate") {
            rotateKey.mutate(keyConfirm.id, {
              onSuccess: (result) => {
                if (result) { setCreatedKey(result); setCopiedKey(false); setActiveSubTab("keys"); }
                setKeyConfirm(null);
              },
            });
          } else {
            revokeKey.mutate(keyConfirm.id, {
              onSuccess: () => setKeyConfirm(null),
            });
          }
        }}
      />
    </div>
  );
}

// ─── Loader ─────────────────────────────────────

function SectionLoader() {
  return (
    <Card>
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" className="text-primary" />
      </div>
    </Card>
  );
}

// ─── SLA Section ──────────────────────────────────
function SlaSection() {
  const { data: policies, isLoading } = useSlaPolicies();
  const createPolicy = useCreateSlaPolicy();
  const updatePolicy = useUpdateSlaPolicy();
  const deletePolicy = useDeleteSlaPolicy();

  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState<SlaPolicy | null>(null);

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-semibold text-on-surface flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            SLA Policies
          </h2>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Set response time targets. Agents get warned before breach.
          </p>
        </div>
        {!showForm && !editPolicy && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Policy
          </button>
        )}
      </div>

      {showForm && (
        <SlaPolicyForm
          onSubmit={(data) => createPolicy.mutate(data as any, { onSuccess: () => setShowForm(false) })}
          onCancel={() => setShowForm(false)}
          isSubmitting={createPolicy.isPending}
        />
      )}

      {editPolicy && (
        <SlaPolicyForm
          policy={editPolicy}
          onSubmit={(data) => updatePolicy.mutate({ id: editPolicy.id, data: data as any }, { onSuccess: () => setEditPolicy(null) })}
          onCancel={() => setEditPolicy(null)}
          isSubmitting={updatePolicy.isPending}
        />
      )}

      <SlaPolicyList
        policies={policies ?? []}
        onToggle={(id, isActive) => updatePolicy.mutate({ id, data: { isActive } })}
        onEdit={(p) => { setEditPolicy(p); setShowForm(false); }}
        onDelete={(id) => { if (confirm("Delete this SLA policy?")) deletePolicy.mutate(id); }}
        isUpdating={updatePolicy.isPending || deletePolicy.isPending}
      />

      {(policies?.length ?? 0) > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
          <p className="text-[12px] text-on-surface-variant">
            <strong className="text-on-surface">How it works:</strong> When a conversation starts,
            the timer begins. If no reply within the warning threshold, the agent gets alerted.
            Exceeding the breach threshold marks it as an SLA breach visible in SLA Tracking.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Shopify Section ────────────────────────────────────────────────────────

const SHOPIFY_EVENTS = [
  { icon: Package, label: "Order Created", desc: "Auto-create/update contact + note when customer places order" },
  { icon: Zap, label: "Order Fulfilled", desc: "Fire automation when order is shipped" },
  { icon: RotateCcw, label: "Cart Abandoned", desc: "Trigger WhatsApp reminder when checkout is abandoned" },
];

function ShopifyWebhookUrlCard({ orgId }: { orgId: string }) {
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

function ShopifyIntegrationForm({ existing, onSuccess, onCancel }: { existing?: IntegrationConfig; onSuccess: () => void; onCancel: () => void }) {
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
    if (!isEditing && !domain.endsWith(".myshopify.com") && !domain.includes(".")) {
      setError("Enter a valid shop domain (e.g. mystore.myshopify.com)");
      return;
    }
    const credentials = { shopDomain: domain || undefined, accessToken: accessToken.trim() || undefined, webhookSecret: webhookSecret.trim() || undefined };
    if (isEditing && existing) {
      updateIntegration.mutate({ id: existing.id, credentials, version: existing.version }, { onSuccess, onError: (err: Error) => setError(err.message) });
    } else {
      createIntegration.mutate({ provider: "SHOPIFY", displayName: `Shopify — ${domain}`, credentials: { shopDomain: domain, accessToken: accessToken.trim(), webhookSecret: webhookSecret.trim() } }, { onSuccess, onError: (err: Error) => setError(err.message) });
    }
  }

  const inputCls = "w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant/15 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-on-surface-variant">Shop Domain {!isEditing && <span className="text-error">*</span>}</label>
        <input type="text" value={shopDomain} onChange={(e) => setShopDomain(e.target.value)} required={!isEditing} placeholder="mystore.myshopify.com" className={inputCls} />
        {isEditing && <p className="text-[11px] text-on-surface-variant/50">Currently connected. Leave blank to keep existing domain.</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-on-surface-variant">Admin API Access Token {!isEditing && <span className="text-error">*</span>}</label>
        <div className="relative">
          <input type={showToken ? "text" : "password"} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} required={!isEditing} placeholder={isEditing ? "Leave blank to keep existing" : "shpat_xxxxxxxxxxxx"} className={`${inputCls} pr-10`} />
          <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[11px] text-on-surface-variant/50">Shopify Admin → Apps → Develop apps → Admin API access token. Requires: <code className="text-primary">read_orders</code>, <code className="text-primary">read_customers</code>.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-on-surface-variant">Webhook Signing Secret {!isEditing && <span className="text-error">*</span>}</label>
        <div className="relative">
          <input type={showSecret ? "text" : "password"} value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} required={!isEditing} placeholder={isEditing ? "Leave blank to keep existing" : "Your webhook signing secret"} className={`${inputCls} pr-10`} />
          <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[11px] text-on-surface-variant/50">Shopify Admin → Settings → Notifications → Webhooks → Signing secret.</p>
      </div>
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-error/10 border border-error/20">
          <AlertCircle className="h-4 w-4 text-error shrink-0" />
          <p className="text-[12px] text-error">{error}</p>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          {isEditing ? "Update" : "Connect Shopify"}
        </Button>
      </div>
    </form>
  );
}

function ShopifySection() {
  const user = useAuthStore((s) => s.user);
  const { data: integrations, isLoading } = useIntegrations();
  const testIntegration = useTestIntegration();
  const deleteIntegration = useDeleteIntegration();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const shopifyIntegration = integrations?.find((i) => i.provider === "SHOPIFY");

  useEffect(() => {
    if (!isLoading && !shopifyIntegration) setShowForm(true);
  }, [isLoading, shopifyIntegration]);

  function handleTest() {
    if (!shopifyIntegration) return;
    setTestResult(null);
    testIntegration.mutate(shopifyIntegration.id, {
      onSuccess: (result) => setTestResult(result),
      onError: (err) => setTestResult({ success: false, error: err.message }),
    });
  }

  function handleDelete() {
    if (!shopifyIntegration) return;
    if (!confirm("Disconnect Shopify? Existing contacts and notes will be kept.")) return;
    deleteIntegration.mutate(shopifyIntegration.id);
  }

  if (isLoading) return <SectionLoader />;

  const statusColor =
    shopifyIntegration?.status === "ACTIVE" ? "text-green-600 bg-green-100" :
    shopifyIntegration?.status === "ERROR"  ? "text-red-600 bg-red-100" :
    "text-on-surface-variant bg-surface-container";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-[17px] font-semibold text-on-surface flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-green-600" />
          Shopify Integration
        </h2>
        <p className="text-[13px] text-on-surface-variant mt-0.5">
          Sync orders, customers, and abandoned carts with your CRM
        </p>
      </div>

      {/* What you get — shown when not yet connected */}
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
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/8">
            <div className="h-9 w-9 rounded-xl bg-green-100 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-on-surface">{shopifyIntegration.displayName}</p>
              <p className="text-[11px] text-on-surface-variant/60">Connected · {new Date(shopifyIntegration.updatedAt).toLocaleDateString()}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${statusColor}`}>{shopifyIntegration.status}</span>
          </div>
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
          <div className="px-4 py-3 border-b border-outline-variant/8">
            <ShopifyWebhookUrlCard orgId={user?.orgId ?? ""} />
          </div>
          {shopifyIntegration.lastError && (
            <div className="px-4 py-2 border-b border-outline-variant/8">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-error/8 border border-error/15">
                <AlertCircle className="h-3.5 w-3.5 text-error shrink-0 mt-0.5" />
                <p className="text-[11px] text-error">{shopifyIntegration.lastError}</p>
              </div>
            </div>
          )}
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
          <div className="flex items-center gap-2 px-4 py-3">
            <Button variant="secondary" size="sm" onClick={handleTest} disabled={testIntegration.isPending}>
              {testIntegration.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Test Connection
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit Credentials</Button>
            <a
              href={`https://${shopifyIntegration.displayName.replace("Shopify — ", "")}/admin`}
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
      )}

      {/* Setup / Edit form */}
      {(!shopifyIntegration || editing) && (showForm || editing) && (
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5">
          <h3 className="text-[14px] font-semibold text-on-surface mb-4">
            {editing ? "Update Shopify Credentials" : "Connect Your Shopify Store"}
          </h3>
          <ShopifyIntegrationForm
            existing={editing ? shopifyIntegration : undefined}
            onSuccess={() => { setShowForm(false); setEditing(false); }}
            onCancel={() => { setShowForm(false); setEditing(false); }}
          />
        </div>
      )}

      {/* Setup guide */}
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
  );
}
