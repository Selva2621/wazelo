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
import { ActionSheet, type ActionSheetAction } from "@/components/ios/action-sheet";
import { StageChip, StageNote, StagePanel, StageRow, StageTabs } from "@/components/ui/swipe-columns";

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

function sourceLabelOf(contact: Contact) {
  const meta = contact.metadata as Record<string, unknown> | null;
  const scrapeSource = meta?.scrapeSource as keyof typeof SCRAPE_SOURCE_LABELS | undefined;
  return scrapeSource && SCRAPE_SOURCE_LABELS[scrapeSource]
    ? SCRAPE_SOURCE_LABELS[scrapeSource]
    : CONTACT_SOURCE_LABELS[contact.source];
}

function ratingOf(contact: Contact) {
  const meta = contact.metadata as Record<string, unknown> | null;
  return meta?.rating as number | undefined;
}

/** Converted and closed leads are done: no new deal from them */
function canConvertLead(contact: Contact) {
  return contact.leadStatus !== "CONVERTED" && contact.leadStatus !== "CLOSED";
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
  const rating = ratingOf(contact);
  const name = contact.name || "Unknown";
  const sourceLabel = sourceLabelOf(contact);
  const canConvert = !!onConvert && canConvertLead(contact);

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

// ─── Kanban Column (desktop) ──────────────────────────────────────────────────

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
  limit,
  onShowMore,
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
  /** Reports the column's lead count (for the phone stage tabs) */
  onTotal: (status: LeadStatus, total: number | null) => void;
  /** Leads loaded (grows with "Show more"); the phone list shares it */
  limit: number;
  onShowMore: (status: LeadStatus) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
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
      className={`flex flex-col w-[272px] shrink-0 rounded-xl border transition-colors ${
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
          <p className="py-8 text-center text-label text-on-surface-variant">No leads</p>
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
                onClick={() => onShowMore(status)}
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

// ─── Phone list (one status at a time) ───────────────────────────────────────

function PhoneLeadList({
  status,
  baseFilter,
  limit,
  onShowMore,
  onOpen,
  onMenu,
  convertingId,
}: {
  status: LeadStatus;
  baseFilter: ListContactsParams;
  limit: number;
  onShowMore: (status: LeadStatus) => void;
  onOpen: (id: string) => void;
  onMenu: (contact: Contact) => void;
  convertingId: string | null;
}) {
  // Same query as the desktop column, so it is shared, not fetched twice
  const { data, isLoading, isError, isFetching } = useContacts({ ...baseFilter, leadStatus: status, take: limit });
  const contacts = data?.contacts ?? [];
  const total = data?.total ?? 0;

  if (isLoading) {
    return (
      <StageNote role="status">
        <Spinner size="sm" className="text-on-surface-variant/40" />
        <span className="sr-only">Loading leads</span>
      </StageNote>
    );
  }
  if (isError) {
    return (
      <StageNote role="alert">
        <span className="text-error">Couldn&apos;t load these leads.</span>
      </StageNote>
    );
  }
  if (contacts.length === 0) return <StageNote>No {LABEL[status].toLowerCase()} leads</StageNote>;

  return (
    <>
      <ul className="bg-surface-container-lowest">
        {contacts.map((c) => {
          const sourceLabel = sourceLabelOf(c);
          const rating = ratingOf(c);
          const display = c.name || c.phoneNumber;
          return (
            <StageRow
              key={c.id}
              leading={<Avatar name={display} src={c.avatarUrl} size="md" />}
              title={c.name || "Unknown"}
              subtitle={c.phoneNumber}
              meta={
                (sourceLabel || rating != null || convertingId === c.id) && (
                  <>
                    {sourceLabel && <StageChip>{sourceLabel}</StageChip>}
                    {rating != null && (
                      <span className="text-caption text-on-surface-variant">Rating {rating.toFixed(1)}</span>
                    )}
                    {convertingId === c.id && <span className="text-caption text-primary">Converting…</span>}
                  </>
                )
              }
              onOpen={() => onOpen(c.id)}
              onMenu={() => onMenu(c)}
              menuLabel={`Actions for ${display}`}
            />
          );
        })}
      </ul>
      {contacts.length < total && (
        <div className="p-4">
          <button
            type="button"
            disabled={isFetching}
            onClick={() => onShowMore(status)}
            className="h-11 w-full rounded-lg text-label font-medium text-primary active:bg-primary/5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {isFetching ? "Loading…" : `Show more (${total - contacts.length} left)`}
          </button>
        </div>
      )}
    </>
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

  // Leads loaded per status ("Show more" adds a page); a new source filter starts over
  const [limits, setLimits] = useState<Partial<Record<LeadStatus, number>>>({});
  const showMore = useCallback((status: LeadStatus) => {
    setLimits((prev) => ({ ...prev, [status]: (prev[status] ?? PAGE) + PAGE }));
  }, []);

  // Phones: one status at a time, picked from tabs that show every status's count
  const [phoneStatus, setPhoneStatus] = useState<LeadStatus>("NEW");
  const [totals, setTotals] = useState<Partial<Record<LeadStatus, number | null>>>({});
  const reportTotal = useCallback((status: LeadStatus, total: number | null) => {
    setTotals((prev) => (prev[status] === total ? prev : { ...prev, [status]: total }));
  }, []);

  // Phones: a row's ⋮ menu replaces dragging and the card's buttons
  const [menuFor, setMenuFor] = useState<Contact | null>(null);
  const menuActions: ActionSheetAction[] = menuFor
    ? [
        ...(convertPipeline && canConvertLead(menuFor)
          ? [{ label: "Convert to deal", disabled: !!convertingId, onSelect: () => handleConvert(menuFor) }]
          : []),
        ...COLUMNS.filter((c) => c.status !== menuFor.leadStatus).map((c) => ({
          label: `Move to ${c.label}`,
          onSelect: () => move(menuFor, c.status),
        })),
      ]
    : [];

  return (
    <div className="flex h-full flex-col max-lg:h-[calc(100dvh-var(--header-height))] max-lg:min-w-0 max-lg:overflow-hidden">
      {/* The iOS nav bar shows the title on mobile */}
      <PageHeader
        className="shrink-0 px-6 pt-5 pb-1 max-lg:hidden"
        title="Lead pipeline"
        description="Drag a card to change its status, or open it to change it there"
      />

      <FilterBar className="shrink-0 px-6 pt-2 max-lg:px-4 max-lg:pb-1">
        <FilterSelect
          label="Lead source"
          active={!!source}
          value={source}
          onChange={(e) => {
            setSource(e.target.value as ContactSource | "");
            setLimits({});
          }}
          className="max-lg:max-w-full"
          wrapperClassName="max-lg:max-w-full"
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

      {/* Phones: status tabs (fixed) above the list (the only part that scrolls) */}
      <StageTabs
        idBase="lead-status"
        label="Lead statuses"
        value={phoneStatus}
        onChange={(id) => setPhoneStatus(id as LeadStatus)}
        className="shrink-0"
        tabs={COLUMNS.map((col) => ({
          id: col.status,
          label: col.label,
          count: totals[col.status],
          color: col.color,
        }))}
      />
      <StagePanel idBase="lead-status" tabId={phoneStatus}>
        <PhoneLeadList
          key={`${phoneStatus}-${source}`}
          status={phoneStatus}
          baseFilter={baseFilter}
          limit={limits[phoneStatus] ?? PAGE}
          onShowMore={showMore}
          onOpen={openContactDetail}
          onMenu={setMenuFor}
          convertingId={convertingId}
        />
      </StagePanel>

      {/* Kanban board (desktop; phones use the list above) */}
      <div className="flex-1 overflow-x-auto max-lg:hidden">
        <div className="flex h-full min-h-0 gap-4 p-6">
          {COLUMNS.map((col) => (
            <PipelineColumn
              // A new source filter starts each column afresh
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
              limit={limits[col.status] ?? PAGE}
              onShowMore={showMore}
            />
          ))}
        </div>
      </div>

      <ActionSheet
        open={!!menuFor}
        onClose={() => setMenuFor(null)}
        title={menuFor ? menuFor.name || menuFor.phoneNumber : undefined}
        actions={menuActions}
      />

      <ContactDetailDrawer contactId={selectedContactId} open={detailDrawerOpen} onClose={closeContactDetail} />
    </div>
  );
}
