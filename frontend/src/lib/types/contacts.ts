// ─── Enums (match backend Prisma enums) ───

export type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "CONVERTED" | "CLOSED";
export type ContactSource =
  | "WHATSAPP"
  | "INSTAGRAM"
  | "FACEBOOK"
  | "EMAIL"
  | "MANUAL"
  | "IMPORT"
  | "API"
  | "FACEBOOK_LEAD_AD"
  | "INSTAGRAM_LEAD_AD"
  | "WHATSAPP_LEAD_AD";

// ─── Tag ───

export interface Tag {
  id: string;
  orgId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

// ─── ContactTag (junction with tag include) ───

export interface ContactTag {
  id: string;
  contactId: string;
  tagId: string;
  orgId: string;
  addedById: string;
  createdAt: string;
  tag: Tag;
}

// ─── Contact Owner (select shape from repository) ───

export interface ContactOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ─── Contact (matches ContactWithRelations) ───

export interface Contact {
  id: string;
  orgId: string;
  phoneNumber: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  source: ContactSource;
  leadStatus: LeadStatus;
  ownerId: string;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
  leadScore: number;
  scoreUpdatedAt: string | null;
  mergedIntoId: string | null;
  createdAt: string;
  updatedAt: string;
  owner: ContactOwner;
  contactTags: ContactTag[];
  contactProducts?: { product: { id: string; name: string; status: string } }[];
  _count: { notes: number };
}

// ─── List Response ───

export interface ContactListResponse {
  contacts: Contact[];
  total: number;
  take: number;
  skip: number;
}

// ─── Contact Note ───

export interface ContactNote {
  id: string;
  contactId: string;
  orgId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface NotesListResponse {
  notes: ContactNote[];
  total: number;
}

// ─── Status History ───

export interface ContactStatusHistoryEntry {
  id: string;
  contactId: string;
  orgId: string;
  previousStatus: LeadStatus | null;
  newStatus: LeadStatus;
  changedById: string;
  reason: string | null;
  createdAt: string;
}

// ─── Owner History ───

export interface ContactOwnerHistoryEntry {
  id: string;
  contactId: string;
  orgId: string;
  previousOwnerId: string | null;
  newOwnerId: string;
  assignedById: string;
  reason: string | null;
  createdAt: string;
}

// ─── Request DTOs ───

export interface CreateContactRequest {
  phoneNumber: string;
  name?: string;
  email?: string;
  source?: ContactSource;
  ownerId?: string;
}

export interface UpdateContactRequest {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface ChangeLeadStatusRequest {
  status: LeadStatus;
  reason?: string;
}

export interface AssignContactRequest {
  ownerId: string;
  reason?: string;
}

export interface MergeContactsRequest {
  primaryContactId: string;
  secondaryContactId: string;
}

export interface AddNoteRequest {
  content: string;
}

export interface AddTagRequest {
  name: string;
  color?: string;
}

// ─── Query Params ───

export interface ListContactsParams {
  take?: number;
  skip?: number;
  leadStatus?: LeadStatus;
  ownerId?: string;
  source?: ContactSource;
  tagIds?: string[];
  productIds?: string[];
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "name";
  sortOrder?: "asc" | "desc";
}

// ─── Org Member (for assign owner) ───

export interface OrgMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}
