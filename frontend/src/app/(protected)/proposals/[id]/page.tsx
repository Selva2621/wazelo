"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, FileDown, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useDeleteProposal,
  useDraftProposal,
  useProposal,
  useSendProposal,
  useShareProposal,
  useImproveSection,
  useUpdateProposal,
} from "@/hooks/use-proposals";
import { useProducts } from "@/hooks/use-products";
import { useProductTerms } from "@/lib/product-terms";
import { useOrgSettings } from "@/hooks/use-settings";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { proposalsApi, type Proposal, type ProposalEdits, type ProposalItem } from "@/lib/api/proposals";
import { ProposalDocument, money } from "@/components/proposals/proposal-document";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { PageHeader } from "@/components/layout/page-header";

/* ─── Form state: numbers stay strings while typing ─── */

interface ItemRow {
  key: number;
  name: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface Form {
  title: string;
  intro: string;
  scopeText: string;
  items: ItemRow[];
  taxPercent: string;
  discount: string;
  terms: string;
  validUntil: string;
}

let rowKey = 0;
const row = (i?: Partial<ProposalItem>): ItemRow => ({
  key: ++rowKey,
  name: i?.name ?? "",
  description: i?.description ?? "",
  quantity: String(i?.quantity ?? 1),
  unitPrice: i?.unitPrice ? String(i.unitPrice) : "",
});

const fromProposal = (p: Proposal): Form => ({
  title: p.title,
  intro: p.intro ?? "",
  scopeText: p.scope.join("\n"),
  items: p.items.map(row),
  taxPercent: p.taxPercent ? String(p.taxPercent) : "",
  discount: p.totals.discount ? String(p.totals.discount) : "",
  terms: p.terms ?? "",
  validUntil: p.validUntil ? p.validUntil.slice(0, 10) : "",
});

const num = (s: string) => {
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

function itemsOf(form: Form): ProposalItem[] {
  return form.items
    .filter((r) => r.name.trim())
    .map((r) => ({
      name: r.name.trim(),
      ...(r.description.trim() && { description: r.description.trim() }),
      quantity: Math.max(round2(num(r.quantity)) || 1, 0.01),
      unitPrice: Math.max(round2(num(r.unitPrice)), 0),
    }));
}

function toEdits(form: Form): ProposalEdits {
  return {
    title: form.title,
    intro: form.intro,
    scope: form.scopeText.split("\n").map((s) => s.trim()).filter(Boolean),
    items: itemsOf(form),
    taxPercent: Math.min(Math.max(round2(num(form.taxPercent)), 0), 100),
    discount: Math.max(round2(num(form.discount)), 0),
    terms: form.terms,
    // Noon UTC keeps the chosen day in every timezone
    validUntil: form.validUntil ? `${form.validUntil}T12:00:00.000Z` : null,
  };
}

/** Same math as the server (minor units), for the live preview. */
function totalsOf(items: ProposalItem[], taxPercent: number, discount: number) {
  const minor = (n: number) => Math.round(n * 100);
  const subtotal = items.reduce((s, i) => s + Math.round(i.quantity * minor(i.unitPrice)), 0);
  const off = Math.min(Math.max(minor(discount), 0), subtotal);
  const tax = Math.round(((subtotal - off) * Math.max(taxPercent, 0)) / 100);
  return { subtotal: subtotal / 100, discount: off / 100, tax: tax / 100, total: (subtotal - off + tax) / 100 };
}

/* ─── Bits ─── */

type Section = "intro" | "scope" | "terms";
const SECTION_FIELD = { intro: "intro", scope: "scopeText", terms: "terms" } as const satisfies Record<Section, keyof Form>;

const field =
  "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60";
const labelCls = "text-label font-medium text-on-surface";
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

function errorMessage(err: unknown, fallback: string) {
  return (err as { message?: string })?.message || fallback;
}

/* ─── Editor ─── */

function Editor({ proposal }: { proposal: Proposal }) {
  const router = useRouter();
  const update = useUpdateProposal();
  const draft = useDraftProposal();
  const send = useSendProposal();
  const share = useShareProposal();
  const remove = useDeleteProposal();
  const { data: products } = useProducts();
  const terms = useProductTerms();
  const { data: org } = useOrgSettings();
  const { data: credits } = useAiCredits();
  const draftCost = credits?.costs?.find((c) => c.action === "proposal_draft")?.cost ?? 2;

  const [form, setForm] = useState<Form>(() => fromProposal(proposal));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const improve = useImproveSection();
  const improveCost = credits?.costs?.find((c) => c.action === "proposal_improve")?.cost ?? 1;
  const [improving, setImproving] = useState<Section | null>(null);
  const [undo, setUndo] = useState<{ section: Section; text: string } | null>(null);
  // Bumped on every edit; a save only marks "saved" if nothing changed meanwhile
  const version = useRef(0);
  const [savedVersion, setSavedVersion] = useState(0);
  const [editVersion, setEditVersion] = useState(0);
  const dirty = editVersion !== savedVersion;
  const locked = proposal.status === "ACCEPTED";

  const edit = (patch: Partial<Form>) => {
    version.current += 1;
    setEditVersion(version.current);
    setForm((f) => ({ ...f, ...patch }));
  };
  const editRow = (key: number, patch: Partial<ItemRow>) =>
    edit({ items: form.items.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

  const save = (): Promise<unknown> => {
    const v = version.current;
    return update.mutateAsync({ id: proposal.id, ...toEdits(form) }).then(
      () => setSavedVersion((s) => Math.max(s, v)),
      (err) => toast.error(errorMessage(err, "Couldn't save")),
    );
  };

  // Autosave a moment after typing stops
  useEffect(() => {
    if (!dirty || locked) return;
    const t = setTimeout(() => void save(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, dirty, locked]);

  const runDraft = () =>
    draft.mutate(proposal.id, {
      onSuccess: (p) => {
        setForm(fromProposal(p));
        setUndo(null);
        version.current += 1;
        setEditVersion(version.current);
        setSavedVersion(version.current);
        toast.success("Draft written. Check the prices before sending.");
      },
      onError: (err) => toast.error(errorMessage(err, "Couldn't write the draft")),
    });

  const runSend = async () => {
    if (dirty) await save();
    send.mutate(proposal.id, {
      onSuccess: () => toast.success(`Sent to ${proposal.contact.name || proposal.contact.phoneNumber} on WhatsApp`),
      onError: (err) => {
        const message = errorMessage(err, "Couldn't send");
        toast.error(
          message,
          /whatsapp/i.test(message)
            ? { duration: 8000, description: "Or copy the link and send it yourself.", action: { label: "Connect", onClick: () => router.push("/settings/whatsapp") } }
            : undefined,
        );
      },
    });
  };

  const [downloading, setDownloading] = useState(false);
  const downloadPdf = async () => {
    setDownloading(true);
    try {
      if (dirty) await save();
      await proposalsApi.downloadPdf(proposal.id, `Proposal ${proposal.number}.pdf`);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't make the PDF"));
    } finally {
      setDownloading(false);
    }
  };

  // Share the link yourself (any app): a draft becomes "sent" so the link opens
  const copyLink = async () => {
    try {
      if (dirty) await save();
      if (proposal.status === "DRAFT" || proposal.status === "CHANGES_REQUESTED") await share.mutateAsync(proposal.id);
      await navigator.clipboard.writeText(proposal.publicUrl);
      toast.success("Link copied. Paste it in any chat.");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't copy the link"));
    }
  };

  // "Improve" on one section: AI rewrite of the text as typed, with one-step undo
  const runImprove = (section: Section) => {
    const key = SECTION_FIELD[section];
    const before = form[key];
    setImproving(section);
    improve.mutate(
      { id: proposal.id, section, text: before },
      {
        onSuccess: ({ text }) => {
          edit({ [key]: text });
          setUndo({ section, text: before });
        },
        onError: (err) => toast.error(errorMessage(err, "Couldn't improve it")),
        onSettled: () => setImproving(null),
      },
    );
  };

  const sectionLabel = (htmlFor: string, label: string, section: Section) => (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className={labelCls}>{label}</label>
      {!locked && (
        <div className="flex items-center gap-3">
          {undo?.section === section && (
            <button
              type="button"
              className="text-label text-on-surface-variant underline-offset-2 hover:text-on-surface hover:underline"
              onClick={() => {
                edit({ [SECTION_FIELD[section]]: undo.text });
                setUndo(null);
              }}
            >
              Undo
            </button>
          )}
          <button
            type="button"
            disabled={!!improving || busy || form[SECTION_FIELD[section]].trim().length < 10}
            onClick={() => runImprove(section)}
            title={form[SECTION_FIELD[section]].trim().length < 10 ? "Write a little first" : undefined}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-label font-medium text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:text-on-surface-variant disabled:opacity-50 disabled:hover:bg-transparent"
          >
            {improving === section ? <Spinner size="sm" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
            Improve · {improveCost}
          </button>
        </div>
      )}
    </div>
  );

  const items = itemsOf(form);
  const edits = toEdits(form);
  const preview = useMemo(
    () => ({
      number: proposal.number,
      title: form.title,
      intro: form.intro || null,
      scope: edits.scope ?? [],
      items,
      taxPercent: edits.taxPercent ?? 0,
      currency: proposal.currency,
      totals: totalsOf(items, edits.taxPercent ?? 0, edits.discount ?? 0),
      terms: form.terms || null,
      validUntil: edits.validUntil ?? null,
      issuedAt: proposal.sentAt ?? new Date().toISOString(),
      clientName: proposal.contact.name,
      businessName: org?.name || "Your business",
      businessWebsite: org?.website || null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, org, proposal.number, proposal.currency, proposal.sentAt, proposal.contact.name],
  );
  const missingPrices = items.some((i) => i.unitPrice === 0);
  const sentBefore = proposal.status !== "DRAFT";
  const busy = draft.isPending || send.isPending;

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      {/* Mobile: Send is the nav bar button, the rest sit in its "…" menu */}
      <MobilePageActions
        primary={
          !locked && !busy && items.length > 0
            ? { label: sentBefore ? "Send again" : "Send on WhatsApp", onClick: runSend, icon: <Send className="h-[22px] w-[22px]" aria-hidden /> }
            : undefined
        }
        moreTitle={`Proposal ${proposal.number}`}
        more={[
          !locked && { label: `Write with AI · ${draftCost} credits`, onSelect: runDraft, disabled: busy || update.isPending },
          (!locked || sentBefore) && {
            label: "Copy client link",
            onSelect: copyLink,
            disabled: busy || share.isPending || (!sentBefore && !items.length),
          },
          items.length > 0 && { label: "Download PDF", onSelect: downloadPdf, disabled: downloading },
          sentBefore && { label: "Open client page", onSelect: () => window.open(proposal.publicUrl, "_blank", "noopener") },
          proposal.status === "DRAFT" && { label: "Delete", onSelect: () => setConfirmDelete(true), destructive: true },
        ]}
      />

      {/* Top bar */}
      <Link href="/proposals" className="inline-flex items-center gap-1 rounded text-label text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus max-lg:hidden">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Proposals
      </Link>
      <PageHeader
        title={proposal.number}
        description={
          <span className="flex items-center gap-2">
            <ProposalStatusBadge status={proposal.status} expired={proposal.expired} />
            <span className="text-label text-on-surface-variant" aria-live="polite">
              {locked ? "" : update.isPending ? "Saving…" : dirty ? "Unsaved" : "Saved"}
            </span>
          </span>
        }
        actions={
        <div className="flex flex-wrap items-center gap-2 max-lg:hidden">
          {!locked && (
            <Button variant="secondary" size="sm" onClick={runDraft} loading={draft.isPending} disabled={busy || update.isPending}>
              <Sparkles className="h-4 w-4" aria-hidden />
              Write with AI · {draftCost} credits
            </Button>
          )}
          {!locked || sentBefore ? (
            <IconButton
              aria-label="Copy client link"
              title={sentBefore ? "Copy client link" : "Copy link to send yourself"}
              disabled={busy || share.isPending || (!sentBefore && !items.length)}
              onClick={copyLink}
            >
              <Copy className="h-4 w-4" />
            </IconButton>
          ) : null}
          {items.length > 0 && (
            <IconButton aria-label="Download PDF" title="Download PDF" disabled={downloading} onClick={downloadPdf}>
              {downloading ? <Spinner size="sm" /> : <FileDown className="h-4 w-4" />}
            </IconButton>
          )}
          {sentBefore && (
            <IconButton aria-label="Open client page" title="Open client page" onClick={() => window.open(proposal.publicUrl, "_blank", "noopener")}>
              <ExternalLink className="h-4 w-4" />
            </IconButton>
          )}
          {!locked && (
            <Button size="sm" onClick={runSend} loading={send.isPending} disabled={busy || !items.length}>
              <Send className="h-4 w-4" aria-hidden />
              {sentBefore ? "Send again" : "Send on WhatsApp"}
            </Button>
          )}
          {proposal.status === "DRAFT" && (
            <IconButton aria-label="Delete proposal" title="Delete" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
        </div>
        }
      />

      {/* What the client did */}
      {proposal.status === "CHANGES_REQUESTED" && (
        <div role="status" className="rounded-lg border border-warning/40 bg-warning-container px-4 py-3 text-body text-on-surface">
          <p className="font-medium">{proposal.contact.name || "The client"} asked for changes · {when(proposal.respondedAt)}</p>
          {proposal.responseNote && <p className="mt-1 whitespace-pre-line">&ldquo;{proposal.responseNote}&rdquo;</p>}
          <p className="mt-1 text-label text-on-surface-variant">Edit below, then send again.</p>
        </div>
      )}
      {proposal.status === "ACCEPTED" && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-success/40 bg-success-container px-4 py-3 text-body text-on-surface">
          <Check className="h-4 w-4 text-success" aria-hidden />
          Accepted by {proposal.acceptedBy || proposal.contact.name} · {when(proposal.respondedAt)}
          {proposal.deal && <span className="text-on-surface-variant"> · deal marked won</span>}
        </div>
      )}
      {(proposal.status === "SENT" || proposal.status === "VIEWED") && (
        <p className="text-label text-on-surface-variant">
          Sent {when(proposal.sentAt)}
          {proposal.viewedAt ? ` · opened ${when(proposal.viewedAt)}` : " · not opened yet"}. Changes you make show on the client&apos;s link right away.
        </p>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Form */}
        <fieldset data-tour="proposal-form" disabled={locked} className="min-w-0 space-y-5 rounded-xl border border-outline-variant bg-surface-container-low p-5 max-lg:p-4">
          <legend className="sr-only">Proposal details</legend>
          <p className="text-label text-on-surface-variant">
            For <span className="font-medium text-on-surface">{proposal.contact.name || proposal.contact.phoneNumber}</span>
            {proposal.deal && <> · deal: {proposal.deal.title}</>}
          </p>

          <div className="space-y-1.5">
            <label htmlFor="p-title" className={labelCls}>Title</label>
            <Input id="p-title" value={form.title} maxLength={300} onChange={(e) => edit({ title: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            {sectionLabel("p-intro", "Intro", "intro")}
            <textarea
              id="p-intro"
              rows={3}
              value={form.intro}
              maxLength={4000}
              onChange={(e) => edit({ intro: e.target.value })}
              placeholder="Hi Priya, thanks for the chat. Here's what we'll do…"
              className={cn(field, "resize-y")}
            />
          </div>

          <div className="space-y-1.5">
            {sectionLabel("p-scope", "What's included", "scope")}
            <textarea
              id="p-scope"
              rows={4}
              value={form.scopeText}
              onChange={(e) => edit({ scopeText: e.target.value })}
              placeholder={"One point per line\n5-page website\nWhatsApp order button"}
              className={cn(field, "resize-y")}
            />
          </div>

          {/* Items */}
          <div data-tour="proposal-items" className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p id="items-label" className={labelCls}>Items</p>
              {missingPrices && <p className="text-label text-warning">Some items have no price</p>}
            </div>
            <ul aria-labelledby="items-label" className="space-y-2">
              {form.items.map((r) => (
                <li key={r.key} className="rounded-lg border border-outline-variant bg-surface p-2.5">
                  <div className="flex gap-2">
                    <Input
                      aria-label="Item name"
                      placeholder="Item"
                      value={r.name}
                      maxLength={200}
                      onChange={(e) => editRow(r.key, { name: e.target.value })}
                    />
                    <IconButton aria-label={`Remove ${r.name || "item"}`} onClick={() => edit({ items: form.items.filter((x) => x.key !== r.key) })}>
                      <X className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_5rem_8rem] gap-2 max-lg:grid-cols-[5rem_1fr] max-lg:[&>:first-child]:col-span-2">
                    <Input
                      aria-label="Description"
                      placeholder="Description (optional)"
                      value={r.description}
                      maxLength={500}
                      onChange={(e) => editRow(r.key, { description: e.target.value })}
                    />
                    <Input
                      aria-label="Quantity"
                      inputMode="decimal"
                      value={r.quantity}
                      onChange={(e) => editRow(r.key, { quantity: e.target.value })}
                      className="text-right"
                    />
                    <Input
                      aria-label={`Price (${proposal.currency})`}
                      inputMode="decimal"
                      placeholder="Price"
                      value={r.unitPrice}
                      onChange={(e) => editRow(r.key, { unitPrice: e.target.value })}
                      className={cn("text-right", r.name && !num(r.unitPrice) && "border-warning")}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => edit({ items: [...form.items, row()] })}>
                <Plus className="h-4 w-4" aria-hidden /> Add item
              </Button>
              {!!products?.length && (
                <select
                  aria-label={`Add from your ${terms.plural}`}
                  value=""
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) edit({ items: [...form.items, row({ name: p.name, unitPrice: p.price ? Number(p.price) : 0 })] });
                  }}
                  className="rounded-lg border border-outline-variant bg-surface px-2 py-1.5 text-label text-on-surface outline-none focus:border-primary"
                >
                  <option value="">Add from {terms.plural}…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.price ? ` · ${money(Number(p.price), p.currency || proposal.currency)}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label htmlFor="p-tax" className={labelCls}>Tax %</label>
              <Input id="p-tax" inputMode="decimal" placeholder="0" value={form.taxPercent} onChange={(e) => edit({ taxPercent: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="p-discount" className={labelCls}>Discount</label>
              <Input id="p-discount" inputMode="decimal" placeholder="0" value={form.discount} onChange={(e) => edit({ discount: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <label htmlFor="p-valid" className={labelCls}>Valid till</label>
              <Input id="p-valid" type="date" value={form.validUntil} onChange={(e) => edit({ validUntil: e.target.value })} />
            </div>
          </div>

          <div className="space-y-1.5">
            {sectionLabel("p-terms", "Terms", "terms")}
            <textarea
              id="p-terms"
              rows={3}
              value={form.terms}
              maxLength={4000}
              onChange={(e) => edit({ terms: e.target.value })}
              placeholder="50% advance to start, balance on delivery. 2 rounds of revisions."
              className={cn(field, "resize-y")}
            />
          </div>
        </fieldset>

        {/* Live preview */}
        <section aria-label="Preview" data-tour="proposal-preview" className="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
          <p className="mb-2 text-label text-on-surface-variant">What {proposal.contact.name?.split(" ")[0] || "your client"} sees</p>
          <div className="max-h-[calc(100dvh-var(--header-height)-6rem)] overflow-y-auto rounded-xl border border-outline-variant shadow-sm">
            <ProposalDocument data={preview} headingLevel="h2" className="p-6 sm:p-8" />
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this draft?"
        message="The proposal will be removed. This can't be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          remove.mutate(proposal.id, {
            onSuccess: () => router.push("/proposals"),
            onError: (err) => toast.error(errorMessage(err, "Couldn't delete")),
          })
        }
      />
    </div>
  );
}

export default function ProposalEditorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: proposal, isLoading, isError } = useProposal(id);
  usePageTitle(proposal ? `Proposal ${proposal.number}` : "Proposal");

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }
  if (isError || !proposal) {
    return (
      <div className="mx-auto max-w-md space-y-3 py-24 text-center">
        <p className="text-body text-on-surface">This proposal doesn&apos;t exist or was deleted.</p>
        <Link href="/proposals" className="text-primary hover:underline">Back to proposals</Link>
      </div>
    );
  }
  // Remount when switching proposals so the form starts from the right one
  return <Editor key={proposal.id} proposal={proposal} />;
}
