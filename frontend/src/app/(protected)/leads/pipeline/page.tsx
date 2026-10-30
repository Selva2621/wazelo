"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { usePipelines, useCreateDeal } from "@/hooks/use-deals";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { ContactDetailDrawer } from "@/components/contacts/contact-detail-drawer";
import { contactKeys, useContactGroups, useContacts } from "@/hooks/use-contacts";
import { contactsApi } from "@/lib/api/contacts";
import { useContactsStore } from "@/stores/contacts-store";
import { CONTACT_SOURCE_LABELS, SCRAPE_SOURCE_LABELS } from "@/lib/constants/contact-sources";
import type { LeadStatus, Contact, ContactSource, ContactListResponse, ListContactsParams } from "@/lib/types/contacts";
import { SwipeColumnChips, useSwipeColumns } from "@/components/ui/swipe-columns";

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "NEW",        label: "New",        color: "var(--info)" },
  { status: "CONTACTED",  label: "Contacted",  color: "var(--primary-container)" },
  { status: "INTERESTED", label: "Interested", color: "var(--warning)" },
  { status: "CONVERTED",  label: "Converted",  color: "var(--success)" },
  { status: "CLOSED",     label: "Closed",     color: "var(--on-surface-variant)" },
];
const LABEL = Object.fromEntries(COLUMNS.map((c) => [c.status, c.label])) as Record<LeadStatus, string>;

/** Cards loaded per column, and per "Show more" */
const PAGE = 50;

function errorText(err: unknown, fallback: string) {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(msg) ? msg[0] : msg) || fallback;
}

// ─── Moving a lead (instant, undone if the server refuses) ───────────────────

function useMoveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contact, to }: { contact: Contact; to: LeadStatus }) =>
      contactsApi.changeStatus(contact.id, { status: to }),
    onMutate: async ({ contact, to }) => {
      await qc.cancelQueries({ queryKey: ["contacts", "list"] });
      const snapshot = qc.getQueriesData<ContactListResponse>({ queryKey: ["contacts", "list"] });
      for (const [key, data] of snapshot) {
        if (!data) continue;
        const params = (key[2] ?? {}) as ListContactsParams;
        if (!params.leadStatus) continue;
        if (params.leadStatus === contact.leadStatus) {
          // Leave the old column
          qc.setQueryData<ContactListResponse>(key, {
            ...data,
            contacts: data.contacts.filter((c) => c.id !== contact.id),
            total: Math.max(0, data.total - 1),
          });
        } else if (params.leadStatus === to && (!params.source || params.source === contact.source)) {
          // Arrive at the top of the new one
          qc.setQueryData<ContactListResponse>(key, {
            ...data,
            contacts: [{ ...contact, leadStatus: to }, ...data.contacts.filter((c) => c.id !== contact.id)],
            total: data.total + 1,
          });
        }
      }
      return { snapshot };
    },
    onError: (err, { contact }, ctx) => {
      for (const [key, data] of ctx?.snapshot ?? []) qc.setQueryData(key, data);
      toast.error(errorText(err, `Couldn't move ${contact.name || contact.phoneNumber}. It's back where it was.`));
    },
    onSettled: (_data, _err, { contact }) => {
      qc.invalidateQueries({ queryKey: contactKeys.all });
      qc.invalidateQueries({ queryKey: contactKeys.statusHistory(contact.id) });
    },
  });
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function PipelineCard({
  contact,
  onDragStart,
  onOpen,
  onConvert,
  converting,
}: {
  contact: Contact;
  onDragStart: (e: React.DragEvent, contact: Contact) => void;
  onOpen: (id: string) => void;
  onConvert?: (contact: Contact) => void;
  converting: boolean;
}) {
  const meta = contact.metadata as Record<string, unknown> | null;
  const scrapeSource = meta?.scrapeSource as keyof typeof SCRAPE_SOURCE_LABELS | undefined;
  const rating = meta?.rating as number | undefined;
  const name = contact.name || "Unknown";
  const sourceLabel =
    scrapeSource && SCRAPE_SOURCE_LABELS[scrapeSource]
      ? SCRAPE_SOURCE_LABELS[scrapeSource]
      : CONTACT_SOURCE_LABELS[contact.source];
  // Converted and closed leads are done: no new deal from them
  const canConvert = !!onConvert && contact.leadStatus !== "CONVERTED" && contact.leadStatus !== "CLOSED";

  return (
    <li
      draggable
      onDragStart={(e) => onDragStart(e, contact)}
      className="list-none cursor-grab active:cursor-grabbing bg-surface-container-lowest rounded-xl p-3 border border-outline-variant hover:border-outline transition-colors space-y-2"
    >
      {/* Avatar + name: opens the lead */}
      <button
        type="button"
        onClick={() => onOpen(contact.id)}
        className="flex w-full min-w-0 items-center gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Avatar name={contact.name || contact.phoneNumber} src={contact.avatarUrl} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body font-medium text-on-surface">{name}</span>
          <span className="block truncate text-caption text-on-surface-variant">{contact.phoneNumber}</span>
        </span>
      </button>

      {/* Where it came from */}
      <div className="flex flex-wrap items-center gap-1.5">
        {sourceLabel && (
          <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-caption text-on-surface-variant">
            {sourceLabel}
          </span>
        )}
        {rating != null && (
          <span className="text-caption font-medium text-on-surface-variant">Rating {rating.toFixed(1)}</span>
        )}
      </div>

      {canConvert && (
        <button
          type="button"
          disabled={converting}
          onClick={() => onConvert?.(contact)}
          className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-outline-variant/40 text-caption font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {converting ? <Spinner size="sm" /> : <Briefcase className="h-3 w-3" aria-hidden />}
          {converting ? "Converting…" : "Convert to deal"}
        </button>
      )}
    </li>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function PipelineColumn({
  status,
  label,
  color,
  baseFilter,
  onDragStart,
  onDrop,
  onOpen,
  onConvert,
  convertingId,
  onTotal,
}: {
  status: LeadStatus;
  label: string;
  color: string;
  baseFilter: ListContactsParams;
  onDragStart: (e: React.DragEvent, contact: Contact) => void;
  onDrop: (status: LeadStatus) => void;
  onOpen: (id: string) => void;
  onConvert?: (contact: Contact) => void;
  convertingId: string | null;
  /** Reports the column's lead count (for the phone stage chips) */
  onTotal: (status: LeadStatus, total: number | null) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const { data, isLoading, isError, isFetching } = useContacts({ ...baseFilter, leadStatus: status, take: limit });
  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;
  const headingId = `col-${status}`;
  const shownTotal = isLoading ? null : total;
  useEffect(() => {
    onTotal(status, shownTotal);
  }, [onTotal, status, shownTotal]);

  return (
    <section
      aria-labelledby={headingId}
      id={`swipe-col-${status}`}
      data-swipe-column
      // Phones: full width, as tall as its leads (scrolls inside past the screen)
      className={`flex flex-col w-[272px] shrink-0 rounded-xl border transition-colors max-lg:w-[calc(100vw-32px)] max-lg:max-h-full max-lg:snap-start max-lg:snap-always ${
        isDragOver ? "border-primary/40 bg-primary/5" : "border-outline-variant/10 bg-surface-container/40"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(status);
      }}
    >
      {/* Column header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-outline-variant/10 px-3.5 py-3">
        <div aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <h2 id={headingId} className="text-body font-semibold text-on-surface">
          {label}
        </h2>
        <Badge variant="muted" className="ml-auto text-caption">
          <span className="sr-only">Leads: </span>
          {isLoading ? "…" : total}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" className="text-on-surface-variant/40" />
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-label text-error" role="alert">
            Couldn&apos;t load these leads.
          </p>
        ) : contacts.length === 0 ? (
          <p className="py-8 text-center text-label text-on-surface-variant max-lg:py-5">No leads</p>
        ) : (
          <>
            <ul className="space-y-2">
              {contacts.map((c) => (
                <PipelineCard
                  key={c.id}
                  contact={c}
                  onDragStart={onDragStart}
                  onOpen={onOpen}
                  onConvert={onConvert}
                  converting={convertingId === c.id}
                />
              ))}
            </ul>
            {contacts.length < total && (
              <button
                type="button"
                disabled={isFetching}
                onClick={() => setLimit((n) => n + PAGE)}
                className="mt-2 w-full rounded-lg py-2 text-label font-medium text-primary hover:bg-primary/5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                {isFetching ? "Loading…" : `Show more (${total - contacts.length} left)`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeadPipelinePage() {
  const [dragged, setDragged] = useState<Contact | null>(null);
  const [source, setSource] = useState<ContactSource | "">("");
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const moveLead = useMoveLead();
  const { data: groups } = useContactGroups();
  const openContactDetail = useContactsStore((s) => s.openContactDetail);
  const closeContactDetail = useContactsStore((s) => s.closeContactDetail);
  const selectedContactId = useContactsStore((s) => s.selectedContactId);
  const detailDrawerOpen = useContactsStore((s) => s.detailDrawerOpen);

  const move = (contact: Contact, to: LeadStatus) => {
    if (contact.leadStatus === to) return;
    moveLead.mutate({ contact, to });
  };

  const handleDragStart = (e: React.DragEvent, contact: Contact) => {
    setDragged(contact);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (target: LeadStatus) => {
    if (dragged) move(dragged, target);
    setDragged(null);
  };

  // A lead that's turning into paid work becomes a deal in the default pipeline,
  // and moves to Converted so it can't be converted twice
  const { data: pipelines } = usePipelines();
  const createDeal = useCreateDeal();
  const convertPipeline = pipelines?.find((p) => p.isDefault) ?? pipelines?.[0];
  const firstStage = convertPipeline?.stages.slice().sort((a, b) => a.order - b.order)[0];

  const handleConvert = async (contact: Contact) => {
    if (!convertPipeline || !firstStage || convertingId) return;
    setConvertingId(contact.id);
    try {
      await createDeal.mutateAsync({
        pipelineId: convertPipeline.id,
        stageId: firstStage.id,
        contactId: contact.id,
        title: `${contact.name || contact.phoneNumber} — project`,
      });
      moveLead.mutate({ contact, to: "CONVERTED" });
    } catch {
      // useCreateDeal already showed the error
    } finally {
      setConvertingId(null);
    }
  };

  // All leads by default, like the dashboard; narrow by where they came from
  const baseFilter: ListContactsParams = source ? { source } : {};
  const sourceOptions = (groups?.sources ?? []).filter((g) => g.count > 0);
  const moved = moveLead.isSuccess ? moveLead.variables : undefined;

  // Phones: chips name every column with its count; swiping keeps them in step
  const { scrollerRef, onScroll: onBoardScroll, scrollTo: showColumn, active: activeColumn } = useSwipeColumns(COLUMNS.length);
  const [totals, setTotals] = useState<Partial<Record<LeadStatus, number | null>>>({});
  const reportTotal = useCallback((status: LeadStatus, total: number | null) => {
    setTotals((prev) => (prev[status] === total ? prev : { ...prev, [status]: total }));
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* The iOS nav bar shows the title on mobile */}
      <PageHeader
        className="shrink-0 px-6 pt-5 pb-1 max-lg:hidden"
        title="Lead pipeline"
        description="Drag a card to change its status, or open it to change it there"
      />

      <FilterBar className="shrink-0 px-6 pt-2 max-lg:px-4">
        <FilterSelect
          label="Lead source"
          active={!!source}
          value={source}
          onChange={(e) => setSource(e.target.value as ContactSource | "")}
        >
          <option value="">All sources</option>
          {sourceOptions.map((g) => (
            <option key={g.source} value={g.source}>
              {CONTACT_SOURCE_LABELS[g.source] ?? g.source} ({g.count})
            </option>
          ))}
        </FilterSelect>
        {/* Tells screen readers where a card went */}
        <span className="sr-only" aria-live="polite">
          {moved ? `${moved.contact.name || moved.contact.phoneNumber} moved to ${LABEL[moved.to]}` : ""}
        </span>
      </FilterBar>

      <SwipeColumnChips
        label="Lead statuses"
        active={activeColumn}
        onSelect={showColumn}
        className="shrink-0"
        chips={COLUMNS.map((col) => ({
          id: col.status,
          label: col.label,
          count: totals[col.status],
          color: col.color,
        }))}
      />

      {/* Kanban board */}
      {/* Mobile: one column per screen, swipe sideways with snap */}
      <div
        ref={scrollerRef}
        onScroll={onBoardScroll}
        className="flex-1 overflow-x-auto max-lg:snap-x max-lg:snap-mandatory max-lg:scroll-px-4 max-lg:overflow-y-hidden max-lg:[scrollbar-width:none] max-lg:[&::-webkit-scrollbar]:hidden"
      >
        <div className="flex h-full min-h-0 gap-4 p-6 max-lg:w-max max-lg:items-start max-lg:gap-3 max-lg:px-4 max-lg:pt-1 max-lg:pb-3">
          {COLUMNS.map((col) => (
            <PipelineColumn
              // A new source filter starts each column from its first page
              key={`${col.status}-${source}`}
              status={col.status}
              label={col.label}
              color={col.color}
              baseFilter={baseFilter}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onOpen={openContactDetail}
              onConvert={convertPipeline ? handleConvert : undefined}
              convertingId={convertingId}
              onTotal={reportTotal}
            />
          ))}
        </div>
      </div>

      <ContactDetailDrawer contactId={selectedContactId} open={detailDrawerOpen} onClose={closeContactDetail} />
    </div>
  );
}
