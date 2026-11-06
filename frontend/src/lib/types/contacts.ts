import type { ScrapeSource } from "./lead-scraper";

// ─── Enums (match backend Prisma enums) ───

export type LeadStatus = "NEW" | "CONTACTED" | "INTERESTED" | "CONVERTED" | "CLOSED";

// ─── Bulk actions (POST /contacts/bulk/*, max 100 ids per request) ───

export const BULK_CONTACTS_MAX = 100;

export type BulkContactAction =
  | { action: "status"; contactIds: string[]; status: LeadStatus }
  | { action: "assign"; contactIds: string[]; ownerId: string }
  | { action: "tags"; contactIds: string[]; name: string }
  | { action: "delete"; contactIds: string[] };

export interface BulkContactsResult {
  succeeded: string[];
  failed: { contactId: string; error: string }[];
}
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
  | "WHATSAPP_LEAD_AD"
  | "SHOPIFY"
  | "WEB_SCRAPE"
  | "WEBSITE";

// ─── Lead-source groups (GET /contacts/groups) ───

export interface ContactGroups {
  sources: { source: ContactSource; count: number }[];
  scrapeRuns: {
    id: string;
    source: ScrapeSource;
    keywords: string;
    location: string | null;
    createdAt: string;
    count: number;
  }[];
}

/** running | done | stopped | no_session (no connected number) | day_limit (150 lookups/number/day) */
export type GroupWaCheckState = "running" | "done" | "stopped" | "no_session" | "day_limit";

export interface SavedContactGroup {
  id: string;
  name: string;
  contactCount: number;
  createdAt: string;
  /** "On WhatsApp?" answers for the members you can see */
  whatsapp?: { on: number; off: number; unchecked: number };
  /** Background "Check numbers" run */
  waCheck?: { state: GroupWaCheckState; startedAt?: string; finishedAt?: string } | null;
}

/** Contacts per saved group by default: one campaign batch */
export const SAVED_GROUP_DEFAULT_SIZE = 100;
export const SAVED_GROUP_MAX_SIZE = 1_000;
/** Most contacts one save / move / split call handles */
export const SAVED_GROUP_MAX_CONTACTS = 10_000;

/** split: groups of `groupSize` named "<name> N" · one: a single group named exactly `name` */
export type SavedGroupBuildMode = "split" | "one";

export interface CreateSavedGroupsRequest {
  name: string;
  contactIds: string[];
  /** 1..1000, default 100 */
  groupSize?: number;
  /** Omitted (older callers): "<name> - 001", "<name> - 002"… */
  mode?: SavedGroupBuildMode;
  /** Leave contacts that are already in a group where they are */
  onlyUngrouped?: boolean;
}

export interface CreateSavedGroupsResult {
  groups: SavedContactGroup[];
  batchSize: number;
  /** Selected contacts that were moved out of another group */
  movedFromGroups: number;
  /** Selected contacts left in their group (onlyUngrouped) */
  skippedGrouped?: number;
}

export interface SplitSavedGroupsRequest {
  groupSize?: number;
  prefix?: string;
  mode?: SavedGroupBuildMode;
}

export interface SplitSavedGroupsResult {
  groups: SavedContactGroup[];
  /** Ungrouped contacts left over (split handles 10,000 per call) */
  remaining: number;
}

/** Which groups the contacts would leave if saved / moved */
export interface SavedGroupMoveImpact {
  alreadyGrouped: number;
  groups: { id: string; name: string; count: number }[];
}

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
  /** Country of a number typed without a country code; defaults to the org's */
  country?: string;
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
  scrapeRunId?: string;
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
