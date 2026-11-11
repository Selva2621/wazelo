"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X, FileText, Search, ExternalLink,
  Megaphone, MessageSquare, Users, Clock, Wifi,
  Package, Smartphone, Mail,
} from "lucide-react";
import { useEmailAccount, useEmailTemplates } from "@/hooks/use-email";
import { EMAIL_FIELDS } from "@/lib/email-render";
import { EmailPreview } from "@/components/email/email-preview";
import {
  ChannelSwitch, EmailConnectNotice, FieldChips, insertAtCursor, isEmailReady, type Channel,
} from "@/components/campaigns/email-channel";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import type { EmailAccount, EmailTemplate } from "@/lib/api/email";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useCreateCampaign, useExecuteCampaign, usePreviewAudience } from "@/hooks/use-campaigns";
import { ProductSelectField } from "@/components/ui/product-select-field";
import { useProductTerms } from "@/lib/product-terms";
import {
  createCampaignSchema,
  type CreateCampaignFormData,
  type CreateCampaignFormInput,
} from "@/lib/validations/campaigns";
import type { MessageType, CampaignAudienceType } from "@/lib/types/campaigns";
import { useTemplates } from "@/hooks/use-templates";
import { useCloudTemplates } from "@/hooks/use-cloud-numbers";
import { CloudTemplateFields } from "@/components/whatsapp/cloud-template-fields";
import type { CloudTemplateChoice } from "@/lib/api/whatsapp";
import {
  useCreateSavedContactGroups,
  useCheckSavedGroupMove,
  useOrgTags,
  useSavedContactGroups,
} from "@/hooks/use-contacts";
import { useProducts } from "@/hooks/use-products";
import { useScrapeRuns } from "@/hooks/use-lead-scraper";
import { templateImageUrl, type MessageTemplate } from "@/lib/types/templates";
import { IconButton } from "@/components/ui/icon-button";
import { CampaignCapacityNotice } from "@/components/whatsapp/account-health";
import { WhatsAppPhonePreview } from "@/components/whatsapp/whatsapp-phone-preview";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { groupNamesSummary } from "@/components/contacts/saved-group-actions";
import type { SavedGroupMoveImpact } from "@/lib/types/contacts";
import { MediaPicker, mediaKindFor } from "@/components/ui/media-picker";
import { SCRAPE_SOURCE_LABELS } from "@/lib/constants/contact-sources";
import { AudiencePicker } from "@/components/campaigns/audience-picker";

const SOURCE_LABELS: Record<string, string> = SCRAPE_SOURCE_LABELS;

/** Templates shown in the picker per scroll step */
const TEMPLATE_PAGE_SIZE = 10;

const MSG_TYPES: { value: MessageType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "Document" },
  { value: "AUDIO", label: "Audio" },
];

/** Placeholders the backend fills per contact; anything else must be filled in here */
const CONTACT_PLACEHOLDERS = new Set([
  "name", "phone", "email", "leadStatus",
  "contact.name", "contact.phone", "contact.email", "contact.leadStatus",
]);

/** Fields the backend fills per contact in an email */
const EMAIL_PLACEHOLDERS = new Set([...EMAIL_FIELDS.map((f) => f.key), "first_name"]);

function customPlaceholders(body: string, known: Set<string> = CONTACT_PLACEHOLDERS): string[] {
  const keys = Array.from(body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g), (m) => m[1]);
  return [...new Set(keys.filter((k) => !known.has(k)))];
}

function fillPlaceholders(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) =>
    values[key]?.trim() ? values[key].trim() : match,
  );
}

function extractTemplateBody(template: MessageTemplate): string {
  return template.components.find((c) => c.type === "BODY")?.text ?? "";
}

/** Backend CAMPAIGN_BATCH_SIZE; the audience preview returns the live value */
const DEFAULT_BATCH_SIZE = 100;

interface NumberShare {
  sessionId: string;
  batches: number;
  contacts: number;
}

/**
 * Mirrors the backend plan: recipients are cut into batches of `batchSize`
 * and dealt round-robin across the numbers in the order they were picked
 * (1000 contacts, 3 numbers → 4 / 3 / 3 batches).
 */
function splitAcrossNumbers(sessionIds: string[], recipients: number, batchSize: number): NumberShare[] {
  const shares = sessionIds.map((sessionId) => ({ sessionId, batches: 0, contacts: 0 }));
  if (shares.length === 0 || recipients <= 0 || batchSize <= 0) return shares;
  const batchCount = Math.ceil(recipients / batchSize);
  for (let i = 0; i < batchCount; i++) {
    const share = shares[i % shares.length];
    share.batches += 1;
    share.contacts += Math.min(batchSize, recipients - i * batchSize);
  }
  return shares;
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}

function formatShare(share: NumberShare): string {
  return `${plural(share.batches, "batch", "batches")} · ${plural(share.contacts, "contact")}`;
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    // Spans so it can sit inside a <legend>
    <span className="flex items-center gap-2 mb-3">
      <span className="text-on-surface-variant/60" aria-hidden="true">{icon}</span>
      <span className="text-label font-semibold text-on-surface">{label}</span>
    </span>
  );
}

// ─── Email message fields ─────────────────────────────────────────────────────
function EmailFields({
  account, ready, templates, subject, body, subjectError, bodyError,
  registerSubject, registerBody, setSubject, setBody,
}: {
  account: EmailAccount | null | undefined;
  ready: boolean;
  templates: EmailTemplate[];
  subject: string;
  body: string;
  subjectError?: string;
  bodyError?: string;
  registerSubject: UseFormRegisterReturn;
  registerBody: UseFormRegisterReturn;
  setSubject: (v: string) => void;
  setBody: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      {!ready && <EmailConnectNotice account={account} />}

      {templates.length > 0 && (
        <div>
          <Label htmlFor="emailTemplate">
            Use email template{" "}
            <span className="font-normal text-on-surface-variant/50">(optional)</span>
          </Label>
          <Select
            id="emailTemplate"
            value=""
            onChange={(e) => {
              const tpl = templates.find((t) => t.id === e.target.value);
              if (!tpl) return;
              setSubject(tpl.subject);
              setBody(tpl.body);
            }}
          >
            <option value="">Choose a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="emailSubject">Subject *</Label>
        <Input
          id="emailSubject"
          placeholder="e.g., A little something for you, {{name}}"
          maxLength={255}
          error={subjectError}
          {...registerSubject}
        />
        <FieldChips
          label="Insert field in subject"
          fields={EMAIL_FIELDS}
          onInsert={(token) => setSubject(insertAtCursor("emailSubject", subject, token))}
        />
      </div>

      <div>
        <Label htmlFor="messageBody">Message *</Label>
        <textarea
          id="messageBody"
          placeholder="Write your email…"
          rows={8}
          aria-invalid={!!bodyError}
          aria-describedby={bodyError ? "messageBody-error" : undefined}
          className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-y placeholder:text-placeholder"
          {...registerBody}
        />
        <div className="flex items-start justify-between gap-2">
          <FieldChips
            label="Insert field in message"
            fields={EMAIL_FIELDS}
            onInsert={(token) => setBody(insertAtCursor("messageBody", body, token))}
          />
          <p className="mt-1 shrink-0 text-caption text-on-surface-variant/50 tabular-nums">{body.length} / 20,000</p>
        </div>
        {bodyError && (
          <p id="messageBody-error" role="alert" className="text-label text-error mt-1">{bodyError}</p>
        )}
      </div>
    </div>
  );
}

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  /** `official`: a Meta Cloud API number (needs an approved template) */
  sessions: { id: string; name: string; status: string; official?: boolean }[];
  /** Opens with a filtered audience, e.g. a contact source group */
  initialAudienceFilters?: CreateCampaignFormData["audienceFilters"];
}

/** True when a FILTERED audience actually narrows anything */
function hasAnyAudienceFilter(filters: CreateCampaignFormData["audienceFilters"]): boolean {
  if (!filters) return false;
  return Object.values(filters).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== "",
  );
}

export function CreateCampaignModal({ open, onClose, sessions, initialAudienceFilters }: CreateCampaignModalProps) {
  const router = useRouter();
  const createCampaign = useCreateCampaign();
  const executeCampaign = useExecuteCampaign();
  const previewAudience = usePreviewAudience();
  const createSavedGroups = useCreateSavedContactGroups();

  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled" | "draft">("immediate");
  const [productId, setProductId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  // Templates render a page at a time; scrolling near the end shows the next page
  const [visibleTemplates, setVisibleTemplates] = useState(TEMPLATE_PAGE_SIZE);

  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { data: orgTags } = useOrgTags();
  const savedGroupsQuery = useSavedContactGroups(open);
  const savedContactGroups = savedGroupsQuery.data;
  const { data: products } = useProducts();
  const terms = useProductTerms();
  const { data: scrapeRunsData } = useScrapeRuns({ take: 50 });
  const { data: emailAccount } = useEmailAccount({ enabled: open });
  const { data: emailTemplates } = useEmailTemplates();
  const emailReady = isEmailReady(emailAccount);

  const {
    register, handleSubmit, watch, setValue, getValues, reset,
    formState: { errors },
  } = useForm<CreateCampaignFormInput, unknown, CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      channel: "WHATSAPP",
      messageType: "TEXT",
      audienceType: "ALL",
      sessionIds: [],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const watchedSessionIds = watch("sessionIds");
  const selectedSessionIds = useMemo(() => watchedSessionIds ?? [], [watchedSessionIds]);

  // With a single connected number there is nothing to choose; preselect it.
  const onlySessionId = sessions.length === 1 ? sessions[0].id : null;
  useEffect(() => {
    if (open && onlySessionId && selectedSessionIds.length === 0) {
      setValue("sessionIds", [onlySessionId]);
    }
  }, [open, onlySessionId, selectedSessionIds.length, setValue]);

  useEffect(() => {
    if (!open || !initialAudienceFilters) return;
    setValue("audienceType", "FILTERED", { shouldValidate: true });
    setValue("audienceFilters", initialAudienceFilters);
  }, [open, initialAudienceFilters, setValue]);

  const channel = watch("channel") as Channel;
  const isEmail = channel === "EMAIL";
  const messageType = watch("messageType") as MessageType;
  const audienceType = watch("audienceType") as CampaignAudienceType;
  const messageBody = watch("messageBody") || "";
  const emailSubject = watch("emailSubject") || "";
  const audienceFilters = watch("audienceFilters");
  const mediaUrl = watch("mediaUrl");
  const senderName = sessions.find((s) => s.id === selectedSessionIds[0])?.name;

  // Only numbers that are still connected count, in the order they were picked
  const activeSessionIds = useMemo(
    () => selectedSessionIds.filter((id) => sessions.some((s) => s.id === id)),
    [selectedSessionIds, sessions],
  );
  const sessionName = (id: string) => sessions.find((s) => s.id === id)?.name ?? "Disconnected number";

  // Official numbers can only start a chat with a Meta-approved template
  const officialSelected = !isEmail && activeSessionIds.some((id) => sessions.find((s) => s.id === id)?.official);
  const [cloudChoice, setCloudChoice] = useState<CloudTemplateChoice | null>(null);
  const [cloudTemplateError, setCloudTemplateError] = useState<string | null>(null);
  const { data: cloudTemplates } = useCloudTemplates(undefined, officialSelected);

  /** Keep the text version (shown in the preview, sent by any QR number in the pool) in step */
  function chooseCloudTemplate(choice: CloudTemplateChoice | null) {
    setCloudChoice(choice);
    setCloudTemplateError(null);
    const tpl = cloudTemplates?.find((t) => t.id === choice?.templateId);
    setValue("messageType", "TEXT");
    setValue(
      "messageBody",
      tpl ? tpl.body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_w, n: string) => choice?.params[Number(n) - 1]?.trim() || "-") : "",
      { shouldValidate: !!errors.messageBody },
    );
  }

  // A preview count is only an estimate: the audience is resolved again at send time
  const preview = previewAudience.data;
  const previewBatchSize = preview?.batchSize ?? DEFAULT_BATCH_SIZE;
  const estimatedRecipients = preview
    ? Math.min(preview.estimatedRecipients ?? 0, preview.maxRecipients ?? Infinity)
    : null;
  const numberShares = useMemo(
    () => (estimatedRecipients === null
      ? []
      : splitAcrossNumbers(activeSessionIds, estimatedRecipients, previewBatchSize)),
    [activeSessionIds, estimatedRecipients, previewBatchSize],
  );
  const shareBySession = new Map(numberShares.map((share) => [share.sessionId, share]));

  // Drop a stale estimate when the audience changes
  const audienceKey = JSON.stringify([audienceType, audienceFilters ?? null]);
  const { reset: resetPreview } = previewAudience;
  useEffect(() => {
    resetPreview();
  }, [audienceKey, resetPreview]);

  function switchChannel(next: Channel) {
    if (next === channel) return;
    setValue("channel", next);
    // Email is text only; a WhatsApp template or file doesn't carry over
    setValue("messageType", "TEXT");
    setValue("mediaUrl", "");
    setValue("mediaMimeType", "");
    setSelectedTemplate(null);
    setShowTemplatePicker(false);
    // The count differs per channel
    previewAudience.reset();
  }

  // Template placeholders like {{lead.service}} aren't contact fields — the
  // user fills them once for the whole campaign
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const extraPlaceholders = useMemo(
    () => (isEmail
      ? customPlaceholders(`${emailSubject}\n${messageBody}`, EMAIL_PLACEHOLDERS)
      : customPlaceholders(messageBody)),
    [isEmail, emailSubject, messageBody],
  );
  const unfilledPlaceholders = extraPlaceholders.filter((k) => !placeholderValues[k]?.trim());

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q),
    );
  }, [templates, templateSearch]);


  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [savedGroupName, setSavedGroupName] = useState("");
  // WhatsApp only: run round the clock instead of 12 AM – 10 PM
  const [sendAnyTime, setSendAnyTime] = useState(false);
  const checkGroupMove = useCheckSavedGroupMove();
  const [pendingGroupMove, setPendingGroupMove] = useState<SavedGroupMoveImpact | null>(null);
  const [pendingSend, setPendingSend] = useState<{
    data: CreateCampaignFormData;
    recipients: number | null;
    batchSize: number;
    maxRecipients: number;
    /** WhatsApp numbers in send order; empty for email */
    sessionIds: string[];
  } | null>(null);

  function handleClose() {
    setSavedGroupName("");
    setSendAnyTime(false);
    onClose();
  }

  async function onSubmit(data: CreateCampaignFormData) {
    if (unfilledPlaceholders.length > 0) return;
    const emailCampaign = data.channel === "EMAIL";
    if (emailCampaign && !emailReady) return;
    if (emailCampaign && scheduleMode !== "immediate") {
      submitCampaign(data);
      return;
    }
    const sessionIds = emailCampaign
      ? []
      : data.sessionIds.filter((id) => sessions.some((s) => s.id === id));
    if (!emailCampaign && sessionIds.length === 0) {
      setAudienceError("Select at least one connected WhatsApp number.");
      return;
    }
    if (officialSelected) {
      const tpl = cloudTemplates?.find((t) => t.id === cloudChoice?.templateId);
      if (!cloudChoice || !tpl) {
        setCloudTemplateError("Pick an approved template for the official number");
        return;
      }
      if (tpl.needsHeaderImage && !cloudChoice.headerImageUrl) {
        setCloudTemplateError("This template has an image header: add the image link");
        return;
      }
    }

    // "Groups" / "Custom" with nothing picked would otherwise reach everyone
    if (data.audienceType === "FILTERED" && !hasAnyAudienceFilter(data.audienceFilters)) {
      setAudienceError("Pick at least one group or filter, or choose Everyone.");
      return;
    }

    setAudienceError(null);
    let recipients: number | null = null;
    let batchSize = DEFAULT_BATCH_SIZE;
    let maxRecipients = 10_000;
    try {
      const result = await previewAudience.mutateAsync({
        audienceType: data.audienceType,
        audienceFilters: data.audienceType === "FILTERED" ? data.audienceFilters : undefined,
        channel: data.channel,
      });
      recipients = result.estimatedRecipients ?? null;
      batchSize = result.batchSize;
      maxRecipients = result.maxRecipients;
    } catch (error) {
      if (!emailCampaign) {
        setAudienceError(error instanceof Error ? error.message : "Could not preview the campaign audience.");
        return;
      }
    }

    // A scheduled or draft campaign may wait for its audience to grow; sending now can't
    if (!emailCampaign && scheduleMode === "immediate" && recipients === 0) {
      setAudienceError("No WhatsApp contacts match this audience.");
      return;
    }
    setPendingSend({ data, recipients, batchSize, maxRecipients, sessionIds });
  }

  function submitCampaign(data: CreateCampaignFormData, sessionIds: string[] = []) {
    const isScheduled = scheduleMode === "scheduled" && !!data.scheduledAt;
    // Senders are sent as `sessionIds`; the legacy single `sessionId` is left out
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { channel: ch, emailSubject: subject, sessionId: _sid, sessionIds: _sessionIds, ...rest } = data;
    const shared = {
      ...rest,
      description: data.description || undefined,
      messageBody: data.messageBody ? fillPlaceholders(data.messageBody, placeholderValues) : undefined,
      scheduledAt: isScheduled ? data.scheduledAt : undefined,
      productId: productId || undefined,
    };
    createCampaign.mutate(
      ch === "EMAIL"
        ? {
            ...shared,
            channel: "EMAIL",
            emailSubject: fillPlaceholders(subject ?? "", placeholderValues).trim(),
            messageType: "TEXT",
            mediaUrl: undefined,
            mediaMimeType: undefined,
          }
        : {
            ...shared,
            channel: "WHATSAPP",
            // Batches are planned at run time, round-robin across these in order
            sessionIds,
            ...(sendAnyTime && { sendAnyTime: true }),
            mediaUrl: data.mediaUrl || undefined,
            mediaMimeType: data.mediaMimeType || undefined,
            ...(officialSelected && cloudChoice && {
              cloudTemplateId: cloudChoice.templateId,
              cloudTemplateParams: cloudChoice.params,
              ...(cloudChoice.headerImageUrl && { cloudTemplateHeaderImageUrl: cloudChoice.headerImageUrl }),
            }),
          },
      {
        onSuccess: ({ campaign: created }) => {
          // The backend saves unscheduled campaigns as drafts; "Send now" starts it right away
          if (scheduleMode === "immediate") executeCampaign.mutate(created.id);
          reset();
          setScheduleMode("immediate");
          setProductId("");
          setSelectedTemplate(null);
          setTemplateSearch("");
          setShowTemplatePicker(false);
          setPlaceholderValues({});
          setCloudChoice(null);
          setPendingSend(null);
          setAudienceError(null);
          handleClose();
          router.push(`/campaigns/${created.id}`);
        },
      },
    );
  }


  // A contact is in one group only: warn before saving moves anyone out of another group
  function saveSelectedContactsAsGroups() {
    const contactIds = audienceFilters?.contactIds ?? [];
    if (!savedGroupName.trim() || contactIds.length === 0) return;
    checkGroupMove.mutate(
      { contactIds },
      {
        onSuccess: (impact) => {
          if (impact.alreadyGrouped > 0) setPendingGroupMove(impact);
          else createSelectedContactGroups();
        },
      },
    );
  }

  function createSelectedContactGroups() {
    setPendingGroupMove(null);
    const contactIds = audienceFilters?.contactIds ?? [];
    if (!savedGroupName.trim() || contactIds.length === 0) return;
    createSavedGroups.mutate(
      { name: savedGroupName.trim(), contactIds },
      {
        onSuccess: (result) => {
          // Read filters now, not from the render that started the save
          const current = getValues("audienceFilters");
          const contactGroupIds = [
            ...new Set([
              ...(current?.contactGroupIds ?? []),
              ...result.groups.map((group) => group.id),
            ]),
          ];
          setValue("audienceType", "FILTERED", { shouldValidate: true });
          // The new group now holds the hand-picked contacts
          setValue("audienceFilters", {
            ...current,
            contactIds: undefined,
            contactGroupIds,
          }, { shouldValidate: true, shouldDirty: true });
          setSavedGroupName("");
          const moved = "movedFromGroups" in result && typeof result.movedFromGroups === "number"
            ? result.movedFromGroups
            : 0;
          if (moved > 0) {
            toast.info(`${plural(moved, "contact")} moved from their old group`);
          }
        },
      },
    );
  }

  function toggleSession(sessionId: string) {
    const nextSessionIds = selectedSessionIds.includes(sessionId)
      ? selectedSessionIds.filter((id) => id !== sessionId)
      : [...selectedSessionIds, sessionId];
    setValue("sessionIds", nextSessionIds, { shouldValidate: true, shouldDirty: true });
  }

  // Options for the audience filter menus
  const scrapeRunOptions = (scrapeRunsData?.runs ?? [])
    .filter((r) => r.status === "COMPLETED")
    .map((r) => ({
      value: r.id,
      label: `${SOURCE_LABELS[r.source] ?? r.source} — "${r.keywords}" (${r.importedCount > 0 ? `${r.importedCount} imported` : `${r.resultCount} found`})`,
    }));
  const tagOptions = (orgTags ?? []).map((t) => ({ value: t.id, label: t.name }));
  const productOptions = (products ?? [])
    .filter((p) => p.status === "ACTIVE")
    .map((p) => ({ value: p.id, label: p.name }));


  // Estimate line under the number picker (announced politely)
  const numbersStatus = estimatedRecipients !== null && activeSessionIds.length > 0
    ? `Est. ${plural(estimatedRecipients, "contact")} in ${plural(
        Math.ceil(estimatedRecipients / previewBatchSize), "batch", "batches",
      )} of ${previewBatchSize}. Final count is set at send time.`
    : activeSessionIds.length > 1
      ? `Batches of ${previewBatchSize} rotate across numbers in this order.`
      : "";

  // What the confirm dialog says before sending
  const pendingCapped = !!pendingSend && pendingSend.recipients !== null
    && pendingSend.recipients > pendingSend.maxRecipients;
  const pendingRecipients = pendingSend?.recipients == null
    ? null
    : Math.min(pendingSend.recipients, pendingSend.maxRecipients);
  const pendingShares = pendingSend && pendingSend.data.channel !== "EMAIL" && pendingRecipients
    ? splitAcrossNumbers(pendingSend.sessionIds, pendingRecipients, pendingSend.batchSize)
    : [];
  let confirmMessage = "";
  if (pendingSend?.data.channel === "EMAIL") {
    confirmMessage = pendingRecipients != null
      ? `About ${plural(pendingRecipients, "contact")} get this email. You can pause it from the campaign page.`
      : "It goes out to your whole audience right away. You can pause it from the campaign page.";
  } else if (pendingSend) {
    const numbers = plural(pendingSend.sessionIds.length, "number");
    confirmMessage = pendingRecipients
      ? `About ${plural(pendingRecipients, "contact")} in ${plural(
          Math.ceil(pendingRecipients / pendingSend.batchSize), "batch", "batches",
        )} of up to ${pendingSend.batchSize}, from ${numbers}. Final count is set when it starts.`
      : `Sends from ${numbers}. Batches are planned when it starts.`;
  }
  if (pendingCapped && pendingSend) {
    confirmMessage += ` Capped at ${pendingSend.maxRecipients.toLocaleString()} recipients.`;
  }

  return (
    <>
    <Modal
      open={open}
      onClose={handleClose}
      dismissible={!pendingSend}
      aria-label="New campaign"
      className="max-w-4xl xl:max-w-6xl border border-outline-variant/15 flex flex-col max-h-[90vh] overflow-hidden"
    >
      {() => (
      <>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 shrink-0 max-lg:px-4 max-lg:pt-5 max-lg:pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Megaphone className="h-4 w-4 text-primary" />
            </span>
            <h2 className="text-title-sm font-semibold text-on-surface">New campaign</h2>
          </div>
          <IconButton size="sm"
            onClick={handleClose} aria-label="Close">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        {/* Phones: one column that scrolls up and down; desktop: side-by-side panels */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0 max-lg:block max-lg:min-w-0 max-lg:overflow-y-auto max-lg:overflow-x-hidden max-lg:overscroll-contain">

          {/* LEFT PANEL — Campaign details + Message content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 border-r border-outline-variant/10 max-lg:min-w-0 max-lg:overflow-visible max-lg:border-r-0 max-lg:px-4 max-lg:pb-3">

            {!isEmail && <CampaignCapacityNotice />}

            {/* Campaign name + description */}
            <div className="space-y-3">
              <SectionHeading icon={<Megaphone className="h-3.5 w-3.5" />} label="Details" />
              <div>
                <Label htmlFor="name">Campaign name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Welcome Offer 2024"
                  error={errors.name?.message}
                  {...register("name")}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  placeholder="Brief description…"
                  rows={2}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-placeholder"
                  {...register("description")}
                />
              </div>
            </div>

            {/* Message content */}
            <div className="space-y-3">
              <SectionHeading icon={<MessageSquare className="h-3.5 w-3.5" />} label="Message" />

              <ChannelSwitch
                name="campaign-channel"
                label="Send by"
                value={channel}
                onChange={switchChannel}
                data-tour="campaign-channel"
              />

              {isEmail ? (
                <EmailFields
                  account={emailAccount}
                  ready={emailReady}
                  templates={emailTemplates ?? []}
                  subject={emailSubject}
                  body={messageBody}
                  subjectError={errors.emailSubject?.message}
                  bodyError={errors.messageBody?.message}
                  registerSubject={register("emailSubject")}
                  registerBody={register("messageBody")}
                  setSubject={(v) => setValue("emailSubject", v, { shouldValidate: !!errors.emailSubject })}
                  setBody={(v) => setValue("messageBody", v, { shouldValidate: !!errors.messageBody })}
                />
              ) : (
              <>
              {officialSelected && (
                <div className="space-y-2 rounded-xl border border-outline-variant/15 p-3">
                  <p className="text-body text-on-surface-variant">
                    You picked an official number: campaigns go out as a Meta-approved template.
                    Any QR number in the list sends the same text.
                  </p>
                  <CloudTemplateFields
                    value={cloudChoice}
                    onChange={chooseCloudTemplate}
                    chips={[{ label: "{{name}}", value: "{{name}}" }, { label: "{{phone}}", value: "{{phone}}" }]}
                    error={cloudTemplateError ?? undefined}
                  />
                </div>
              )}
              {/* Text / media message (an approved template replaces it for official numbers) */}
              <div className={officialSelected ? "hidden" : "contents"}>
              {/* Type pills */}
              <fieldset>
                <legend className="text-body font-medium text-on-surface-variant">Type</legend>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {MSG_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={messageType === value}
                      onClick={() => {
                        if (value === messageType) return;
                        setValue("messageType", value, { shouldValidate: true });
                        // A file picked for one type doesn't fit another
                        setValue("mediaUrl", "");
                        setValue("mediaMimeType", "");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-label font-medium transition-colors border outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        messageType === value
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container border-transparent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Template picker */}
              <div>
                <Label htmlFor={selectedTemplate ? undefined : "templatePicker"}>
                  WhatsApp template{" "}
                  <span className="font-normal text-on-surface-variant/50">(optional)</span>
                </Label>

                {selectedTemplate ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-primary/30 bg-primary/5 mt-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-body font-medium text-on-surface truncate">{selectedTemplate.name}</span>
                      <span className="text-caption bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant shrink-0">{selectedTemplate.language}</span>
                      {selectedTemplate.category && (
                        <span className="text-caption bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant shrink-0">{selectedTemplate.category}</span>
                      )}
                    </div>
                    <IconButton size="xs" variant="danger" type="button" onClick={() => setSelectedTemplate(null)} aria-label="Remove template">
                      <X className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ) : (
                  <button
                    id="templatePicker"
                    type="button"
                    aria-expanded={showTemplatePicker}
                    onClick={() => {
                      setShowTemplatePicker((v) => !v);
                      setVisibleTemplates(TEMPLATE_PAGE_SIZE);
                    }}
                    className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-outline-variant/15 bg-surface-container-low text-body text-on-surface-variant/60 hover:bg-surface-container transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    Select a template…
                  </button>
                )}

                {showTemplatePicker && !selectedTemplate && (
                  <div className="mt-1 rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant/10">
                      <Search className="h-3.5 w-3.5 text-on-surface-variant/40 shrink-0" />
                      <input
                        autoFocus
                        value={templateSearch}
                        onChange={(e) => {
                          setTemplateSearch(e.target.value);
                          setVisibleTemplates(TEMPLATE_PAGE_SIZE);
                        }}
                        placeholder="Search templates…"
                        aria-label="Search templates"
                        className="flex-1 bg-transparent text-body text-on-surface outline-none placeholder:text-placeholder"
                      />
                    </div>
                    <div
                      className="max-h-[260px] overflow-y-auto"
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        const nearEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
                        if (nearEnd && visibleTemplates < filteredTemplates.length) {
                          setVisibleTemplates((n) => n + TEMPLATE_PAGE_SIZE);
                        }
                      }}
                    >
                      {templatesLoading ? (
                        <p className="text-label text-center text-on-surface-variant py-4">Loading…</p>
                      ) : filteredTemplates.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
                          <FileText className="h-6 w-6 text-on-surface-variant/30" />
                          <p className="text-body text-on-surface-variant">
                            {templateSearch.trim() ? "No templates match" : "No templates yet"}
                          </p>
                          {!templateSearch.trim() && (
                            <button type="button" onClick={() => window.open("/settings/templates", "_blank", "noopener")} className="flex items-center gap-1.5 text-label text-primary hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" /> Create a template
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredTemplates.slice(0, visibleTemplates).map((tpl) => {
                          const body = extractTemplateBody(tpl);
                          return (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => {
                                setSelectedTemplate(tpl);
                                setValue("messageBody", body, { shouldValidate: true });
                                // A template with an image goes out as an image with the message as caption
                                const image = templateImageUrl(tpl);
                                if (image) {
                                  setValue("messageType", "IMAGE", { shouldValidate: true });
                                  setValue("mediaUrl", image, { shouldValidate: true });
                                  setValue("mediaMimeType", "");
                                }
                                setShowTemplatePicker(false);
                                setTemplateSearch("");
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-surface-container transition-colors border-b border-outline-variant/5 last:border-0"
                            >
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-body font-medium text-on-surface">{tpl.name}</span>
                                <span className="text-caption bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">{tpl.language}</span>
                                {tpl.category && (
                                  <span className="text-caption bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">{tpl.category}</span>
                                )}
                              </div>
                              <p className="text-label text-on-surface-variant/60 truncate">{body || "—"}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {filteredTemplates.length > TEMPLATE_PAGE_SIZE && (
                      <p className="px-3 py-2 text-caption text-on-surface-variant/50 border-t border-outline-variant/10 text-center">
                        {Math.min(visibleTemplates, filteredTemplates.length)} of {filteredTemplates.length}
                        {visibleTemplates < filteredTemplates.length && " — scroll for more"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Message body */}
              <div>
                <Label htmlFor="messageBody">Message</Label>
                <textarea
                  id="messageBody"
                  placeholder={`Type your message… Use {{name}} for personalization`}
                  rows={5}
                  aria-invalid={!!errors.messageBody}
                  aria-describedby={errors.messageBody ? "messageBody-error" : undefined}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-placeholder"
                  {...register("messageBody")}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-caption text-on-surface-variant/50">{"{{name}}"}, {"{{phone}}"}</p>
                  <p className="text-caption text-on-surface-variant/50 tabular-nums">{messageBody.length} / 4,096</p>
                </div>
                {errors.messageBody && (
                  <p id="messageBody-error" role="alert" className="text-label text-error mt-1">{errors.messageBody.message}</p>
                )}
              </div>
              </div>
              </>
              )}

              {extraPlaceholders.length > 0 && (
                <div className="space-y-2 rounded-xl bg-surface-container-low p-3">
                  <p className="text-label font-medium text-on-surface">
                    Fill in the template details
                  </p>
                  <p className="text-caption text-on-surface-variant">
                    The same value goes to every recipient.
                  </p>
                  {extraPlaceholders.map((key) => (
                    <div key={key}>
                      <Label htmlFor={`ph-${key}`}>{key.replace(/^lead\./, "").replace(/_/g, " ")}</Label>
                      <Input
                        id={`ph-${key}`}
                        placeholder={`Value for {{${key}}}`}
                        value={placeholderValues[key] ?? ""}
                        onChange={(e) => setPlaceholderValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {unfilledPlaceholders.length > 0 && (
                    <p className="text-caption text-error">
                      Fill in all {unfilledPlaceholders.length} field{unfilledPlaceholders.length !== 1 ? "s" : ""} — otherwise contacts would see the raw {"{{…}}"} text.
                    </p>
                  )}
                </div>
              )}

              {messageType !== "TEXT" && (
                <div>
                  <Label htmlFor="mediaUrl">Media *</Label>
                  <MediaPicker
                    id="mediaUrl"
                    kind={mediaKindFor(messageType)}
                    value={mediaUrl ?? ""}
                    error={errors.mediaUrl?.message}
                    onChange={(url, media) => {
                      setValue("mediaUrl", url, { shouldValidate: true });
                      setValue("mediaMimeType", media?.mimeType ?? "");
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE PANEL — Audience, Session, Product, Scheduling */}
          <div className="w-[380px] shrink-0 overflow-y-auto px-6 py-5 space-y-6 xl:border-r xl:border-outline-variant/10 max-lg:w-full max-lg:min-w-0 max-lg:overflow-visible max-lg:px-4 max-lg:pt-3 max-lg:border-t max-lg:border-outline-variant/10">

            {/* Audience */}
            <div>
              <SectionHeading icon={<Users className="h-3.5 w-3.5" />} label="Audience" />

              <AudiencePicker
                audienceType={audienceType}
                filters={audienceFilters}
                onChange={(type, filters) => {
                  setValue("audienceType", type, { shouldValidate: true });
                  setValue("audienceFilters", filters, { shouldValidate: true, shouldDirty: true });
                }}
                batchSize={previewBatchSize}
                isEmail={isEmail}
                groups={{
                  data: savedContactGroups,
                  isLoading: savedGroupsQuery.isLoading,
                  isError: savedGroupsQuery.isError,
                  isFetching: savedGroupsQuery.isFetching,
                  refetch: () => { void savedGroupsQuery.refetch(); },
                }}
                tags={tagOptions}
                products={productOptions}
                productLabel={{ singular: terms.singular, plural: terms.Plural }}
                scrapeRuns={scrapeRunOptions}
                saveGroup={{
                  name: savedGroupName,
                  setName: setSavedGroupName,
                  onSave: saveSelectedContactsAsGroups,
                  saving: createSavedGroups.isPending,
                }}
              />

              {/* Preview */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    previewAudience.mutate({
                      audienceType,
                      audienceFilters: audienceType === "FILTERED" ? audienceFilters : undefined,
                      channel,
                    })
                  }
                  loading={previewAudience.isPending}
                >
                  Preview audience
                </Button>
                <span className="text-label text-on-surface-variant" aria-live="polite">
                  {preview && (
                    <>
                      ~<span className="font-semibold text-on-surface">{(preview.estimatedRecipients ?? 0).toLocaleString()}</span> recipients
                      {!isEmail && (preview.notOnWhatsApp ?? 0) > 0 && (
                        <> · {preview.notOnWhatsApp!.toLocaleString()} not on WhatsApp, skipped</>
                      )}
                    </>
                  )}
                </span>
              </div>
              {isEmail && (
                <p className="mt-1.5 text-caption text-on-surface-variant">
                  Only contacts with an email who haven&apos;t unsubscribed
                </p>
              )}
            </div>

            {/* Sender: business email, or WhatsApp numbers that take turns sending batches */}
            {isEmail ? (
              <div>
                <SectionHeading icon={<Mail className="h-3.5 w-3.5" />} label="Send from" />
                {emailReady ? (
                  <p className="rounded-xl bg-surface-container-low px-4 py-2.5 text-body text-on-surface break-all">
                    {emailAccount.fromName}{" "}
                    <span className="text-on-surface-variant">&lt;{emailAccount.fromAddress}&gt;</span>
                  </p>
                ) : (
                  <p className="text-label text-on-surface-variant">No business email connected</p>
                )}
              </div>
            ) : (
              <fieldset
                data-tour="campaign-numbers"
                aria-describedby={[
                  numbersStatus ? "campaign-numbers-status" : "",
                  errors.sessionIds ? "sessionIds-error" : "",
                ].filter(Boolean).join(" ") || undefined}
                className="min-w-0"
              >
                <legend className="w-full">
                  <SectionHeading icon={<Wifi className="h-3.5 w-3.5" />} label="WhatsApp numbers" />
                </legend>
                {sessions.length === 0 ? (
                  <p className="rounded-xl bg-warning-container px-4 py-3 text-label text-warning">
                    No connected numbers.{" "}
                    {/* New tab so the campaign being written isn't lost */}
                    <a href="/settings/whatsapp" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-on-surface">
                      Connect WhatsApp
                    </a>
                  </p>
                ) : (
                  <ul className="divide-y divide-outline-variant/10 overflow-hidden rounded-xl border border-outline-variant/15">
                    {sessions.map((session) => {
                      const order = activeSessionIds.indexOf(session.id);
                      const share = shareBySession.get(session.id);
                      const inputId = `campaign-number-${session.id}`;
                      return (
                        <li key={session.id}>
                          <label
                            htmlFor={inputId}
                            className="flex min-h-11 cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-surface-container-low"
                          >
                            <input
                              id={inputId}
                              type="checkbox"
                              checked={order >= 0}
                              onChange={() => toggleSession(session.id)}
                              aria-describedby={share ? `${inputId}-share` : undefined}
                              className="h-4 w-4 shrink-0 accent-primary outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                            />
                            {activeSessionIds.length > 1 && order >= 0 && (
                              // Send order: batch 1 goes to the first number, batch 2 to the next…
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-caption font-semibold text-primary tabular-nums">
                                <span className="sr-only">Order </span>{order + 1}
                              </span>
                            )}
                            {/* Phones stack the summary under the number */}
                            <span className="flex min-w-0 flex-1 items-center gap-2 max-sm:flex-col max-sm:items-start max-sm:gap-0">
                              <span className="min-w-0 max-w-full flex-1 truncate text-label text-on-surface">{session.name}</span>
                              {share && (
                                <span id={`${inputId}-share`} className="shrink-0 text-caption text-on-surface-variant tabular-nums">
                                  {formatShare(share)}
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p id="campaign-numbers-status" aria-live="polite" className="mt-1.5 text-caption text-on-surface-variant empty:hidden">
                  {sessions.length > 0 ? numbersStatus : ""}
                </p>
                {errors.sessionIds && (
                  <p id="sessionIds-error" role="alert" className="text-label text-error mt-1">{errors.sessionIds.message}</p>
                )}
              </fieldset>
            )}

            {/* Product (optional) */}
            <div>
              <SectionHeading icon={<Package className="h-3.5 w-3.5" />} label={`${terms.Singular} (optional)`} />
              <ProductSelectField value={productId} onChange={setProductId} onBeforeRedirect={handleClose} />
            </div>

            {/* Scheduling */}
            <div>
              <SectionHeading icon={<Clock className="h-3.5 w-3.5" />} label="Scheduling" />
              <div className="flex gap-2 mb-3 max-lg:gap-1.5" role="group" aria-label="When to send">
                {([
                  { value: "immediate", label: "Send now" },
                  { value: "scheduled", label: "Schedule" },
                  { value: "draft", label: "Save as draft" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={scheduleMode === opt.value}
                    onClick={() => setScheduleMode(opt.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-label font-medium transition-colors border outline-none focus-visible:ring-2 focus-visible:ring-focus max-lg:min-w-0 max-lg:px-1.5 max-lg:min-h-11 ${
                      scheduleMode === opt.value
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-outline-variant/15 text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {!isEmail && (
                <div className="mb-3 flex items-start justify-between gap-3 border-t border-outline-variant pt-3">
                  <div className="min-w-0">
                    <p id="sendAnyTime-label" className="text-body font-medium text-on-surface">
                      Send any time (24 hours)
                    </p>
                    <p id="sendAnyTime-hint" className="text-caption text-on-surface-variant">
                      {sendAnyTime
                        ? "Keeps sending day and night until everyone gets it. Daily limits per number still apply."
                        : "Off: sends 12 AM – 10 PM in the campaign's time zone."}
                    </p>
                  </div>
                  <Switch
                    checked={sendAnyTime}
                    onChange={setSendAnyTime}
                    aria-labelledby="sendAnyTime-label"
                    className="mt-0.5 shrink-0"
                  />
                </div>
              )}
              {scheduleMode === "scheduled" && (
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label htmlFor="scheduledAt">Date & time</Label>
                    <Input id="scheduledAt" type="datetime-local" error={errors.scheduledAt?.message} {...register("scheduledAt")} />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" placeholder="UTC" {...register("timezone")} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL — what the contact sees */}
          <div className="hidden xl:flex w-[320px] shrink-0 overflow-y-auto flex-col items-center px-6 py-5 bg-surface-container-lowest">
            <div className="self-stretch">
              <SectionHeading
                icon={isEmail ? <Mail className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                label="Preview"
              />
            </div>
            {isEmail ? (
              <EmailPreview
                className="self-stretch"
                fromName={emailAccount?.fromName ?? ""}
                fromAddress={emailAccount?.fromAddress}
                subject={fillPlaceholders(emailSubject, placeholderValues)}
                body={fillPlaceholders(messageBody, placeholderValues)}
              />
            ) : (
            <WhatsAppPhonePreview
              senderName={senderName}
              messages={[{
                key: "msg",
                body: fillPlaceholders(messageBody, placeholderValues),
                messageType,
                mediaUrl,
              }]}
            />
            )}
          </div>
        </form>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <ModalFooter className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest max-lg:flex-wrap max-lg:px-4 max-lg:pt-3">
          {audienceError && (
            <p className="text-label text-error flex-1 max-lg:basis-full" role="alert">
              {audienceError}
            </p>
          )}
          {createCampaign.isError && (
            <p className="text-label text-error flex-1 max-lg:basis-full" role="alert">
              {(createCampaign.error as Error)?.message || "Failed to create campaign"}
            </p>
          )}
          <div className="flex gap-2 ml-auto max-lg:ml-0 max-lg:w-full">
            <Button type="button" variant="secondary" onClick={handleClose} className="max-lg:flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              form="campaign-form"
              loading={createCampaign.isPending || previewAudience.isPending}
              disabled={isEmail && !emailReady}
              onClick={handleSubmit(onSubmit)}
              className="max-lg:flex-1"
            >
              {scheduleMode === "immediate" ? "Create & send" : scheduleMode === "scheduled" ? "Schedule campaign" : "Save draft"}
            </Button>
          </div>
        </ModalFooter>
      </>
      )}
    </Modal>

    <ConfirmDialog
      open={!!pendingGroupMove}
      title={`Move ${pendingGroupMove?.alreadyGrouped ?? 0} contacts?`}
      message={`They're in ${groupNamesSummary(pendingGroupMove?.groups ?? [])}. A contact can only be in one group.`}
      confirmLabel={`Move ${pendingGroupMove?.alreadyGrouped ?? 0} contacts`}
      loading={createSavedGroups.isPending}
      onCancel={() => setPendingGroupMove(null)}
      onConfirm={createSelectedContactGroups}
    />

    <ConfirmDialog
      open={!!pendingSend}
      title={
        scheduleMode === "immediate"
          ? "Send this campaign now?"
          : scheduleMode === "scheduled"
            ? "Schedule this campaign?"
            : "Save this campaign as a draft?"
      }
      message={confirmMessage}
      confirmLabel={scheduleMode === "immediate" ? "Send now" : scheduleMode === "scheduled" ? "Schedule" : "Save draft"}
      variant={scheduleMode === "immediate" ? "warning" : "default"}
      loading={createCampaign.isPending}
      onCancel={() => setPendingSend(null)}
      onConfirm={() => pendingSend && submitCampaign(pendingSend.data, pendingSend.sessionIds)}
    >
      {pendingShares.length > 1 ? (
        <ul className="max-h-48 space-y-1 overflow-y-auto text-left" aria-label="Estimated split per number">
          {pendingShares.map((share) => (
            <li key={share.sessionId} className="flex items-center justify-between gap-3 text-label">
              <span className="min-w-0 truncate text-on-surface">{sessionName(share.sessionId)}</span>
              <span className="shrink-0 text-on-surface-variant tabular-nums">{formatShare(share)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </ConfirmDialog>
    </>
  );
}
