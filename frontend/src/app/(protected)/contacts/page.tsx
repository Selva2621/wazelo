"use client";

import { useState, useMemo } from "react";
import { Plus, Users, GitMerge, Upload, Download } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useContacts, useImportContacts, useExportContacts } from "@/hooks/use-contacts";
import { useContactsStore } from "@/stores/contacts-store";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ContactFilters } from "@/components/contacts/contact-filters";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactDetailDrawer } from "@/components/contacts/contact-detail-drawer";
import { CreateContactModal } from "@/components/contacts/create-contact-modal";
import { MergeContactsModal } from "@/components/contacts/merge-contacts-modal";
import { ImportContactsModal } from "@/components/contacts/import-contacts-modal";
import type { LeadStatus, ListContactsParams } from "@/lib/types/contacts";

const TAKE = 20;

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
  const [showImport, setShowImport] = useState(false);
  const [statusTab, setStatusTab] = useState("ALL");

  const exportContacts = useExportContacts();

  const {
    selectedContactId,
    detailDrawerOpen,
    searchQuery,
    filterStatus,
    filterOwnerId,
    filterSource,
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
      filterTagIds,
      filterProductIds,
    ],
  );

  const { data, isLoading } = useContacts(params);

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
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-on-surface-variant" />
            <h1 className="text-[18px] font-semibold text-on-surface">
              Contacts
            </h1>
            {data && (
              <span className="text-[13px] text-on-surface-variant/60">
                {data.total} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-64"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportContacts.mutate()}
              loading={exportContacts.isPending}
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowImport(true)}
              title="Import CSV"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMerge(true)}
              title="Merge contacts"
            >
              <GitMerge className="h-4 w-4" />
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Contact
            </Button>
          </div>
        </div>

        {/* Status tabs */}
        <Tabs
          tabs={tabsWithCounts}
          activeTab={statusTab}
          onTabChange={handleStatusTabChange}
        />

        {/* Filters */}
        <ContactFilters />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <ContactsTable
          contacts={data?.contacts ?? []}
          total={data?.total ?? 0}
          take={TAKE}
          skip={page * TAKE}
          isLoading={isLoading}
          onRowClick={openContactDetail}
          onPageChange={setPage}
          onCreateClick={() => setShowCreate(true)}
        />
      </div>

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
