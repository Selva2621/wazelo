"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  UserPlus,
  MessageSquare,
  Pencil,
  Trash2,
  Download,
  ShieldCheck,
  Save,
  X,
  Package,
  Briefcase,
  Plus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs } from "@/components/ui/tabs";
import { LeadStatusBadge } from "@/components/contacts/lead-status-badge";
import { LeadScoreBadge } from "@/components/contacts/lead-score-badge";
import { ContactTags } from "@/components/contacts/contact-tags";
import { ContactNotes } from "@/components/contacts/contact-notes";
import { ContactHistory } from "@/components/contacts/contact-history";
import { AssignOwnerModal } from "@/components/contacts/assign-owner-modal";
import { CreateDealModal } from "@/components/deals/create-deal-modal";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useContact,
  useChangeLeadStatus,
  useDeleteContact,
  useUpdateContact,
} from "@/hooks/use-contacts";
import { useContactDeals } from "@/hooks/use-deals";
import {
  useProducts,
  useContactProducts,
  useAssignProduct,
  useUnassignProduct,
} from "@/hooks/use-products";
import { useAuthStore } from "@/stores/auth-store";
import {
  getFieldValues,
  setFieldValues,
  listFieldDefinitions,
} from "@/lib/api/custom-fields";
import { exportContactData, eraseContactData } from "@/lib/api/gdpr";
import { SendMessageModal } from "@/components/contacts/send-message-modal";
import type { LeadStatus } from "@/lib/types/contacts";
import { IconButton } from "@/components/ui/icon-button";
import { formatAmount } from "@/lib/utils";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { useProductTerms } from "@/lib/product-terms";

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
];

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  EMAIL: "Email",
  MANUAL: "Manual",
  IMPORT: "Import",
  API: "API",
  FACEBOOK_LEAD_AD: "FB Lead Ad",
  INSTAGRAM_LEAD_AD: "IG Lead Ad",
  WHATSAPP_LEAD_AD: "WA Lead Ad",
};

const PAGE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "deals", label: "Deals" },
  { id: "products", label: "Products" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
];

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params.id as string;
  const router = useRouter();
  const userRole = useAuthStore((s) => s.user?.role);
  const terms = useProductTerms();
  const pageTabs = PAGE_TABS.map((t) => (t.id === "products" ? { ...t, label: terms.Plural } : t));

  const [activeTab, setActiveTab] = useState("overview");
  const [showAssign, setShowAssign] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "" });

  const { data: contact, isLoading } = useContact(contactId);
  usePageTitle(contact?.name || "Contact");

  const changeStatus = useChangeLeadStatus();
  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();

  function handleStatusChange(status: LeadStatus) {
    if (!contact || contact.leadStatus === status) return;
    changeStatus.mutate({ contactId, status });
  }

  function startEditing() {
    if (!contact) return;
    setEditForm({ name: contact.name || "", email: contact.email || "" });
    setEditing(true);
  }

  function handleEditSave() {
    const updates: Record<string, string> = {};
    if (editForm.name.trim()) updates.name = editForm.name.trim();
    if (editForm.email.trim()) updates.email = editForm.email.trim();
    if (Object.keys(updates).length === 0) { setEditing(false); return; }
    updateContact.mutate({ contactId, ...updates }, { onSuccess: () => setEditing(false) });
  }

  function openConversation() {
    if (!contact) return;
    const phoneParam = `phone=${encodeURIComponent(contact.phoneNumber)}`;
    const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";
    if (isAdminOrManager && contact.ownerId) {
      const ownerName = `${contact.owner.firstName} ${contact.owner.lastName}`;
      router.push(`/inbox?userId=${encodeURIComponent(contact.ownerId)}&userName=${encodeURIComponent(ownerName)}&${phoneParam}`);
    } else {
      router.push(`/inbox?${phoneParam}`);
    }
  }

  function handleExport() {
    if (!contactId) return;
    exportContactData(contactId).then((data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contact-export-${contactId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-on-surface-variant">Contact not found.</p>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 max-lg:space-y-4 max-lg:px-4 max-lg:pt-2">
      {/* Mobile: Send Message is the nav bar button, the other actions sit in its "…" menu */}
      <MobilePageActions
        primary={{ label: "Send message", onClick: () => setShowSendMessage(true), icon: <MessageSquare className="h-[22px] w-[22px]" aria-hidden /> }}
        moreTitle={contact.name || contact.phoneNumber}
        more={[
          { label: "Open chat", onSelect: openConversation },
          !editing && { label: "Edit", onSelect: startEditing },
          { label: "Assign owner", onSelect: () => setShowAssign(true) },
          { label: "Export data", onSelect: handleExport },
          { label: "Delete contact", onSelect: () => setShowDeleteConfirm(true), destructive: true },
        ]}
      />

      {/* Back nav (the iOS nav bar has Back on mobile) */}
      <button
        onClick={() => router.push("/contacts")}
        type="button"
        className="flex items-center gap-1.5 rounded text-body text-on-surface-variant outline-none hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-focus max-lg:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Contacts
      </button>

      {/* Profile Card */}
      <div data-tour="contact-profile" className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-5 max-lg:p-4 max-lg:space-y-4">
        {/* Header row */}
        <div className="flex items-start gap-5 max-lg:flex-wrap max-lg:gap-3">
          <Avatar
            name={contact.name || contact.phoneNumber}
            src={contact.avatarUrl}
            size="lg"
          />

          <div className="flex-1 min-w-0 space-y-1">
            {editing ? (
              <div className="space-y-2">
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditing(false); }}
                  autoFocus
                  placeholder="Contact name"
                  className="w-full h-9 rounded-lg bg-surface-container px-3 text-title-sm font-semibold text-on-surface outline-none focus:ring-1 focus:ring-primary/40 border border-outline-variant/20"
                />
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEditSave(); if (e.key === "Escape") setEditing(false); }}
                  placeholder="email@example.com"
                  type="email"
                  className="w-full h-8 rounded-lg bg-surface-container px-3 text-body text-on-surface outline-none focus:ring-1 focus:ring-primary/40 border border-outline-variant/20"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditSave} loading={updateContact.isPending}>
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-headline font-semibold text-on-surface truncate max-lg:text-title">
                  {contact.name || "Unknown"}
                </h1>
                <div className="flex items-center gap-4 flex-wrap text-body text-on-surface-variant max-lg:gap-x-3 max-lg:gap-y-1">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> {contact.phoneNumber}
                  </span>
                  {contact.email && (
                    <span className="flex items-center gap-1.5 max-lg:min-w-0 max-lg:break-all">
                      <Mail className="h-3.5 w-3.5 max-lg:shrink-0" /> {contact.email}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    <Badge variant="default">{SOURCE_LABELS[contact.source] ?? contact.source}</Badge>
                  </span>
                </div>
                <div className="text-label text-on-surface-variant/60">
                  Owner: {contact.owner.firstName} {contact.owner.lastName}
                  {" · "}
                  Created: {new Date(contact.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </>
            )}
          </div>

          {/* Right actions */}
          <div data-tour="contact-actions" className="flex items-center gap-2 shrink-0 max-lg:w-full">
            <LeadScoreBadge score={contact.leadScore} size="md" />
            {!editing && (
              <IconButton size="sm"
                onClick={startEditing}
                className="hover:text-primary hover:bg-primary/10 max-lg:hidden"
                title="Edit" aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton size="sm"
              onClick={() => setShowAssign(true)}
              className="hover:text-primary hover:bg-primary/10 max-lg:hidden"
              title="Assign owner" aria-label="Assign owner">
              <UserPlus className="h-4 w-4" />
            </IconButton>
            <IconButton size="sm"
              onClick={handleExport}
              className="hover:text-primary hover:bg-primary/10 max-lg:hidden"
              title="Export data" aria-label="Export data">
              <Download className="h-4 w-4" />
            </IconButton>
            <IconButton size="sm" variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              className="max-lg:hidden"
              title="Delete contact" aria-label="Delete contact">
              <Trash2 className="h-4 w-4" />
            </IconButton>
            {/* Primary action last */}
            <Button size="sm" variant="secondary" className="max-lg:hidden" onClick={openConversation}>
              Open chat
            </Button>
            <Button size="sm" className="max-lg:hidden" onClick={() => setShowSendMessage(true)}>
              <MessageSquare className="h-4 w-4 mr-1" /> Send message
            </Button>
          </div>
        </div>

        {/* Lead status row */}
        <div data-tour="contact-status" className="space-y-1.5">
          <p className="text-label text-on-surface-variant">Lead status</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {LEAD_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => handleStatusChange(s.value)}
                disabled={changeStatus.isPending}
                aria-pressed={contact.leadStatus === s.value}
                className={`rounded-full outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-focus ${contact.leadStatus === s.value ? "opacity-100" : "opacity-35 hover:opacity-70"}`}
              >
                <LeadStatusBadge status={s.value} />
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div data-tour="contact-tags">
          <ContactTags contactId={contact.id} tags={contact.contactTags} />
        </div>
      </div>

      {/* Tabs content */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
        <div data-tour="contact-tabs" className="px-6 pt-4 border-b border-outline-variant max-lg:px-3 max-lg:pt-2">
          <Tabs tabs={pageTabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        <div className="p-6">
          {activeTab === "overview" && <OverviewTab contact={contact} contactId={contactId} />}
          {activeTab === "deals" && (
            <ContactDealsSection contactId={contactId} contactName={contact.name || contact.phoneNumber} />
          )}
          {activeTab === "products" && <ContactProductsSection contactId={contactId} />}
          {activeTab === "notes" && <ContactNotes contactId={contactId} />}
          {activeTab === "activity" && <ContactHistory contactId={contactId} />}
        </div>
      </div>

      {/* Modals */}
      <AssignOwnerModal
        contactId={contactId}
        currentOwnerId={contact.ownerId}
        open={showAssign}
        onClose={() => setShowAssign(false)}
      />

      <SendMessageModal
        open={showSendMessage}
        onClose={() => setShowSendMessage(false)}
        contactName={contact.name || contact.phoneNumber}
        phoneNumber={contact.phoneNumber}
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete contact"
        message="This contact and all associated data will be soft-deleted."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteContact.isPending}
        onConfirm={() => {
          deleteContact.mutate(contactId, {
            onSuccess: () => {
              setShowDeleteConfirm(false);
              router.push("/contacts");
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ contact, contactId }: { contact: any; contactId: string }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Contact Info */}
      <div className="space-y-3">
        <h3 className="text-title-sm font-semibold text-on-surface">
          Contact information
        </h3>
        <div className="space-y-2">
          <InfoRow label="Phone" value={contact.phoneNumber} />
          <InfoRow label="Email" value={contact.email || "—"} />
          <InfoRow label="Source" value={SOURCE_LABELS[contact.source] ?? contact.source} />
          <InfoRow label="Owner" value={`${contact.owner.firstName} ${contact.owner.lastName}`} />
          <InfoRow label="Notes" value={String(contact._count.notes)} />
          <InfoRow
            label="Created"
            value={new Date(contact.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          />
          <InfoRow
            label="Updated"
            value={new Date(contact.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          />
        </div>
      </div>

      {/* Custom Fields */}
      <CustomFieldsSection contactId={contactId} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-outline-variant/8">
      <span className="text-label text-on-surface-variant/60 shrink-0 w-24">{label}</span>
      <span className="text-body text-on-surface text-right">{value}</span>
    </div>
  );
}

/* ─── Custom Fields Section ─── */
function CustomFieldsSection({ contactId }: { contactId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: definitions } = useQuery({
    queryKey: ["custom-fields", "contact"],
    queryFn: () => listFieldDefinitions("contact"),
  });

  const { data: fieldValues, isLoading } = useQuery({
    queryKey: ["custom-field-values", contactId],
    queryFn: () => getFieldValues(contactId),
  });

  const saveMut = useMutation({
    mutationFn: (vals: { fieldId: string; value: string }[]) => setFieldValues(contactId, vals),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custom-field-values", contactId] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    const map: Record<string, string> = {};
    fieldValues?.forEach((fv) => { map[fv.fieldId] = fv.value; });
    setValues(map);
    setEditing(true);
  };

  const handleSave = () => {
    if (!definitions) return;
    const payload = definitions
      .map((d) => ({ fieldId: d.id, value: values[d.id] || "" }))
      .filter((v) => v.value);
    saveMut.mutate(payload);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-title-sm font-semibold text-on-surface">
          Custom fields
        </h3>
        {!editing ? (
          <button onClick={startEdit} className="text-label text-primary hover:underline">
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="text-label text-on-surface-variant hover:underline">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saveMut.isPending}
              className="text-label text-primary font-medium hover:underline"
            >
              {saveMut.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>

      {isLoading && <Spinner size="sm" />}

      {!isLoading && (!definitions || definitions.length === 0) && (
        <p className="text-label text-on-surface-variant/50">
          No custom fields defined. Add them in Settings → Custom Fields.
        </p>
      )}

      {definitions && definitions.length > 0 && (
        <div className="space-y-2">
          {definitions.map((def) => {
            const currentValue = fieldValues?.find((fv) => fv.fieldId === def.id)?.value || "";
            return (
              <div key={def.id} className="flex items-center justify-between py-1.5 border-b border-outline-variant/8">
                <span className="text-label text-on-surface-variant/60 shrink-0 w-24">{def.fieldLabel}</span>
                {editing ? (
                  def.fieldType === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={values[def.id] === "true"}
                      onChange={(e) => setValues((v) => ({ ...v, [def.id]: String(e.target.checked) }))}
                      className="rounded"
                    />
                  ) : def.fieldType === "select" && def.options ? (
                    <select
                      value={values[def.id] || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [def.id]: e.target.value }))}
                      className="rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-label"
                    >
                      <option value="">—</option>
                      {(def.options as string[]).map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={def.fieldType === "number" ? "number" : def.fieldType === "date" ? "date" : "text"}
                      value={values[def.id] || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [def.id]: e.target.value }))}
                      className="max-w-[180px] rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-label text-on-surface"
                    />
                  )
                ) : (
                  <span className="text-body text-on-surface">{currentValue || "—"}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Deals Section ─── */
function ContactDealsSection({ contactId, contactName }: { contactId: string; contactName: string }) {
  const { data: deals, isLoading } = useContactDeals(contactId);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-body-lg font-semibold text-on-surface">
          Deals <span className="text-on-surface-variant/50 font-normal">({deals?.length || 0})</span>
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create deal
        </Button>
      </div>

      {deals && deals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {deals.map((deal) => (
            <div key={deal.id} className="p-3 rounded-xl transition-colors hover:bg-surface-container-low space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-body-lg font-medium text-on-surface">{deal.title}</span>
                <Badge variant={deal.status === "WON" ? "success" : deal.status === "LOST" ? "error" : "default"} dot>
                  {deal.status.charAt(0) + deal.status.slice(1).toLowerCase().replace(/_/g, " ")}
                </Badge>
              </div>
              {deal.value != null && (
                <p className="text-body text-primary font-semibold">
                  {formatAmount(Number(deal.value), deal.currency)}
                </p>
              )}
              {deal.stage && (
                <p className="text-label text-on-surface-variant/60">Stage: {deal.stage.name}</p>
              )}
              <p className="text-caption text-on-surface-variant/50">
                {new Date(deal.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Briefcase className="h-8 w-8 text-on-surface-variant/30" />
          <p className="text-body text-on-surface-variant/50">No deals yet</p>
          <button onClick={() => setShowCreate(true)} className="text-body text-primary hover:underline">
            Create first deal
          </button>
        </div>
      )}

      <CreateDealModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        prefilledContactId={contactId}
        prefilledContactName={contactName}
        lockContact
      />
    </div>
  );
}

/* ─── Products Section ─── */
function ContactProductsSection({ contactId }: { contactId: string }) {
  const { data: contactProducts, isLoading: loadingContact } = useContactProducts(contactId);
  const { data: allProducts, isLoading: loadingAll } = useProducts();
  const assignProduct = useAssignProduct();
  const unassignProduct = useUnassignProduct();
  const terms = useProductTerms();

  if (loadingContact || loadingAll) return <div className="flex justify-center py-8"><Spinner /></div>;

  const assignedIds = new Set(contactProducts?.map((p) => p.id) || []);
  const available = allProducts?.filter((p) => !assignedIds.has(p.id) && p.status === "ACTIVE") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-body-lg font-semibold text-on-surface">
          {terms.Plural} <span className="text-on-surface-variant/50 font-normal">({contactProducts?.length || 0})</span>
        </h3>
        {available.length > 0 && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                assignProduct.mutate({ contactId, productId: e.target.value });
                e.target.value = "";
              }
            }}
            defaultValue=""
            aria-label={`Assign ${terms.singular}`}
            className="h-8 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-label text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="" disabled>+ Assign {terms.singular}</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {contactProducts && contactProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {contactProducts.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-surface-container-low">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-body font-medium text-on-surface">{p.name}</p>
                  <Badge variant={p.status === "ACTIVE" ? "success" : "muted"} dot className="mt-0.5">
                    {p.status.charAt(0) + p.status.slice(1).toLowerCase().replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              <button
                onClick={() => unassignProduct.mutate({ contactId, productId: p.id })}
                className="text-label text-error hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Package className="h-8 w-8 text-on-surface-variant/30" />
          <p className="text-body text-on-surface-variant/50">No {terms.plural} assigned yet</p>
          {available.length > 0 && (
            <p className="text-label text-on-surface-variant/40">Use the dropdown above to assign a {terms.singular}</p>
          )}
        </div>
      )}
    </div>
  );
}
