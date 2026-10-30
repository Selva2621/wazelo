"use client";

import { ApiTryIt, publicApiBase } from "@/components/settings/api-try-it";
import { useState, useEffect, useMemo } from "react";
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
import { useMobileTitle } from "@/hooks/use-mobile-chrome";
import { GroupedSection, ListRow } from "@/components/ios/grouped-list";
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
  useFreelancerProfiles,
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
import type { DeveloperApiKey, DeveloperApiRequestLog } from "@/lib/types/developer";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrowserPushCard } from "@/components/notifications/browser-push-card";
import {
  FilesCard,
  InstructionsCard,
  WebsitesCard,
  costOf,
  knowledgeCard,
} from "@/components/knowledge/knowledge-cards";
import { UnansweredCard } from "@/components/knowledge/unanswered-card";
import { FaqsCard } from "@/components/knowledge/faqs-card";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
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
import { freelancerTypeOptions, visibleFreelancerOptions } from "@/lib/constants/outreach";
import { COUNTRIES, CURRENCY_CODES, DEFAULT_COUNTRY_CODE, getCountry } from "@/lib/constants/countries";
import { CountrySelect } from "@/components/ui/country-select";
import { cn } from "@/lib/utils";
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
  useDeleteAiMemoryDocument,
} from "@/hooks/use-settings";
import type { SlaPolicy } from "@/lib/types/sla";
import { IconButton } from "@/components/ui/icon-button";
import { PageHeader } from "@/components/layout/page-header";
import { useProductTerms } from "@/lib/product-terms";

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

// Tabs grouped by what the admin is trying to do, so related settings sit together
const TAB_GROUPS: { label: string; tabs: { id: SettingsTab; label: string; icon: typeof Building2 }[] }[] = [
  {
    label: "Workspace",
    tabs: [
      { id: "organization", label: "Organization", icon: Building2 },
      { id: "working-hours", label: "Working Hours", icon: Clock },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Channels",
    tabs: [
      { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
      { id: "shopify", label: "Shopify", icon: ShoppingBag },
    ],
  },
  {
    label: "AI",
    tabs: [
      { id: "features", label: "Features & AI", icon: ToggleLeft },
      { id: "ai-memory", label: "Business Knowledge", icon: Zap },
    ],
  },
  {
    label: "Service",
    tabs: [
      { id: "sla", label: "SLA Policies", icon: Shield },
    ],
  },
  {
    label: "Developers",
    tabs: [
      { id: "developer-api", label: "API Keys & Docs", icon: Code },
      { id: "webhooks", label: "Webhooks", icon: Webhook },
    ],
  },
];

// Icon tile colours for the mobile section list
const MOBILE_TAB_TILE: Record<SettingsTab, string> = {
  organization: "bg-chart-6",
  "working-hours": "bg-chart-1",
  notifications: "bg-error",
  whatsapp: "bg-[#25D366]",
  shopify: "bg-chart-3",
  features: "bg-chart-5",
  "ai-memory": "bg-chart-4",
  sla: "bg-chart-2",
  "developer-api": "bg-primary",
  webhooks: "bg-chart-6",
};

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

  // Mobile: no ?tab shows the list of sections; ?tab shows that section alone
  const mobileTabLabel = tabParam
    ? TAB_GROUPS.flatMap((g) => g.tabs).find((t) => t.id === tabParam)?.label
    : null;
  useMobileTitle(mobileTabLabel);

  if (user?.role !== "ADMIN") {
    return <EmployeeSettingsRedirect />;
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Mobile: iOS Settings-style section list */}
      {!tabParam && (
        <div data-tour="settings-list" className="lg:hidden -mx-4 -mt-2">
          {TAB_GROUPS.map((group) => (
            <GroupedSection key={group.label} header={group.label}>
              {group.tabs.map((tab) => (
                <ListRow
                  key={tab.id}
                  icon={<tab.icon className="h-[18px] w-[18px]" />}
                  iconClassName={MOBILE_TAB_TILE[tab.id]}
                  title={tab.label}
                  href={`/settings?tab=${tab.id}`}
                />
              ))}
            </GroupedSection>
          ))}
        </div>
      )}

      <PageHeader title="Settings" className="max-lg:hidden" />

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar Nav */}
        <div className="md:w-56 shrink-0 max-lg:hidden">
          <nav data-tour="settings-nav" className="space-y-4">
            {TAB_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-1 text-caption font-medium text-on-surface-variant">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      aria-current={activeTab === tab.id ? "page" : undefined}
                      className={cn(
                        "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-body font-medium transition-colors duration-120 ease-standard",
                        "outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        activeTab === tab.id
                          ? "bg-primary/10 text-primary"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                      )}
                    >
                      <tab.icon className="h-4 w-4 shrink-0" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Content */}
        {/* Forms read best at a fixed width; tabs with tables and logs keep the full column */}
        <div
          className={cn(
            "flex-1 min-w-0",
            !["developer-api", "webhooks", "sla"].includes(activeTab) && "max-w-3xl",
            !tabParam && "max-lg:hidden",
          )}
        >
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
  const terms = useProductTerms();
  const updateMutation = useUpdateOrgSettings();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [country, setCountry] = useState(DEFAULT_COUNTRY_CODE);
  const [currency, setCurrency] = useState("INR");
  const [language, setLanguage] = useState("en");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [freelancerTypes, setFreelancerTypes] = useState<string[]>([]);
  const [freelancerService, setFreelancerService] = useState("");
  const isFreelancer = data?.orgType === "FREELANCER";
  const hasOther = freelancerTypes.includes("OTHER");
  const { data: catalog } = useFreelancerProfiles(isFreelancer);
  const typeOptions = freelancerTypeOptions(catalog);
  const [typeQuery, setTypeQuery] = useState("");
  const [showAllTypes, setShowAllTypes] = useState(false);
  const visibleTypes = visibleFreelancerOptions(typeOptions, { query: typeQuery, selected: freelancerTypes, showAll: showAllTypes });

  const toggleFreelancerType = (value: string) =>
    setFreelancerTypes((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]));

  useEffect(() => {
    if (data) {
      setName(data.name ?? "");
      setTimezone(data.timezone ?? "UTC");
      setCountry(data.country ?? DEFAULT_COUNTRY_CODE);
      setCurrency(data.currency ?? "INR");
      setLanguage(data.language ?? "en");
      setIndustry(data.industry ?? "");
      setDescription(data.description ?? "");
      setWebsite(data.website ?? "");
      setFreelancerTypes(data.freelancerTypes ?? []);
      setFreelancerService(data.freelancerService ?? "");
    }
  }, [data]);

  const handleSave = () => {
    const payload: UpdateOrgSettingsRequest = {
      name,
      timezone,
      country,
      currency,
      language,
      industry,
      description,
      website,
      // Choosing what they do adds the matching pitch templates (existing ones are kept)
      ...(isFreelancer && freelancerTypes.length > 0 && {
        freelancerTypes,
        freelancerService: hasOther ? freelancerService.trim() : "",
      }),
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return <SectionLoader />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <Building2 className="h-5 w-5" />
          Organization Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Org Name */}
        <div className="space-y-1.5">
          <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
            Organization Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="My Organization"
          />
        </div>

        {/* Country — sets the default phone code, currency and timezone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="org-country"
              className="text-label font-medium text-on-surface-variant uppercase tracking-wider"
            >
              Country
            </label>
            <CountrySelect
              id="org-country"
              value={country}
              showDialCode
              onChange={(code) => {
                const c = getCountry(code);
                setCountry(c.code);
                setCurrency(c.currency);
                setTimezone(c.timezone);
              }}
            />
            <p className="text-caption text-on-surface-variant">
              Numbers saved without a country code get +{getCountry(country).dialCode}
            </p>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="org-currency"
              className="text-label font-medium text-on-surface-variant uppercase tracking-wider"
            >
              Currency
            </label>
            <select
              id="org-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <p className="text-caption text-on-surface-variant">Default for deals and {terms.plural}</p>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {[...new Set([...TIMEZONES, ...COUNTRIES.map((c) => c.timezone), timezone])].map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
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
          <p className="text-label font-semibold text-on-surface-variant uppercase tracking-wider mb-4">
            Business Profile
          </p>
          <div className="space-y-4">
            {isFreelancer && (
              <div className="space-y-1.5">
                <p id="freelancer-types-label" className="text-label font-medium text-on-surface-variant">
                  What do you do? <span className="text-on-surface-variant/60">(pick all that apply)</span>
                </p>
                <input
                  type="search"
                  aria-label="Search your line of work"
                  value={typeQuery}
                  onChange={(e) => setTypeQuery(e.target.value)}
                  placeholder="Search, e.g. civil, tutor, makeup"
                  className="w-full h-9 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div role="group" aria-labelledby="freelancer-types-label" className="flex flex-wrap gap-2">
                  {visibleTypes.map((option) => {
                    const selected = freelancerTypes.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleFreelancerType(option.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 h-8 rounded-full border px-3 text-body transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-outline-variant/40 text-on-surface-variant hover:border-outline hover:text-on-surface",
                        )}
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {!typeQuery.trim() && visibleTypes.length < typeOptions.length && (
                  <button
                    type="button"
                    onClick={() => setShowAllTypes(true)}
                    className="text-body text-primary hover:underline"
                  >
                    Show all {typeOptions.length - 1} types
                  </button>
                )}
                {hasOther && (
                  <input
                    type="text"
                    value={freelancerService}
                    onChange={(e) => setFreelancerService(e.target.value)}
                    placeholder="Your service, e.g. interior design"
                    maxLength={120}
                    className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
                <p className="text-caption text-on-surface-variant/60">
                  Adds message templates and outreach written for your work. Templates you already have are not changed.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. E-commerce, Healthcare, Education"
                className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">
                Business Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what your business does..."
                maxLength={2000}
                rows={3}
                className="w-full rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="text-caption text-on-surface-variant/60 text-right">{description.length}/2000</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
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
            <span className="ml-3 text-label text-primary">Saved!</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Business Knowledge Section ─────────────────
// One place for what every AI feature knows about the business. The cards are
// shared with Chatbot → Knowledge, so both pages edit the same data.

const KNOWLEDGE_USED_BY = ["Chatbot", "Website chat", "Sequences", "Campaigns", "Automation", "Proposals", "Templates", "Reply suggestions"];

function KnowledgeStep({ n, title, children, action }: { n: number; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section aria-labelledby={`bk-${n}`} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={`bk-${n}`} className="flex items-center gap-2 text-body-lg font-semibold text-on-surface">
          <span aria-hidden className="grid size-6 place-items-center rounded-full bg-primary/10 text-caption font-semibold tabular-nums text-primary">
            {n}
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AiMemorySection() {
  const { data, isLoading } = useAiMemory();
  const rebuildMutation = useRebuildAiMemory();
  const deleteDocMutation = useDeleteAiMemoryDocument();
  const { data: creditsData } = useAiCredits();
  const { data: products } = useProducts();
  const buildCost = costOf(creditsData?.costs, "kb_build", 10);
  const faqCost = costOf(creditsData?.costs, "faq_generate", 3);
  const productCount = Array.isArray(products) ? products.length : 0;
  const terms = useProductTerms();

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-8">
      {/* What this page is for, and everything that reads it */}
      <div className={cn(knowledgeCard, "space-y-2 p-5")}>
        <p className="text-body text-on-surface">
          What the AI knows about your business. Fill it once — every AI feature uses it.
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Used by">
          {KNOWLEDGE_USED_BY.map((f) => (
            <li key={f} className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-0.5 text-caption text-on-surface-variant">
              {f}
            </li>
          ))}
        </ul>
      </div>

      <KnowledgeStep
        n={1}
        title="About your business"
        action={
          <Link href="/settings?tab=organization" className="text-label font-medium text-primary hover:underline">
            Edit profile
          </Link>
        }
      >
        <p className="text-label text-on-surface-variant">
          Name, industry and a short description come from your business profile.
        </p>
      </KnowledgeStep>

      <KnowledgeStep
        n={2}
        title={terms.isService ? terms.Plural : "Products & services"}
        action={
          <Link href="/settings/products" className="text-label font-medium text-primary hover:underline">
            Manage
          </Link>
        }
      >
        <p className="text-label text-on-surface-variant">
          {productCount > 0
            ? `${productCount} ${productCount === 1 ? terms.singular : terms.plural} — names, prices and descriptions are used.`
            : `No ${terms.plural} yet. Add your services and prices so the AI can quote them.`}
        </p>
      </KnowledgeStep>

      <KnowledgeStep n={3} title="Website">
        <WebsitesCard buildCost={buildCost} title="Your website" hideTitle />
      </KnowledgeStep>

      <KnowledgeStep n={4} title="Documents">
        <FilesCard title="Files" hideTitle />
        {/* The single document the old AI Memory page took: the team's AI uses it, customers' bots never do */}
        {data?.documentName && (
          <div className={cn(knowledgeCard, "flex items-center gap-3 px-5 py-3")}>
            <FileCode className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-body text-on-surface">{data.documentName}</span>
            <span title="Used when your team writes with AI; never shown to customers">
              <Badge variant="muted" dot>Team AI only</Badge>
            </span>
            <Button size="sm" variant="ghost" onClick={() => deleteDocMutation.mutate()} disabled={deleteDocMutation.isPending} aria-label={`Remove ${data.documentName}`}>
              <Trash2 className="h-4 w-4 text-error" />
            </Button>
          </div>
        )}
      </KnowledgeStep>

      <KnowledgeStep n={5} title="FAQs">
        <UnansweredCard className={knowledgeCard} />
        <FaqsCard suggestCost={faqCost} className={knowledgeCard} />
      </KnowledgeStep>

      <KnowledgeStep n={6} title="Rules & tone">
        <InstructionsCard
          title="Rules & tone"
          hideTitle
          description="How the AI should write and what it must or mustn't say — used by every AI feature."
        />
      </KnowledgeStep>

      {/* What the AI actually receives, for the curious */}
      <details className={cn(knowledgeCard, "p-5")}>
        <summary className="cursor-pointer text-label font-medium text-on-surface">What the AI sees</summary>
        <div className="mt-3 space-y-3">
          {data?.context ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 font-mono text-label text-on-surface/80">
              {data.context}
            </pre>
          ) : (
            <p className="text-label text-on-surface-variant">Nothing yet. Save your business profile to start.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => rebuildMutation.mutate()} loading={rebuildMutation.isPending} size="sm" variant="secondary">
              <RotateCw className="h-4 w-4" />
              Refresh
            </Button>
            <span className="text-caption text-on-surface-variant">
              Updated {data?.builtAt ? new Date(data.builtAt).toLocaleString() : "never"}. Website pages and files are matched to each request.
            </span>
          </div>
        </div>
      </details>
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
        <CardTitle className="flex items-center gap-2 text-title-sm">
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
              <p className="text-body font-medium text-on-surface">
                WhatsApp Connection
              </p>
              <p className="text-caption text-on-surface-variant/60">
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
              <p className="text-body font-medium text-on-surface">
                Chat Widget
              </p>
              <p className="text-caption text-on-surface-variant/60">
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
              <p className="text-body font-medium text-on-surface">Custom Fields</p>
              <p className="text-caption text-on-surface-variant/60">Define custom fields for contacts, deals, and conversations</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors" />
        </Link>

        {/* API Keys */}
        <Link
          href="/settings?tab=developer-api&section=keys"
          className="flex items-center justify-between p-4 rounded-lg border border-outline-variant/20 bg-surface-container/10 hover:bg-surface-container/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-body font-medium text-on-surface">API Keys</p>
              <p className="text-caption text-on-surface-variant/60">Manage API keys for third-party integrations</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-on-surface-variant/40 group-hover:text-on-surface-variant transition-colors" />
        </Link>

        {/* Message Delay */}
        <div className="space-y-1.5">
          <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
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
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-caption text-on-surface-variant/60">
            Delay between sending messages (500ms - 10,000ms)
          </p>
        </div>

        {/* Retry Limit */}
        <div className="space-y-1.5">
          <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
            Retry Limit
          </label>
          <input
            type="number"
            value={retryLimit}
            onChange={(e) => setRetryLimit(Number(e.target.value))}
            min={0}
            max={10}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-caption text-on-surface-variant/60">
            Max retries for failed message delivery
          </p>
        </div>

        {/* Auto Reconnect */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-body font-medium text-on-surface">
              Auto Reconnect
            </p>
            <p className="text-caption text-on-surface-variant/60">
              Automatically reconnect on session disconnect
            </p>
          </div>
          <button role="switch" aria-checked={autoReconnect} aria-label="Auto reconnect"
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
          <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
            Session Timeout (seconds)
          </label>
          <input
            type="number"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(Number(e.target.value))}
            min={300}
            max={86400}
            step={300}
            className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
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
            <span className="ml-3 text-label text-primary">Saved!</span>
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
  useEffect(() => {
    if (data) {
      setEnabled(data.enabled ?? true);
      setStartHour(data.startHour ?? "09:00");
      setEndHour(data.endHour ?? "18:00");
      setWorkDays(data.workDays ?? [true, true, true, true, true, false, false]);
    }
  }, [data]);

  const toggleDay = (idx: number) => {
    const next = [...workDays];
    next[idx] = !next[idx];
    setWorkDays(next);
  };

  const handleSave = () => {
    // Keep whatever auto-reply values are stored; they're no longer edited here
    updateMutation.mutate({
      enabled,
      startHour,
      endHour,
      workDays,
      autoReplyEnabled: data?.autoReplyEnabled ?? false,
      autoReplyMessage: data?.autoReplyMessage ?? "",
    });
  };

  if (isLoading) return <SectionLoader />;

  return (
    <div className="space-y-6">
      {/* Working Hours */}
      <div>
        <h3 className="text-body-lg font-semibold text-on-surface mb-1">
          Business Hours
        </h3>
        <p className="text-body text-on-surface-variant mb-4">
          Set your team&apos;s availability hours.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant/30 accent-primary"
            />
            <span className="text-body text-on-surface">Enable business hours</span>
          </label>

          {enabled && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-label font-medium text-on-surface-variant">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label font-medium text-on-surface-variant">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-label font-medium text-on-surface-variant mb-2 block">
                  Working Days
                </label>
                <div className="flex gap-2 max-lg:flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-lg text-label font-medium transition-colors ${
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

      {/* The after-hours reply lives with the chatbot (one place, and it actually sends) */}
      <div className="border-t border-outline-variant/15 pt-6">
        <h3 className="text-body-lg font-semibold text-on-surface mb-1">Reply outside hours</h3>
        <p className="text-body text-on-surface-variant">
          The message customers get when nobody is available is set with the chatbot&apos;s opening hours.{" "}
          <Link href="/chatbot/knowledge" className="font-medium text-primary hover:underline">
            Set it in Chatbot → Handover &amp; hours
          </Link>
        </p>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
         
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? "Saving…" : "Save Working Hours"}
        </Button>
        {updateMutation.isSuccess && (
          <span className="text-label text-success flex items-center gap-1">
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
        <CardTitle className="flex items-center gap-2 text-title-sm">
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
                <p className="text-body font-medium text-on-surface">
                  {FLAG_LABELS[key].label}
                </p>
                <p className="text-caption text-on-surface-variant/60">
                  {FLAG_LABELS[key].description}
                </p>
              </div>
              <button role="switch" aria-checked={!!flags[key]} aria-label={FLAG_LABELS[key].label}
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
          <p className="text-label text-primary pt-2">Updated!</p>
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
          setAiPurchaseIntent(r.data?.value === true || r.data?.value === "true");
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
        value: newValue,
        valueType: "boolean",
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
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <Zap className="h-5 w-5" />
          AI Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-body font-medium text-on-surface">
              Auto-Detect Purchase Intent
            </p>
            <p className="text-caption text-on-surface-variant/60">
              AI analyzes incoming messages and auto-creates deals when customers
              show buying intent (e.g., "I want to buy", "send me pricing")
            </p>
          </div>
          <button role="switch" aria-checked={aiPurchaseIntent} aria-label="Auto-detect purchase intent"
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
  WHATSAPP_SESSION_UNSTABLE: { label: "Connection Unstable", description: "WhatsApp keeps failing to reconnect" },
  WHATSAPP_PHONE_INACTIVE: { label: "Phone Inactive", description: "Your phone hasn't been online for days — WhatsApp may unlink" },
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
    <div className="space-y-6">
    <BrowserPushCard />
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-title-sm">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-label text-on-surface-variant/60 mb-4">
          Choose which notifications you receive and how they are delivered.
        </p>
        <table className="w-full">
          <thead>
            <tr className="bg-surface-container/40 border-b border-outline-variant/15">
              <th className="py-2.5 text-left text-label font-medium text-on-surface-variant">
                Notification Type
              </th>
              <th className="py-2.5 text-center text-label font-medium text-on-surface-variant">
                In-App
              </th>
              <th className="py-2.5 text-center text-label font-medium text-on-surface-variant">
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
                    <p className="text-body text-on-surface">{meta.label}</p>
                    <p className="text-caption text-on-surface-variant/50">
                      {meta.description}
                    </p>
                  </td>
                  <td className="py-3 text-center">
                    <button role="switch" aria-checked={getInApp(type)} aria-label={`${meta.label}: in-app notifications`}
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
                    <button role="switch" aria-checked={getEmail(type)} aria-label={`${meta.label}: email notifications`}
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
    </div>
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newHeaders, setNewHeaders] = useState<{ key: string; value: string }[]>([]);
  const [newMaxRetries, setNewMaxRetries] = useState(3);
  const [newTimeoutSec, setNewTimeoutSec] = useState(10);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; url: string } | null>(null);

  const handleCreate = () => {
    if (!newUrl || newEvents.length === 0) return;
    const headers = Object.fromEntries(
      newHeaders.filter((h) => h.key.trim()).map((h) => [h.key.trim(), h.value]),
    );
    createMutation.mutate(
      {
        url: newUrl,
        events: newEvents as (typeof WEBHOOK_EVENT_TYPES)[number][],
        description: newDescription || undefined,
        headers: Object.keys(headers).length ? headers : undefined,
        maxRetries: newMaxRetries,
        timeoutMs: newTimeoutSec * 1000,
      },
      {
        onSuccess: () => {
          setShowForm(false);
          setNewUrl("");
          setNewDescription("");
          setNewEvents([]);
          setShowAdvanced(false);
          setNewHeaders([]);
          setNewMaxRetries(3);
          setNewTimeoutSec(10);
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
            <CardTitle className="flex items-center gap-2 text-title-sm">
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
              <p className="text-body text-on-surface-variant">
                No webhooks configured
              </p>
              <p className="text-caption text-on-surface-variant/60 mt-1">
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
                  onDelete={() => setPendingDelete({ id: wh.id, url: wh.url })}
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
              <CardTitle className="text-title-sm">New Webhook</CardTitle>
              <button aria-label="Close" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4 text-on-surface-variant" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
                Endpoint URL
              </label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
                Description (optional)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Production event forwarder"
                className="w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
                Events
              </label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <button
                    key={event}
                    onClick={() => toggleEvent(event)}
                    className={`px-2.5 py-1 rounded-lg text-label font-medium border transition-colors ${
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

            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1 text-label font-medium text-primary hover:underline"
              >
                {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Advanced: headers, retries, timeout
              </button>
              {showAdvanced && (
                <div className="mt-3 space-y-4 rounded-lg border border-outline-variant/20 p-3">
                  <div className="space-y-1.5">
                    <p className="text-label font-medium text-on-surface-variant">Custom headers</p>
                    <p className="text-caption text-on-surface-variant">Sent with every delivery, e.g. an Authorization header your endpoint expects.</p>
                    {newHeaders.map((h, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          aria-label="Header name"
                          value={h.key}
                          onChange={(e) => setNewHeaders((prev) => prev.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                          placeholder="Header name"
                          className="flex-1 h-9 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body text-on-surface font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          aria-label="Header value"
                          value={h.value}
                          onChange={(e) => setNewHeaders((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                          placeholder="Value"
                          className="flex-1 h-9 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body text-on-surface font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          aria-label="Remove header"
                          onClick={() => setNewHeaders((prev) => prev.filter((_, j) => j !== i))}
                          className="px-2 text-on-surface-variant hover:text-error"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setNewHeaders((prev) => [...prev, { key: "", value: "" }])}
                      className="flex items-center gap-1 text-label text-primary hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add header
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="wh-retries" className="text-label font-medium text-on-surface-variant">Retries on failure</label>
                      <input
                        id="wh-retries"
                        type="number"
                        min={0}
                        max={10}
                        value={newMaxRetries}
                        onChange={(e) => setNewMaxRetries(Math.min(10, Math.max(0, Number(e.target.value) || 0)))}
                        className="w-full h-9 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-caption text-on-surface-variant">0 to 10, with growing waits between tries.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="wh-timeout" className="text-label font-medium text-on-surface-variant">Timeout (seconds)</label>
                      <input
                        id="wh-timeout"
                        type="number"
                        min={1}
                        max={30}
                        value={newTimeoutSec}
                        onChange={(e) => setNewTimeoutSec(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                        className="w-full h-9 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <p className="text-caption text-on-surface-variant">1 to 30. Slower responses count as failed.</p>
                    </div>
                  </div>
                </div>
              )}
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

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete webhook"
        message={`Events will stop being sent to ${pendingDelete?.url ?? "this URL"}. You can't undo this.`}
        confirmLabel="Delete webhook"
        variant="danger"
        loading={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteMutation.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
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
            <p className="text-body text-on-surface font-mono truncate">
              {webhook.url}
            </p>
            {isAutoDisabled && (
              <Badge variant="error" className="shrink-0 font-medium">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Auto-disabled
              </Badge>
            )}
          </div>
          {webhook.description && (
            <p className="text-caption text-on-surface-variant/60 mt-0.5">
              {webhook.description}
            </p>
          )}
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {webhook.events.map((ev) => (
              <span
                key={ev}
                className="text-caption px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant"
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
          <button aria-expanded={expanded} aria-label={expanded ? "Collapse" : "Expand"} onClick={onToggleExpand}>
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
            aria-label="Delete webhook"
            className="text-error hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Test result feedback */}
      {testMutation.isSuccess && (
        <div className="px-4 pb-2">
          <p className="text-caption text-primary">
            Test delivery queued (ID: {testMutation.data.deliveryId})
          </p>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-outline-variant/10 px-4 py-3 space-y-4">
          {/* Signing Secret */}
          <div className="space-y-1.5">
            <label className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
              Signing Secret
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-label font-mono bg-surface-container-lowest border border-outline-variant/20 rounded px-3 py-2 text-on-surface">
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
          <div className="grid grid-cols-3 gap-4 text-label">
            <div>
              <p className="text-on-surface-variant/60 uppercase tracking-wider text-caption">
                Max Retries
              </p>
              <p className="text-on-surface font-medium">{webhook.maxRetries}</p>
            </div>
            <div>
              <p className="text-on-surface-variant/60 uppercase tracking-wider text-caption">
                Timeout
              </p>
              <p className="text-on-surface font-medium">
                {webhook.timeoutMs}ms
              </p>
            </div>
            <div>
              <p className="text-on-surface-variant/60 uppercase tracking-wider text-caption">
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
        <p className="text-caption text-on-surface-variant/60">
          No deliveries yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-label font-medium text-on-surface-variant uppercase tracking-wider">
        Recent Deliveries
      </p>
      <DataTable
        label="Webhook deliveries"
        columns={deliveryColumns}
        rows={deliveries}
        rowKey={(d) => d.id}
        rowLabel={(d) => `${d.eventType} delivery`}
        pagination={{
          page: deliveryPage - 1,
          pageSize: PAGE_SIZE,
          total: data?.total ?? 0,
          onPageChange: (p) => setDeliveryPage(p + 1),
        }}
      />
    </div>
  );
}

const DELIVERY_STATUS: Record<
  WebhookDeliveryStatus,
  { label: string; variant: "success" | "error" | "warning" | "muted" }
> = {
  SUCCESS: { label: "Success", variant: "success" },
  FAILED: { label: "Failed", variant: "error" },
  RETRYING: { label: "Retrying", variant: "warning" },
  PENDING: { label: "Pending", variant: "muted" },
};

const deliveryColumns: DataTableColumn<WebhookDelivery>[] = [
  {
    id: "status",
    header: "Status",
    skeleton: "badge",
    cell: (d) => {
      const m = DELIVERY_STATUS[d.status] ?? { label: d.status, variant: "muted" as const };
      return <Badge variant={m.variant} dot>{m.label}</Badge>;
    },
  },
  {
    id: "event",
    header: "Event",
    cellClassName: "font-mono text-label text-on-surface-variant whitespace-nowrap",
    cell: (d) => d.eventType,
  },
  {
    id: "http",
    header: "HTTP",
    skeleton: "short",
    cellClassName: "text-label tabular-nums",
    cell: (d) =>
      d.httpStatus ? (
        <span className={d.httpStatus >= 200 && d.httpStatus < 300 ? "text-success" : "text-error"}>
          {d.httpStatus}
        </span>
      ) : (
        "—"
      ),
  },
  {
    id: "duration",
    header: "Duration",
    skeleton: "short",
    cellClassName: "text-label tabular-nums text-on-surface-variant whitespace-nowrap",
    cell: (d) => (d.duration !== null ? `${d.duration} ms` : "—"),
  },
  {
    id: "error",
    header: "Error",
    cellClassName: "text-label text-error/70 max-w-[240px] truncate",
    cell: (d) => d.error || "—",
  },
  {
    id: "time",
    header: "Time",
    skeleton: "short",
    cellClassName: "text-label text-on-surface-variant whitespace-nowrap",
    cell: (d) => new Date(d.createdAt).toLocaleString(),
  },
];

// ─── Developer API Section ──────────────────────

type ApiEndpoint = [method: string, path: string, desc: string, scopes: string];

const API_ENDPOINTS: ApiEndpoint[] = [
  ["POST", "/developer/messages/send", "Send a text, media or interactive message", "write, messages"],
  ["POST", "/developer/messages/send-bulk", "Send one message to up to 100 numbers", "write, messages"],
  ["POST", "/developer/messages/send-template", "Send a saved template with variables", "write, messages"],
  ["GET", "/developer/messages", "List messages (cursor pagination)", "read, messages"],
  ["GET", "/developer/messages/:id", "Get a message and its status events", "read, messages"],
  ["GET", "/developer/templates", "List templates", "read, messages"],
  ["POST", "/developer/templates", "Create or update a template", "write, messages"],
  ["GET", "/developer/contacts", "List contacts (cursor pagination)", "read, contacts"],
  ["POST", "/developer/contacts", "Create a contact (returns existing one if the phone exists)", "write, contacts"],
  ["GET", "/developer/contacts/:id", "Get a contact", "read, contacts"],
  ["PUT", "/developer/contacts/:id", "Update name, email or metadata", "write, contacts"],
  ["GET", "/developer/session/status", "Check the WhatsApp connection", "read"],
];

const apiEndpointColumns: DataTableColumn<ApiEndpoint>[] = [
  {
    id: "method",
    header: "Method",
    cellClassName: "font-mono text-label",
    cell: ([method]) => (
      <span className={`px-1.5 py-0.5 rounded text-caption font-semibold ${
        method === "POST" ? "bg-primary/10 text-primary" :
        method === "DELETE" ? "bg-error/10 text-error" :
        method === "PUT" ? "bg-warning/10 text-warning" :
        "bg-surface-container text-on-surface"
      }`}>
        {method}
      </span>
    ),
  },
  {
    id: "endpoint",
    header: "Endpoint",
    cellClassName: "font-mono text-label text-on-surface",
    cell: ([, path]) => `/api/v1${path}`,
  },
  {
    id: "description",
    header: "Description",
    cellClassName: "text-label text-on-surface-variant font-sans",
    cell: ([, , desc]) => desc,
  },
  {
    id: "scopes",
    header: "Scopes",
    cellClassName: "font-mono text-label text-on-surface-variant whitespace-nowrap",
    cell: ([, , , scopes]) => scopes,
  },
];

const apiLogColumns: DataTableColumn<DeveloperApiRequestLog>[] = [
  {
    id: "time",
    header: "Time",
    cellClassName: "align-top text-on-surface-variant text-label whitespace-nowrap",
    cell: (log) => new Date(log.createdAt).toLocaleString(),
  },
  {
    id: "request",
    header: "Request",
    cellClassName: "align-top",
    cell: (log) => (
      <>
        <span className="font-mono text-label">
          <span className="font-semibold">{log.method}</span>{" "}
          {log.path.replace(/^\/api\/v1/, "")}
        </span>
        {log.errorMessage && (
          <p className="text-caption text-error mt-0.5 max-w-[360px]">{log.errorMessage}</p>
        )}
      </>
    ),
  },
  {
    id: "status",
    header: "Status",
    skeleton: "badge",
    cellClassName: "align-top",
    cell: (log) => (
      <span className={`px-1.5 py-0.5 rounded text-caption font-medium font-mono ${
        log.statusCode < 300 ? "bg-success/10 text-success" :
        log.statusCode < 500 ? "bg-warning/10 text-warning" :
        "bg-error/10 text-error"
      }`}>
        {log.statusCode}
      </span>
    ),
  },
  {
    id: "duration",
    header: "Duration",
    skeleton: "short",
    cellClassName: "align-top text-on-surface-variant text-label tabular-nums",
    cell: (log) => `${log.durationMs} ms`,
  },
  {
    id: "key",
    header: "Key",
    cellClassName: "align-top text-on-surface-variant text-label",
    cell: (log) => (
      <>
        {log.apiKeyName ?? "Deleted key"}
        {log.apiKeyPrefix && <span className="font-mono text-caption block">{log.apiKeyPrefix}…</span>}
      </>
    ),
  },
];

function DeveloperApiSection() {
  const { data: stats, isLoading: statsLoading } = useDeveloperDashboard();
  const { data: keys, isLoading: keysLoading } = useApiKeys();
  const { data: logs } = useDeveloperLogs(50);
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const rotateKey = useRotateApiKey();

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["read", "write", "messages", "contacts"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState<DeveloperApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  // ?section=keys|docs|logs opens a sub-tab directly (e.g. from the old /settings/api-keys URL)
  const sectionParam = useSearchParams().get("section");
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "keys" | "docs" | "logs">(
    sectionParam === "keys" || sectionParam === "docs" || sectionParam === "logs" ? sectionParam : "overview",
  );
  const [keyConfirm, setKeyConfirm] = useState<{ type: "rotate" | "revoke"; id: string; name: string } | null>(null);

  const rotatePending = rotateKey.isPending;
  const revokePending = revokeKey.isPending;
  const apiKeyColumns = useMemo<DataTableColumn<DeveloperApiKey>[]>(
    () => [
      { id: "name", header: "Name", cellClassName: "font-medium text-on-surface", cell: (key) => key.name },
      {
        id: "key",
        header: "Key",
        cell: (key) => (
          <code className="text-label bg-surface-container px-2 py-0.5 rounded font-mono">
            {key.keyPrefix}...
          </code>
        ),
      },
      {
        id: "scopes",
        header: "Scopes",
        skeleton: "badge",
        cell: (key) => (
          <div className="flex flex-wrap gap-1">
            {key.scopes.map((s) => (
              <span key={s} className="px-1.5 py-0.5 bg-surface-container rounded text-caption">{s}</span>
            ))}
          </div>
        ),
      },
      {
        id: "status",
        header: "Status",
        skeleton: "badge",
        cell: (key) =>
          key.isActive ? (
            <Badge variant="success" dot>Active</Badge>
          ) : (
            <Badge variant="error" dot>Revoked</Badge>
          ),
      },
      {
        id: "lastUsed",
        header: "Last Used",
        skeleton: "short",
        cellClassName: "text-on-surface-variant",
        cell: (key) => (key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"),
      },
      {
        id: "expires",
        header: "Expires",
        skeleton: "short",
        cellClassName: "text-on-surface-variant",
        cell: (key) =>
          !key.expiresAt ? (
            "Never"
          ) : new Date(key.expiresAt) < new Date() ? (
            <span className="text-error">Expired</span>
          ) : (
            new Date(key.expiresAt).toLocaleDateString()
          ),
      },
      {
        id: "actions",
        header: "Actions",
        skeleton: "none",
        cell: (key) =>
          key.isActive && (
            <div className="flex gap-1">
              <button
                onClick={() => setKeyConfirm({ type: "rotate", id: key.id, name: key.name })}
                disabled={rotatePending}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-caption text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors disabled:opacity-40"
              >
                <RotateCw className="h-3 w-3" />
                Rotate
              </button>
              <button
                onClick={() => setKeyConfirm({ type: "revoke", id: key.id, name: key.name })}
                disabled={revokePending}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-caption text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
                Revoke
              </button>
            </div>
          ),
      },
    ],
    [rotatePending, revokePending],
  );

  const AVAILABLE_SCOPES = ["read", "write", "messages", "contacts"];

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
      <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit mobile-scroll-x max-lg:w-full">
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
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-body font-medium transition-colors max-lg:flex-1 max-lg:justify-center max-sm:px-2 max-sm:py-2 ${
              activeSubTab === tab.id
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <tab.icon className="h-4 w-4 max-sm:hidden" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-sm:grid-cols-2 max-sm:gap-3">
                <Card>
                  <CardContent className="pt-5 max-lg:mt-0 max-lg:pt-0">
                    <p className="text-label font-medium text-on-surface-variant uppercase tracking-wide">Messages Used</p>
                    <p className="text-headline font-semibold text-on-surface mt-1">
                      {(stats.messagesUsed ?? 0).toLocaleString()}
                      <span className="text-body font-normal text-on-surface-variant">
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
                  <CardContent className="pt-5 max-lg:mt-0 max-lg:pt-0">
                    <p className="text-label font-medium text-on-surface-variant uppercase tracking-wide">Active Sessions</p>
                    <p className="text-headline font-semibold text-on-surface mt-1">{stats.activeSessions}</p>
                    <p className="text-label text-on-surface-variant mt-1">WhatsApp connected</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 max-lg:mt-0 max-lg:pt-0">
                    <p className="text-label font-medium text-on-surface-variant uppercase tracking-wide">API Keys</p>
                    <p className="text-headline font-semibold text-on-surface mt-1">{stats.activeApiKeys}</p>
                    <p className="text-label text-on-surface-variant mt-1">Active keys</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 max-lg:mt-0 max-lg:pt-0">
                    <p className="text-label font-medium text-on-surface-variant uppercase tracking-wide">Contacts</p>
                    <p className="text-headline font-semibold text-on-surface mt-1">{(stats.totalContacts ?? 0).toLocaleString()}</p>
                    <p className="text-label text-on-surface-variant mt-1">Total contacts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-body-lg">Quick Actions</CardTitle>
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
                    <p className="text-body font-semibold text-on-surface flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      New API Key — Copy it now, it will never be shown again!
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-body bg-surface-container px-3 py-1.5 rounded-lg font-mono break-all">
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
                  <IconButton size="xs" onClick={() => setCreatedKey(null)} aria-label="Close">
                    <X className="h-4 w-4" />
                  </IconButton>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Key Form */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-body-lg">API Keys</CardTitle>
              <Button size="sm" onClick={() => setShowCreateKey(!showCreateKey)}>
                <Plus className="h-4 w-4 mr-1" />
                New API Key
              </Button>
            </CardHeader>
            <CardContent>
              {showCreateKey && (
                <div className="mb-6 p-4 border border-outline-variant/20 rounded-xl space-y-4">
                  <div>
                    <label className="text-label font-medium text-on-surface-variant">Key Name</label>
                    <input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g., Production API Key"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant/30 bg-surface text-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-label font-medium text-on-surface-variant">Scopes</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <button
                          key={scope}
                          onClick={() =>
                            setNewKeyScopes((prev) =>
                              prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
                            )
                          }
                          className={`px-3 py-1 rounded-full text-label font-medium border transition-colors ${
                            newKeyScopes.includes(scope)
                              ? "bg-primary text-on-primary border-primary"
                              : "border-outline-variant/30 text-on-surface-variant hover:border-primary/50"
                          }`}
                        >
                          {scope}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1 text-caption text-on-surface-variant">
                      read: GET requests. write: create, send and update. messages / contacts: which data the key can reach.
                    </p>
                  </div>
                  <div>
                    <label className="text-label font-medium text-on-surface-variant">Expires In (days, optional)</label>
                    <input
                      value={newKeyExpiry}
                      onChange={(e) => setNewKeyExpiry(e.target.value)}
                      type="number"
                      placeholder="Leave empty for no expiry"
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-outline-variant/30 bg-surface text-body text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              <DataTable
                label="API keys"
                columns={apiKeyColumns}
                rows={keys ?? []}
                rowKey={(key) => key.id}
                rowLabel={(key) => key.name}
                loading={keysLoading}
                skeletonRows={3}
                empty={{
                  icon: <Key className="h-10 w-10" />,
                  title: "No API keys yet",
                  description: "Create one to get started.",
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Quick Start / Docs ── */}
      {activeSubTab === "docs" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-body-lg">Quick Start Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div>
                <h4 className="text-body font-semibold text-on-surface mb-2">1. Get your API Key</h4>
                <p className="text-body text-on-surface-variant mb-2">
                  Go to the &quot;API Keys&quot; tab above and create a new key. Copy it immediately — it&apos;s shown only once.
                </p>
              </div>

              {/* Step 2 */}
              <div>
                <h4 className="text-body font-semibold text-on-surface mb-2">2. Connect WhatsApp</h4>
                <p className="text-body text-on-surface-variant mb-2">
                  Go to Settings → WhatsApp and scan the QR code with your phone. Your session must be connected before sending messages.
                </p>
              </div>

              {/* Step 3 — Send a Message */}
              <div>
                <h4 className="text-body font-semibold text-on-surface mb-2">3. Send a Message</h4>

                {/* cURL */}
                <p className="text-label font-medium text-on-surface-variant mb-1">cURL</p>
                <pre className="bg-surface-container rounded-xl p-4 text-label font-mono text-on-surface overflow-x-auto whitespace-pre">
{`curl -X POST \\
  ${publicApiBase()}/developer/messages/send \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "to": "+919876543210",
    "type": "text",
    "body": "Hello from Wazelo CRM API!"
  }'`}
                </pre>

                {/* Node.js */}
                <p className="text-label font-medium text-on-surface-variant mt-4 mb-1">Node.js (axios)</p>
                <pre className="bg-surface-container rounded-xl p-4 text-label font-mono text-on-surface overflow-x-auto whitespace-pre">
{`const axios = require("axios");

const res = await axios.post(
  "${publicApiBase()}/developer/messages/send",
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
// {
//   success: true,
//   data: {
//     message: { id: "...", to: "+91...", type: "text", status: "QUEUED", createdAt: "..." },
//     deduplicated: false
//   },
//   timestamp: "..."
// }`}
                </pre>

                {/* Python */}
                <p className="text-label font-medium text-on-surface-variant mt-4 mb-1">Python (requests)</p>
                <pre className="bg-surface-container rounded-xl p-4 text-label font-mono text-on-surface overflow-x-auto whitespace-pre">
{`import requests

res = requests.post(
    "${publicApiBase()}/developer/messages/send",
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
                <h4 className="text-body font-semibold text-on-surface mb-2">4. Receive Messages (Webhooks)</h4>
                <p className="text-body text-on-surface-variant mb-2">
                  Open the <strong>Webhooks</strong> tab in Settings, add your URL and tick the{" "}
                  <code className="bg-surface-container px-1 rounded text-label">MESSAGE_RECEIVED</code> event.
                  We POST this to your URL for every incoming message, with the message text and any media link.
                </p>
                <pre className="bg-surface-container rounded-xl p-4 text-label font-mono text-on-surface overflow-x-auto whitespace-pre">
{`{
  "event": "MESSAGE_RECEIVED",
  "data": {
    "messageId": "uuid",
    "sessionId": "uuid",
    "contactPhone": "+919876543210",
    "type": "TEXT",
    "conversationId": "uuid",
    "body": "Hi, I need help!",
    "mediaUrl": null,
    "mediaMimeType": null
  },
  "timestamp": "2026-04-03T10:30:00.000Z"
}`}
                </pre>
              </div>

              {/* Step 5 — Verify signatures */}
              <div>
                <h4 className="text-body font-semibold text-on-surface mb-2">5. Verify the webhook signature</h4>
                <p className="text-body text-on-surface-variant mb-2">
                  Each request has <code className="bg-surface-container px-1 rounded text-label">X-Webhook-Signature</code> and{" "}
                  <code className="bg-surface-container px-1 rounded text-label">X-Webhook-Timestamp</code> headers. The signature is an
                  HMAC-SHA256 of <code className="bg-surface-container px-1 rounded text-label">timestamp.rawBody</code> using your webhook&apos;s signing secret.
                </p>
                <pre className="bg-surface-container rounded-xl p-4 text-label font-mono text-on-surface overflow-x-auto whitespace-pre">
{`// Node.js (Express): use the raw body, not the parsed JSON
const crypto = require("crypto");

app.post("/wazelo-webhook", express.raw({ type: "application/json" }), (req, res) => {
  const timestamp = req.header("X-Webhook-Timestamp");
  const expected = crypto
    .createHmac("sha256", process.env.WAZELO_WEBHOOK_SECRET)
    .update(\`\${timestamp}.\${req.body}\`)
    .digest("hex");
  const given = req.header("X-Webhook-Signature") ?? "";

  if (given.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return res.sendStatus(401);
  }
  // Reject old requests to stop replays
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return res.sendStatus(401);

  const event = JSON.parse(req.body);
  console.log(event.event, event.data);
  res.sendStatus(200);
});`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Try it */}
          <Card>
            <CardHeader>
              <CardTitle className="text-body-lg">Try it</CardTitle>
              <p className="text-label text-on-surface-variant">Call the API with one of your keys and see the real response.</p>
            </CardHeader>
            <CardContent>
              <ApiTryIt />
            </CardContent>
          </Card>

          {/* API Reference */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-body-lg">API Reference</CardTitle>
              <a
                href={`${publicApiBase()}/developer/openapi.json`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-label font-medium text-primary hover:underline"
              >
                OpenAPI spec (for Postman / Insomnia)
              </a>
            </CardHeader>
            <CardContent>
              <DataTable
                label="API endpoints"
                columns={apiEndpointColumns}
                rows={API_ENDPOINTS}
                rowKey={([method, path]) => `${method}-${path}`}
                rowLabel={([method, path]) => `${method} ${path}`}
              />
              <div className="mt-4 space-y-1 text-label text-on-surface-variant">
                <p>
                  Send your key in the <code className="bg-surface-container px-1 rounded">X-API-Key</code> header.
                  A key needs <code className="bg-surface-container px-1 rounded">read</code> for GET requests,{" "}
                  <code className="bg-surface-container px-1 rounded">write</code> for everything else, plus the resource scope shown.
                  Missing scopes return 403.
                </p>
                <p>
                  Successful responses are wrapped as <code className="bg-surface-container px-1 rounded">{"{ success, data, timestamp }"}</code>.
                  Errors return <code className="bg-surface-container px-1 rounded">{"{ statusCode, message, error }"}</code>.
                  Send an <code className="bg-surface-container px-1 rounded">Idempotency-Key</code> header (or <code className="bg-surface-container px-1 rounded">idempotencyKey</code> in the body) on send and send-template so a retried request doesn't send twice.
                </p>
                <p>
                  Each key can make 60 requests per minute. Check the{" "}
                  <code className="bg-surface-container px-1 rounded">X-RateLimit-Remaining</code> response header; a 429 means wait for{" "}
                  <code className="bg-surface-container px-1 rounded">Retry-After</code> seconds.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Message Types */}
          <Card>
            <CardHeader>
              <CardTitle className="text-body-lg">Supported Message Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-body font-semibold text-on-surface">Text Message</p>
                  <pre className="mt-1 bg-surface-container rounded-xl p-3 text-label font-mono text-on-surface overflow-x-auto">
{`{ "to": "+91...", "type": "text", "body": "Hello!" }`}
                  </pre>
                </div>
                <div>
                  <p className="text-body font-semibold text-on-surface">Image Message</p>
                  <pre className="mt-1 bg-surface-container rounded-xl p-3 text-label font-mono text-on-surface overflow-x-auto">
{`{ "to": "+91...", "type": "image", "mediaUrl": "https://...", "caption": "Check this out" }`}
                  </pre>
                </div>
                <div>
                  <p className="text-body font-semibold text-on-surface">Interactive Buttons</p>
                  <pre className="mt-1 bg-surface-container rounded-xl p-3 text-label font-mono text-on-surface overflow-x-auto">
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
            <CardTitle className="text-body-lg">Recent API requests</CardTitle>
            <p className="text-label text-on-surface-variant">Last 50 requests made with your API keys. Kept for 30 days.</p>
          </CardHeader>
          <CardContent>
            <DataTable
              label="API requests"
              columns={apiLogColumns}
              rows={logs?.data ?? []}
              rowKey={(log) => log.id}
              rowLabel={(log) => `${log.method} ${log.path}`}
              empty={{
                icon: <Activity className="h-10 w-10" />,
                title: "No API requests yet",
                description: "Requests made with your API keys show up here.",
              }}
            />
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
          <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            SLA Policies
          </h2>
          <p className="text-body text-on-surface-variant mt-0.5">
            Set response time targets. Agents get warned before breach.
          </p>
        </div>
        {!showForm && !editPolicy && (
          <Button
            onClick={() => setShowForm(true)}
           
          >
            <Plus className="h-4 w-4" />
            New Policy
          </Button>
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
          <p className="text-label text-on-surface-variant">
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
  // A relative API URL (/api/v1, proxied by next.config rewrites) leaves "" here: use this site's origin
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || window.location.origin;
  const url = `${baseUrl}/api/v1/webhooks/shopify/${orgId}`;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl bg-surface-container border border-outline-variant/10 p-4 space-y-2">
      <p className="text-label font-semibold text-on-surface-variant uppercase tracking-wider">
        Your Shopify Webhook URL
      </p>
      <p className="text-caption text-on-surface-variant/60 leading-relaxed">
        Register this URL in Shopify Admin → Settings → Notifications → Webhooks.
        Subscribe to: <span className="font-mono text-primary">orders/create</span>,{" "}
        <span className="font-mono text-primary">orders/fulfilled</span>,{" "}
        <span className="font-mono text-primary">checkouts/create</span>.
      </p>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/10">
        <code className="flex-1 text-caption font-mono text-on-surface truncate">{url}</code>
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

  const inputCls = "w-full px-3 py-2.5 rounded-lg bg-surface-container border border-outline-variant/15 text-body text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-label font-medium text-on-surface-variant">Shop Domain {!isEditing && <span className="text-error">*</span>}</label>
        <input type="text" value={shopDomain} onChange={(e) => setShopDomain(e.target.value)} required={!isEditing} placeholder="mystore.myshopify.com" className={inputCls} />
        {isEditing && <p className="text-caption text-on-surface-variant/50">Currently connected. Leave blank to keep existing domain.</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-label font-medium text-on-surface-variant">Admin API Access Token {!isEditing && <span className="text-error">*</span>}</label>
        <div className="relative">
          <input type={showToken ? "text" : "password"} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} required={!isEditing} placeholder={isEditing ? "Leave blank to keep existing" : "shpat_xxxxxxxxxxxx"} className={`${inputCls} pr-10`} />
          <button aria-label={showToken ? "Hide token" : "Show token"} type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-caption text-on-surface-variant/50">Shopify Admin → Apps → Develop apps → Admin API access token. Requires: <code className="text-primary">read_orders</code>, <code className="text-primary">read_customers</code>.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-label font-medium text-on-surface-variant">Webhook Signing Secret {!isEditing && <span className="text-error">*</span>}</label>
        <div className="relative">
          <input type={showSecret ? "text" : "password"} value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} required={!isEditing} placeholder={isEditing ? "Leave blank to keep existing" : "Your webhook signing secret"} className={`${inputCls} pr-10`} />
          <button aria-label={showSecret ? "Hide secret" : "Show secret"} type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors">
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-caption text-on-surface-variant/50">Shopify Admin → Settings → Notifications → Webhooks → Signing secret.</p>
      </div>
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-error/10 border border-error/20">
          <AlertCircle className="h-4 w-4 text-error shrink-0" />
          <p className="text-label text-error">{error}</p>
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

  const statusVariant =
    shopifyIntegration?.status === "ACTIVE" ? "success" :
    shopifyIntegration?.status === "ERROR"  ? "error" :
    "muted";

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-title-sm font-semibold text-on-surface flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-success" />
          Shopify Integration
        </h2>
        <p className="text-body text-on-surface-variant mt-0.5">
          Sync orders, customers, and abandoned carts with your CRM
        </p>
      </div>

      {/* What you get — shown when not yet connected */}
      {!shopifyIntegration && (
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-4 space-y-3">
          <p className="text-body font-semibold text-on-surface">What this integration does</p>
          <div className="space-y-2.5">
            {SHOPIFY_EVENTS.map((ev) => {
              const Icon = ev.icon;
              return (
                <div key={ev.label} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-on-surface">{ev.label}</p>
                    <p className="text-label text-on-surface-variant/60 mt-0.5">{ev.desc}</p>
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
            <div className="h-9 w-9 rounded-xl bg-success-container flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1">
              <p className="text-body-lg font-semibold text-on-surface">{shopifyIntegration.displayName}</p>
              <p className="text-caption text-on-surface-variant/60">Connected · {new Date(shopifyIntegration.updatedAt).toLocaleDateString()}</p>
            </div>
            <Badge variant={statusVariant} dot>
              {shopifyIntegration.status.charAt(0) + shopifyIntegration.status.slice(1).toLowerCase().replace(/_/g, " ")}
            </Badge>
          </div>
          <div className="px-4 py-3 space-y-2.5 border-b border-outline-variant/8">
            <p className="text-caption font-semibold text-on-surface-variant/60 uppercase tracking-wider">Listening For</p>
            {SHOPIFY_EVENTS.map((ev) => {
              const Icon = ev.icon;
              return (
                <div key={ev.label} className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-label font-medium text-on-surface">{ev.label}</p>
                    <p className="text-caption text-on-surface-variant/60">{ev.desc}</p>
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
                <p className="text-caption text-error">{shopifyIntegration.lastError}</p>
              </div>
            </div>
          )}
          {testResult && (
            <div className="px-4 py-2 border-b border-outline-variant/8">
              <div className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${testResult.success ? "bg-success-container border border-success/30" : "bg-error/8 border border-error/15"}`}>
                {testResult.success
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  : <AlertCircle className="h-3.5 w-3.5 text-error shrink-0" />
                }
                <p className={`text-caption ${testResult.success ? "text-success" : "text-error"}`}>
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
              className="ml-auto inline-flex items-center gap-1.5 text-label text-on-surface-variant hover:text-primary transition-colors"
            >
              Open Shopify Admin
              <ExternalLink className="h-3 w-3" />
            </a>
            <IconButton size="xs" variant="danger"
              onClick={handleDelete}
              disabled={deleteIntegration.isPending}
             
              title="Disconnect Shopify" aria-label="Disconnect Shopify">
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>
      )}

      {/* Setup / Edit form */}
      {(!shopifyIntegration || editing) && (showForm || editing) && (
        <div className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest p-5">
          <h3 className="text-body-lg font-semibold text-on-surface mb-4">
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
        <p className="text-label font-semibold text-on-surface-variant/60 uppercase tracking-wider">Setup Guide</p>
        <ol className="space-y-2 text-label text-on-surface-variant leading-relaxed list-decimal list-inside">
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
