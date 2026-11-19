"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Mail, MessageSquare, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, LoadError } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { IconButton } from "@/components/ui/icon-button";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { PageHeader } from "@/components/layout/page-header";
import { EmailPreview } from "@/components/email/email-preview";
import { usePageTitle } from "@/hooks/use-page-title";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useOrgSettings } from "@/hooks/use-settings";
import {
  useDeleteEmailTemplate,
  useEmailAccount,
  useEmailTemplates,
  useGenerateEmailTemplate,
  useSaveEmailTemplate,
} from "@/hooks/use-email";
import { EMAIL_FIELDS } from "@/lib/email-render";
import type { EmailTemplate } from "@/lib/api/email";
import { channelPanelProps } from "./channel-tabs";
import { EditPreviewSwitch, TemplatePreviewPanel, type EditorView } from "./template-preview-panel";
import {
  AiWriteModal,
  TEMPLATE_LANGUAGES,
  FormError,
  LABEL_CLASS,
  SectionHeading,
  TEXTAREA_CLASS,
  TemplateEditorModal,
  WriteWithAiButton,
  apiErrorMessage,
} from "./template-editor-modal";

const NAME_MAX = 255;
const SUBJECT_MAX = 255;
const BODY_MAX = 20_000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type FieldTarget = "subject" | "body";

export function EmailTemplates({ channelTabs }: { channelTabs: ReactNode }) {
  usePageTitle("Email templates");
  const { data: templates, isLoading, isError, refetch } = useEmailTemplates();
  const { data: account, isSuccess: accountLoaded } = useEmailAccount();
  const { data: orgSettings } = useOrgSettings();
  const saveTemplate = useSaveEmailTemplate();
  const generateEmail = useGenerateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();
  const isMobile = useIsMobile();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState("");
  const [mobileView, setMobileView] = useState<EditorView>("edit");
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null);
  // The field chips insert into whichever of subject / message was used last
  const [target, setTarget] = useState<FieldTarget>("body");
  // Write with AI: asks what the email should say, then fills subject + message
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  // Language for Write with AI (Tamil, Hindi…); fields like {{name}} stay as they are
  const [aiLanguage, setAiLanguage] = useState("en");
  const [aiError, setAiError] = useState("");

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const orgName = orgSettings?.name ?? "";
  const fromName = account?.fromName || orgName;
  const fromAddress = account?.fromAddress ?? null;
  const notConnected = accountLoaded && !account;

  const openNew = () => {
    setEditId(null);
    setName("");
    setSubject("");
    setBody("");
    setFormError("");
    setTarget("body");
    setMobileView("edit");
    setShowForm(true);
  };

  /** Phones open an existing template on its preview; desktop shows both side by side */
  const openExisting = (tpl: EmailTemplate, view: EditorView = "edit") => {
    setEditId(tpl.id);
    setName(tpl.name);
    setSubject(tpl.subject);
    setBody(tpl.body);
    setFormError("");
    setTarget("body");
    setMobileView(view);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormError("");
    setMobileView("edit");
  };

  const insertField = (key: string) => {
    const token = `{{${key}}}`;
    const el = target === "subject" ? subjectRef.current : bodyRef.current;
    const value = target === "subject" ? subject : body;
    const set = target === "subject" ? setSubject : setBody;
    if (!el) {
      set(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    set(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  const openAi = () => {
    setAiError("");
    setShowAi(true);
  };

  const closeAi = () => {
    if (generateEmail.isPending) return;
    setShowAi(false);
    setAiPrompt("");
    setAiError("");
  };

  const handleGenerate = () => {
    const prompt = aiPrompt.trim();
    if (!prompt) return;
    setAiError("");
    generateEmail.mutate({ prompt, language: aiLanguage }, {
      onSuccess: (r) => {
        setSubject(r.subject);
        setBody(r.body);
        setFormError("");
        setShowAi(false);
        setAiPrompt("");
      },
      onError: (err) => setAiError(apiErrorMessage(err, "Couldn't write the email right now. Please try again.")),
    });
  };

  const handleSave = () => {
    setFormError("");
    const fail = (msg: string) => { setFormError(msg); setMobileView("edit"); };
    const n = name.trim();
    const s = subject.trim();
    const b = body.trim();
    if (!n) return fail("Template name is required.");
    if (n.length > NAME_MAX) return fail(`Name must be ${NAME_MAX} characters or less.`);
    if (!s) return fail("Subject is required.");
    if (s.length > SUBJECT_MAX) return fail(`Subject must be ${SUBJECT_MAX} characters or less.`);
    if (!b) return fail("Message is required.");
    if (b.length > BODY_MAX) return fail("Message must be 20,000 characters or less.");
    saveTemplate.mutate(
      { id: editId ?? undefined, name: n, subject: s, body: b },
      {
        onSuccess: () => {
          toast.success(editId ? "Template saved" : "Template created");
          closeForm();
        },
        onError: (err) => fail(apiErrorMessage(err, "Couldn't save the template. Please try again.")),
      },
    );
  };

  const columns: DataTableColumn<EmailTemplate>[] = [
    {
      id: "name",
      header: "Template name",
      skeleton: "avatar",
      cell: (tpl) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <span className="text-body font-medium text-on-surface">{tpl.name}</span>
        </div>
      ),
    },
    {
      id: "subject",
      header: "Subject",
      cellClassName: "text-label text-on-surface-variant truncate max-w-[320px]",
      cell: (tpl) => tpl.subject || "—",
    },
    {
      id: "updated",
      header: "Updated",
      skeleton: "short",
      cellClassName: "text-label text-on-surface-variant",
      cell: (tpl) => formatDate(tpl.updatedAt),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      skeleton: "none",
      cell: (tpl) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton size="xs" onClick={() => openExisting(tpl)} className="hover:bg-primary/10 hover:text-primary" title="Edit template" aria-label={`Edit ${tpl.name}`}>
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton size="xs" variant="danger" onClick={() => setDeleteTarget(tpl)} title="Delete template" aria-label={`Delete ${tpl.name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ),
    },
  ];

  const saving = saveTemplate.isPending;

  const connectHint = notConnected ? (
    <p className="text-caption text-on-surface-variant">
      Connect your business email in{" "}
      <Link href="/settings/email" className="rounded font-medium text-primary underline outline-none focus-visible:ring-2 focus-visible:ring-focus">
        Settings → Email
      </Link>{" "}
      to send
    </p>
  ) : null;

  const fieldChips = (
    <div>
      <p className="mb-1.5 text-caption font-medium text-on-surface-variant" id="email-field-chips">
        Insert into {target === "subject" ? "subject" : "message"}
      </p>
      <div role="group" aria-labelledby="email-field-chips" className="mobile-scroll-x flex flex-wrap gap-1.5 max-lg:-mx-4 max-lg:flex-nowrap max-lg:px-4">
        {EMAIL_FIELDS.map((f) => (
          <button
            key={f.key}
            type="button"
            // Keep the caret where it is in the field being edited
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertField(f.key)}
            title={`Insert {{${f.key}}}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-outline-variant bg-surface px-2 py-1 text-caption text-on-surface-variant outline-none transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-11 max-lg:rounded-full max-lg:px-3 max-lg:text-label"
          >
            <Plus className="h-3 w-3 opacity-60" aria-hidden />
            <span className="font-medium">{f.label}</span>
            <span className="font-mono opacity-40 max-lg:hidden">{`{{${f.key}}}`}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const nameField = (
    <div>
      <Label htmlFor="email-template-name" className={LABEL_CLASS}>
        Name *
      </Label>
      <Input
        id="email-template-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={NAME_MAX}
        placeholder="e.g. Welcome"
        autoFocus={!isMobile}
      />
    </div>
  );

  const messageFields = (
    <>
      <div>
        <Label htmlFor="email-template-subject" className={LABEL_CLASS}>
          Subject *
        </Label>
        <Input
          id="email-template-subject"
          ref={subjectRef}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onFocus={() => setTarget("subject")}
          maxLength={SUBJECT_MAX}
          placeholder="Hi {{name}} 👋"
        />
      </div>
      <div>
        <Label htmlFor="email-template-body" className={LABEL_CLASS}>
          Message *
          <span className="ml-2 font-normal opacity-60">— a blank line starts a new paragraph</span>
        </Label>
        <textarea
          id="email-template-body"
          ref={bodyRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setTarget("body")}
          rows={10}
          placeholder={"Hi {{name}},\n\nThanks for visiting our site! Here's 10% off your first order."}
          className={`${TEXTAREA_CLASS} resize-y`}
        />
        <p className="mt-1 text-right text-caption tabular-nums text-on-surface-variant/50">
          {body.length.toLocaleString("en-IN")} / 20,000
        </p>
      </div>
      {fieldChips}
    </>
  );

  // Phones: one plain column inside the sheet
  const formFields = (
    <>
      {nameField}
      {messageFields}
      <FormError message={formError} />
    </>
  );

  const livePreview = (
    <TemplatePreviewPanel>
      <EmailPreview fromName={fromName} fromAddress={fromAddress} subject={subject} body={body} />
      {connectHint}
    </TemplatePreviewPanel>
  );

  const content = isLoading ? (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  ) : isError ? (
    <LoadError what="email templates" onRetry={() => refetch()} />
  ) : (
    <>
      {templates && templates.length > 0 ? (
        <DataTable
          label="Email templates"
          columns={columns}
          rows={templates}
          rowKey={(tpl) => tpl.id}
          rowLabel={(tpl) => tpl.name}
          mobileListClassName="mx-0 mt-0 mb-0"
          renderMobileRow={(tpl) => (
            <button
              type="button"
              onClick={() => openExisting(tpl, "preview")}
              className="flex min-h-11 w-full flex-col gap-0.5 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus active:bg-surface-container"
            >
              <span className="w-full truncate text-body font-semibold text-on-surface">{tpl.name}</span>
              <span className="block w-full truncate text-label text-on-surface-variant">{tpl.subject || "—"}</span>
            </button>
          )}
        />
      ) : (
        <EmptyState
          icon={<Mail className="h-8 w-8" />}
          title="No email templates yet"
          description="Write an email once and reuse it in campaigns, sequences and automations"
          actionLabel="New email template"
          onAction={openNew}
        />
      )}
    </>
  );

  return (
    <div className="space-y-4 max-lg:px-4 max-lg:pb-4 lg:p-6">
      <MobilePageActions primary={{ label: "New email template", onClick: openNew }} />
      <PageHeader
        title="Templates"
        className="max-lg:hidden"
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> New email template
          </Button>
        }
      />

      {channelTabs}

      <div {...channelPanelProps("email")}>{content}</div>

      {/* Desktop: large dialog, form left and live preview right (like New Campaign) */}
      {!isMobile && (
        <TemplateEditorModal
          open={showForm}
          onClose={closeForm}
          dismissible={!saving && !showAi}
          titleId="email-template-modal-title"
          title={editId ? "Edit email template" : "New email template"}
          icon={<Mail className="h-4 w-4" />}
          preview={livePreview}
          error={formError}
          onSave={handleSave}
          saving={saving}
          saveLabel={editId ? "Save changes" : "Create template"}
        >
          <div className="space-y-3">
            <SectionHeading
              icon={<Tag className="h-3.5 w-3.5" />}
              label="Details"
              action={<WriteWithAiButton onClick={openAi} />}
            />
            {nameField}
          </div>
          <div className="space-y-3">
            <SectionHeading icon={<MessageSquare className="h-3.5 w-3.5" />} label="Message" />
            {messageFields}
          </div>
        </TemplateEditorModal>
      )}

      {/* Phones: full-height sheet with Edit | Preview */}
      {isMobile && (
        <Modal
          open={showForm}
          onClose={closeForm}
          dismissible={!saving && !showAi}
          aria-labelledby="email-template-form-title"
          className="flex h-[calc(100dvh-var(--safe-top)-12px)] flex-col"
        >
          {() => (
            <>
              <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-2">
                <h2 id="email-template-form-title" className="text-body-lg font-semibold text-on-surface">
                  {editId ? "Edit email template" : "New email template"}
                </h2>
                {mobileView === "edit" && <WriteWithAiButton onClick={openAi} className="min-h-11" />}
              </div>
              <div className="px-4 pb-3">
                <EditPreviewSwitch value={mobileView} onChange={setMobileView} />
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
                {mobileView === "preview" ? livePreview : formFields}
              </div>
              <ModalFooter className="flex gap-2 border-t border-outline-variant px-4 pt-3">
                {editId && (
                  <IconButton
                    variant="danger"
                    className="min-h-11 min-w-11"
                    aria-label="Delete template"
                    title="Delete template"
                    onClick={() => {
                      const tpl = templates?.find((t) => t.id === editId);
                      if (tpl) setDeleteTarget(tpl);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
                <Button variant="ghost" size="lg" onClick={closeForm} className="flex-1">
                  Cancel
                </Button>
                <Button size="lg" onClick={handleSave} disabled={saving} loading={saving} className="flex-1">
                  {editId ? "Save changes" : "Create template"}
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      )}

      <AiWriteModal
        open={showAi}
        onClose={closeAi}
        titleId="email-ai-modal-title"
        title="Write email with AI"
        promptId="email-ai-prompt"
        promptLabel="What should this email say? *"
        placeholder="e.g. Diwali offer 20% off"
        prompt={aiPrompt}
        onPromptChange={setAiPrompt}
        onGenerate={handleGenerate}
        pending={generateEmail.isPending}
        error={aiError}
        hint={
          subject || body
            ? "AI replaces the subject and message. Review before saving. Uses AI credits."
            : "AI writes the subject and message. Review before saving. Uses AI credits."
        }
      >
        <div>
          <label htmlFor="email-ai-language" className="mb-1.5 block text-caption font-medium text-on-surface-variant">
            Language
          </label>
          <Select id="email-ai-language" value={aiLanguage} onValueChange={setAiLanguage}>
            {TEMPLATE_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </Select>
        </div>
      </AiWriteModal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete email template"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteTemplate.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          const id = deleteTarget.id;
          deleteTemplate.mutate(id, {
            onSuccess: () => {
              toast.success("Template deleted");
              setDeleteTarget(null);
              if (editId === id) closeForm();
            },
            onError: (err) => toast.error(apiErrorMessage(err, "Couldn't delete the template.")),
          });
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
