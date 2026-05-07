"use client";

import { useState } from "react";
import {
  X,
  Phone,
  Mail,
  Globe,
  Trash2,
  UserPlus,
  MoreHorizontal,
  MessageSquare,
  Pencil,
  Download,
  ShieldCheck,
  SlidersHorizontal,
  Save,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { LeadStatusBadge } from "./lead-status-badge";
import { LeadScoreBadge } from "./lead-score-badge";
import { ContactTags } from "./contact-tags";
import { ContactNotes } from "./contact-notes";
import { ContactHistory } from "./contact-history";
import { AssignOwnerModal } from "./assign-owner-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useContact,
  useChangeLeadStatus,
  useDeleteContact,
  useUpdateContact,
} from "@/hooks/use-contacts";
import type { LeadStatus } from "@/lib/types/contacts";
import { useContactDeals } from "@/hooks/use-deals";
import { CreateDealModal } from "@/components/deals/create-deal-modal";
import { useProducts, useContactProducts, useAssignProduct, useUnassignProduct } from "@/hooks/use-products";
import { ProductSelectField } from "@/components/ui/product-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getFieldValues, setFieldValues, listFieldDefinitions, type CustomFieldValue } from "@/lib/api/custom-fields";
import { exportContactData, eraseContactData } from "@/lib/api/gdpr";
import { SendMessageModal } from "./send-message-modal";

interface ContactDetailDrawerProps {
  contactId: string | null;
  open: boolean;
  onClose: () => void;
}

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
];

const drawerTabs = [
  { id: "info", label: "Info" },
  { id: "products", label: "Products" },
  { id: "deals", label: "Deals" },
  { id: "fields", label: "Fields" },
  { id: "notes", label: "Notes" },
  { id: "history", label: "History" },
];

export function ContactDetailDrawer({
  contactId,
  open,
  onClose,
}: ContactDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [showActions, setShowActions] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "" });

  const router = useRouter();
  const userRole = useAuthStore((s) => s.user?.role);

  const { data: contact, isLoading } = useContact(contactId);
  const changeStatus = useChangeLeadStatus();
  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();

  function handleStatusChange(status: LeadStatus) {
    if (!contactId || !contact || contact.leadStatus === status) return;
    changeStatus.mutate({ contactId, status });
  }

  function handleDelete() {
    setShowDeleteConfirm(true);
  }

  function startEditing() {
    if (!contact) return;
    setEditForm({
      name: contact.name || "",
      email: contact.email || "",
    });
    setEditing(true);
  }

  function handleEditSave() {
    if (!contactId) return;
    const updates: Record<string, string> = {};
    if (editForm.name.trim()) updates.name = editForm.name.trim();
    if (editForm.email.trim()) updates.email = editForm.email.trim();
    if (Object.keys(updates).length === 0) {
      setEditing(false);
      return;
    }
    updateContact.mutate(
      { contactId, ...updates },
      { onSuccess: () => setEditing(false) },
    );
  }

  function openConversation() {
    if (!contact) return;
    const phoneParam = `phone=${encodeURIComponent(contact.phoneNumber)}`;
    const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";
    if (isAdminOrManager && contact.ownerId) {
      const ownerName = `${contact.owner.firstName} ${contact.owner.lastName}`;
      router.push(
        `/inbox?userId=${encodeURIComponent(contact.ownerId)}&userName=${encodeURIComponent(ownerName)}&${phoneParam}`,
      );
    } else {
      router.push(`/inbox?${phoneParam}`);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-surface/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[400px] bg-surface-container-lowest border-l border-outline-variant/15 shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <h2 className="text-[15px] font-semibold text-on-surface">
            Contact Details
          </h2>
          <div className="flex items-center gap-1">
            {contactId && (
              <button
                onClick={() => router.push(`/contacts/${contactId}`)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                title="Open full profile"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showActions && (
                <div className="absolute right-0 top-9 z-10 w-44 rounded-xl bg-surface-container-lowest border border-outline-variant/15 shadow-lg py-1">
                  <button
                    onClick={() => {
                      setShowAssign(true);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Assign Owner
                  </button>
                  <button
                    onClick={() => {
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
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Data (GDPR)
                  </button>
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-error hover:bg-surface-container transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Contact
                  </button>
                  <button
                    onClick={() => {
                      if (!contactId) return;
                      if (confirm("GDPR Erasure: This will PERMANENTLY delete ALL data for this contact. This cannot be undone. Continue?")) {
                        eraseContactData(contactId, "GDPR erasure request").then(() => onClose());
                      }
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-error hover:bg-surface-container transition-colors"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Erase Data (GDPR)
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-57px)] overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {contact && (
            <div className="space-y-0">
              {/* Profile header */}
              <div className="px-5 py-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar
                    name={contact.name || contact.phoneNumber}
                    src={contact.avatarUrl}
                    size="lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-on-surface truncate">
                      {contact.name || "Unknown"}
                    </p>
                    <p className="text-[12px] text-on-surface-variant/60 mt-0.5">
                      {contact.owner.firstName} {contact.owner.lastName}
                    </p>
                  </div>
                  {!editing && (
                    <button
                      onClick={startEditing}
                      className="shrink-0 p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Edit contact"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {LEAD_STATUSES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleStatusChange(s.value)}
                      disabled={changeStatus.isPending}
                      className={`transition-opacity ${
                        contact.leadStatus === s.value
                          ? "opacity-100"
                          : "opacity-40 hover:opacity-70"
                      }`}
                    >
                      <LeadStatusBadge status={s.value} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Score */}
              <div className="px-5 pb-2">
                <p className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide mb-1">
                  Lead Score
                </p>
                <LeadScoreBadge score={contact.leadScore} size="md" />
              </div>

              {/* Edit form or Quick info */}
              {editing ? (
                <div className="px-5 pb-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
                      Name
                    </label>
                    <input
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave();
                        if (e.key === "Escape") setEditing(false);
                      }}
                      autoFocus
                      placeholder="Contact name"
                      className="mt-1 w-full h-9 rounded-lg bg-surface-container-low px-3 text-[13px] text-on-surface outline-none focus:ring-1 focus:ring-primary/40 border border-outline-variant/15"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
                      Email
                    </label>
                    <input
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleEditSave();
                        if (e.key === "Escape") setEditing(false);
                      }}
                      placeholder="email@example.com"
                      type="email"
                      className="mt-1 w-full h-9 rounded-lg bg-surface-container-low px-3 text-[13px] text-on-surface outline-none focus:ring-1 focus:ring-primary/40 border border-outline-variant/15"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
                      Phone
                    </label>
                    <p className="mt-1 px-3 py-2 text-[13px] text-on-surface-variant/60 bg-surface-container-low rounded-lg border border-outline-variant/10">
                      {contact.phoneNumber}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleEditSave}
                      loading={updateContact.isPending}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-5 pb-4 space-y-2">
                  <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{contact.phoneNumber}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[13px] text-on-surface-variant">
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <Badge variant="default">{contact.source}</Badge>
                  </div>
                </div>
              )}

              {/* Message actions */}
              <div className="px-5 pb-4 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowSendMessage(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Send Message
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={openConversation}
                >
                  Open Chat
                </Button>
              </div>

              {/* Tags */}
              <div className="px-5 pb-4">
                <ContactTags
                  contactId={contact.id}
                  tags={contact.contactTags}
                />
              </div>

              {/* Tabs */}
              <div className="border-t border-outline-variant/10">
                <div className="px-5 pt-3">
                  <Tabs
                    tabs={drawerTabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                </div>

                <div className="px-5 py-4">
                  {activeTab === "info" && (
                    <div className="space-y-3">
                      <InfoRow
                        label="Phone"
                        value={contact.phoneNumber}
                      />
                      <InfoRow
                        label="Email"
                        value={contact.email || "—"}
                      />
                      <InfoRow
                        label="Source"
                        value={contact.source}
                      />
                      <InfoRow
                        label="Owner"
                        value={`${contact.owner.firstName} ${contact.owner.lastName}`}
                      />
                      <InfoRow
                        label="Notes"
                        value={String(contact._count.notes)}
                      />
                      <InfoRow
                        label="Created"
                        value={new Date(
                          contact.createdAt,
                        ).toLocaleDateString()}
                      />
                      <InfoRow
                        label="Updated"
                        value={new Date(
                          contact.updatedAt,
                        ).toLocaleDateString()}
                      />
                    </div>
                  )}
                  {activeTab === "products" && (
                    <ContactProductsTab contactId={contact.id} />
                  )}
                  {activeTab === "deals" && (
                    <ContactDealsTab contactId={contact.id} contactName={contact.name || contact.phoneNumber} />
                  )}
                  {activeTab === "fields" && (
                    <CustomFieldsTab contactId={contact.id} />
                  )}
                  {activeTab === "notes" && (
                    <ContactNotes contactId={contact.id} />
                  )}
                  {activeTab === "history" && (
                    <ContactHistory contactId={contact.id} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send message modal */}
      {contact && (
        <SendMessageModal
          open={showSendMessage}
          onClose={() => setShowSendMessage(false)}
          contactName={contact.name || contact.phoneNumber}
          phoneNumber={contact.phoneNumber}
        />
      )}

      {/* Assign owner modal */}
      {contact && (
        <AssignOwnerModal
          contactId={contact.id}
          currentOwnerId={contact.ownerId}
          open={showAssign}
          onClose={() => setShowAssign(false)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Contact"
        message="This contact and all associated data will be soft-deleted. This action can be reversed by an admin."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteContact.isPending}
        onConfirm={() => {
          if (!contactId) return;
          deleteContact.mutate(contactId, {
            onSuccess: () => {
              setShowDeleteConfirm(false);
              onClose();
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}

function CustomFieldsTab({ contactId }: { contactId: string }) {
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
    const payload = definitions.map((d) => ({ fieldId: d.id, value: values[d.id] || "" })).filter((v) => v.value);
    saveMut.mutate(payload);
  };

  if (isLoading) return <Spinner size="sm" />;

  if (!definitions?.length) {
    return <p className="text-[12px] text-on-surface-variant/50">No custom fields defined. Add them in Settings.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">Custom Fields</span>
        {!editing ? (
          <button onClick={startEdit} className="text-[11px] text-primary hover:underline">Edit</button>
        ) : (
          <div className="flex gap-1.5">
            <button onClick={() => setEditing(false)} className="text-[11px] text-on-surface-variant hover:underline">Cancel</button>
            <button onClick={handleSave} disabled={saveMut.isPending} className="text-[11px] text-primary hover:underline font-medium">
              {saveMut.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        )}
      </div>
      {definitions.map((def) => {
        const currentValue = fieldValues?.find((fv) => fv.fieldId === def.id)?.value || "";
        return (
          <div key={def.id} className="flex items-center justify-between">
            <span className="text-[12px] text-on-surface-variant/60">{def.fieldLabel}</span>
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
                  className="max-w-[160px] rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-[12px]"
                >
                  <option value="">—</option>
                  {(def.options as string[]).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  type={def.fieldType === "number" ? "number" : def.fieldType === "date" ? "date" : "text"}
                  value={values[def.id] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [def.id]: e.target.value }))}
                  className="max-w-[160px] rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-[12px] text-on-surface"
                />
              )
            ) : (
              <span className="text-[13px] text-on-surface">{currentValue || "—"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContactProductsTab({ contactId }: { contactId: string }) {
  const { data: contactProducts, isLoading: loadingContact } = useContactProducts(contactId);
  const { data: allProducts, isLoading: loadingAll } = useProducts();
  const assignProduct = useAssignProduct();
  const unassignProduct = useUnassignProduct();

  if (loadingContact || loadingAll) return <Spinner size="sm" />;

  const assignedIds = new Set(contactProducts?.map((p) => p.id) || []);
  const available = allProducts?.filter((p) => !assignedIds.has(p.id) && p.status === "ACTIVE") || [];

  return (
    <div className="space-y-3">
      <span className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
        Assigned Products ({contactProducts?.length || 0})
      </span>

      {contactProducts && contactProducts.length > 0 ? (
        contactProducts.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/10">
            <span className="text-[13px] text-on-surface">{p.name}</span>
            <button
              onClick={() => unassignProduct.mutate({ contactId, productId: p.id })}
              className="text-[11px] text-error hover:underline"
            >
              Remove
            </button>
          </div>
        ))
      ) : (
        <p className="text-[12px] text-on-surface-variant/50">No products assigned.</p>
      )}

      <div className="pt-2">
        <ProductSelectField
          value=""
          onChange={(productId) => {
            if (productId) assignProduct.mutate({ contactId, productId });
          }}
          label="Add Product"
          optional={false}
          activeOnly
        />
      </div>
    </div>
  );
}

function ContactDealsTab({ contactId, contactName }: { contactId: string; contactName: string }) {
  const { data: deals, isLoading } = useContactDeals(contactId);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <Spinner size="sm" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
          Deals ({deals?.length || 0})
        </span>
        <button onClick={() => setShowCreate(true)} className="text-[11px] text-primary hover:underline font-medium">
          + Create Deal
        </button>
      </div>

      {deals && deals.length > 0 ? (
        deals.map((deal) => (
          <div key={deal.id} className="p-3 rounded-lg bg-surface-container border border-outline-variant/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-on-surface">{deal.title}</span>
              <Badge variant={deal.status === "WON" ? "success" : deal.status === "LOST" ? "error" : "default"}>
                {deal.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant/60">
              <span>{deal.stage?.name}</span>
              {deal.value != null && <span>{deal.currency || "INR"} {deal.value.toLocaleString()}</span>}
            </div>
            {deal.expectedClose && (
              <p className="text-[11px] text-on-surface-variant/40">
                Close: {new Date(deal.expectedClose).toLocaleDateString()}
              </p>
            )}
          </div>
        ))
      ) : (
        <p className="text-[12px] text-on-surface-variant/50">No deals yet for this contact.</p>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-on-surface-variant/60">{label}</span>
      <span className="text-[13px] text-on-surface">{value}</span>
    </div>
  );
}
