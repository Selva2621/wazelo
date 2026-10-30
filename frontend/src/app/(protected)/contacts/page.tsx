"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, GitMerge, Upload, Download, LayoutList, Kanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterBarDivider } from "@/components/ui/filter-bar";
import { usePageTitle } from "@/hooks/use-page-title";
import { useContacts, useImportContacts, useExportContacts } from "@/hooks/use-contacts";
import { useContactsStore } from "@/stores/contacts-store";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContactFilters } from "@/components/contacts/contact-filters";
import { ContactSourceGroups } from "@/components/contacts/contact-source-groups";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactsBulkBar } from "@/components/contacts/contacts-bulk-bar";
import { ContactKanbanBoard } from "@/components/contacts/contact-kanban-board";
import { ContactDetailDrawer } from "@/components/contacts/contact-detail-drawer";
import { CreateContactModal } from "@/components/contacts/create-contact-modal";
import { MergeContactsModal } from "@/components/contacts/merge-contacts-modal";
import { ImportContactsModal } from "@/components/contacts/import-contacts-modal";
import { LoadError } from "@/components/ui/empty-state";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import type { LeadStatus, ListContactsParams } from "@/lib/types/contacts";

const TAKE = 20;
const EMPTY_SELECTION: Set<string> = new Set();

const STATUS_TABS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "NEW", label: "New" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "INTERESTED", label: "Interested" },
  { id: "CONVERTED", label: "Converted" },
  { id: "CLOSED", label: "Closed" },
];

export default function ContactsPage() {
  usePageTitle("Contacts");

  const [showCreate, setShowCreate] = useState(false);
  const [showMerge, setShowMerge] = useState(false);

  // "Add Lead" links land here with ?action=new — open the create form, then
  // drop the param so a refresh doesn't reopen it
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("action") !== "new") return;
    url.searchParams.delete("action");
    window.history.replaceState(null, "", url.pathname + url.search);
    const frame = requestAnimationFrame(() => setShowCreate(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const [showImport, setShowImport] = useState(false);
  const [statusTab, setStatusTab] = useState("ALL");
  const [view, setView] = useState<"list" | "kanban">("list");

  const exportContacts = useExportContacts();

  const {
    selectedContactId,
    detailDrawerOpen,
    searchQuery,
    filterStatus,
    filterOwnerId,
    filterSource,
    filterScrapeRunId,
    filterTagIds,
    filterProductIds,
    page,
    setSearchQuery,
    openContactDetail,
    closeContactDetail,
    setPage,
  } = useContactsStore();

  // Compute effective status: tab overrides filter when not "ALL"
  const effectiveStatus: LeadStatus | undefined =
    statusTab !== "ALL" ? (statusTab as LeadStatus) : filterStatus ?? undefined;

  const params = useMemo<ListContactsParams>(
    () => ({
      take: TAKE,
      skip: page * TAKE,
      search: searchQuery || undefined,
      leadStatus: effectiveStatus,
      ownerId: filterOwnerId ?? undefined,
      source: filterSource ?? undefined,
      scrapeRunId: filterScrapeRunId ?? undefined,
      tagIds: filterTagIds.length > 0 ? filterTagIds : undefined,
      productIds: filterProductIds.length > 0 ? filterProductIds : undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [
      page,
      searchQuery,
      effectiveStatus,
      filterOwnerId,
      filterSource,
      filterScrapeRunId,
      filterTagIds,
      filterProductIds,
    ],
  );

  const { data, isLoading, isError, refetch } = useContacts(params);

  // Selection belongs to the current query: changing page, search or filters drops it,
  // so a bulk action never hits rows the agent can no longer see
  const paramsKey = JSON.stringify(params);
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({
    key: paramsKey,
    ids: new Set(),
  });
  const selectedIds = selection.key === paramsKey ? selection.ids : EMPTY_SELECTION;
  const setSelectedIds = (ids: Set<string>) => setSelection({ key: paramsKey, ids });

  // Add counts to status tabs
  const tabsWithCounts = STATUS_TABS.map((tab) => ({
    ...tab,
    count: tab.id === "ALL" ? data?.total : undefined,
  }));

  function handleStatusTabChange(tabId: string) {
    setStatusTab(tabId);
    setPage(0);
  }

  return (
    // Phones, list view: the page itself scrolls (no inner scroll box); the board keeps its bounded height
    <div
      className={cn(
        "relative flex flex-col h-[calc(100dvh-var(--header-height))]",
        view === "list" && "max-lg:h-auto",
      )}
    >
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0 space-y-4 max-lg:pt-1 max-lg:space-y-3">
        {/* Phones/tablets: title is in the nav bar, buttons in its + and … menus */}
        <MobilePageActions
          primary={{ label: "New contact", onClick: () => setShowCreate(true) }}
          more={[
            {
              label: view === "list" ? "Show as board" : "Show as list",
              onSelect: () => setView(view === "list" ? "kanban" : "list"),
            },
            { label: "Import CSV", onSelect: () => setShowImport(true) },
            { label: "Export CSV", onSelect: () => exportContacts.mutate() },
            { label: "Merge contacts", onSelect: () => setShowMerge(true) },
          ]}
        />
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={data ? `Search ${data.total} contacts` : "Search contacts"}
          className="w-full lg:hidden"
        />
        <PageHeader
          className="max-lg:hidden"
          title="Contacts"
          count={data?.total}
          actions={
            <>
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts"
                className="w-64"
              />
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportContacts.mutate()}
                  loading={exportContacts.isPending}
                  title="Export CSV"
                  aria-label="Export CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowImport(true)} title="Import CSV" aria-label="Import CSV">
                  <Upload className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowMerge(true)} title="Merge contacts" aria-label="Merge contacts">
                  <GitMerge className="h-4 w-4" />
                </Button>
              </div>
              {/* View toggle */}
              <div role="group" aria-label="View" className="flex items-center gap-0.5 rounded-lg border border-outline-variant p-0.5">
                {(
                  [
                    { id: "list", label: "List view", Icon: LayoutList },
                    { id: "kanban", label: "Board view", Icon: Kanban },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    title={label}
                    aria-label={label}
                    aria-pressed={view === id}
                    className={cn(
                      "rounded-md p-1.5 outline-none transition-colors duration-120 ease-standard focus-visible:ring-2 focus-visible:ring-focus",
                      view === id
                        ? "bg-primary/12 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New contact
              </Button>
            </>
          }
        />

        {/* Every filter on one row: status, source, then owner / tag / product */}
        <FilterBar className="mobile-scroll-x">
          <Tabs tabs={tabsWithCounts} activeTab={statusTab} onTabChange={handleStatusTabChange} />
          <FilterBarDivider />
          <ContactSourceGroups />
          <FilterBarDivider />
          <ContactFilters showStatus={false} />
        </FilterBar>
      </div>

      {/* Content */}
      {view === "kanban" ? (
        <ContactKanbanBoard />
      ) : (
        // Desktop: room around the table card
        <div className="flex-1 min-h-0 overflow-y-auto lg:px-6 lg:pb-6 lg:pt-4 max-lg:flex-none max-lg:overflow-visible">
          {isError ? (
            <LoadError what="contacts" onRetry={() => refetch()} className="m-6" />
          ) : (
            <ContactsTable
              contacts={data?.contacts ?? []}
              total={data?.total ?? 0}
              take={TAKE}
              skip={page * TAKE}
              isLoading={isLoading}
              onRowClick={openContactDetail}
              onPageChange={setPage}
              onCreateClick={() => setShowCreate(true)}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          )}
        </div>
      )}

      {view === "list" && (
        <ContactsBulkBar
          selectedIds={selectedIds}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Detail Drawer */}
      <ContactDetailDrawer
        contactId={selectedContactId}
        open={detailDrawerOpen}
        onClose={closeContactDetail}
      />

      {/* Modals */}
      <CreateContactModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
      <MergeContactsModal
        open={showMerge}
        onClose={() => setShowMerge(false)}
      />
      <ImportContactsModal
        open={showImport}
        onClose={() => setShowImport(false)}
      />
    </div>
  );
}
