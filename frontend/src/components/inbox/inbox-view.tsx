"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MessageSquare, WifiOff, ArrowLeft, Trash2, XCircle, Archive, RotateCcw, Star, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { useInboxStore } from "@/stores/inbox-store";
import {
  useWhatsAppSession,
  useWhatsAppSocket,
  useInitiateSession,
  useDisconnectSession,
} from "@/hooks/use-whatsapp";
import { useWhatsAppStore } from "@/stores/whatsapp-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useDeleteConversation,
  useCloseConversation,
  useArchiveConversation,
  useReopenConversation,
  useAssignConversation,
} from "@/hooks/use-conversations";
import { useSendCsatSurvey } from "@/hooks/use-csat";
import { AiReplySuggestions } from "@/components/chat/ai-reply-suggestions";
import { ConversationSummaryPanel } from "@/components/chat/conversation-summary-panel";
import { AiInsightPanel } from "@/components/chat/ai-insight-panel";
import { useContactByPhone, useChangeLeadStatus } from "@/hooks/use-contacts";
import { useUsers } from "@/hooks/use-users";
import { CreateDealModal } from "@/components/deals/create-deal-modal";
import { useContactProducts } from "@/hooks/use-products";
import { useInboxSocket } from "@/hooks/use-inbox-socket";
import { useChannelSocket } from "@/hooks/use-channel-socket";
import { useChannels } from "@/hooks/use-channels";
import { ChannelIcon } from "@/components/channels/channel-icon";
import { Badge } from "@/components/ui/badge";
import { CHANNEL_TYPE_LABELS } from "@/lib/types/channels";
import type { ChannelType } from "@/lib/types/channels";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageThread } from "@/components/chat/message-thread";
import { ChatInput, type MediaAttachment } from "@/components/chat/chat-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { uploadApi } from "@/lib/api/messages";
import { ContactPanel } from "@/components/chat/contact-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Conversation } from "@/components/chat/conversation-item";
import type { Message } from "@/components/chat/message-bubble";
import type { InteractivePayload } from "@/lib/types/inbox";
import type {
  ConversationResponse,
  MessageResponse,
  MessageStatus as BackendMessageStatus,
} from "@/lib/types/inbox";

// ─── Mappers: backend types → component props ──────────

function mapConversation(c: ConversationResponse): Conversation {
  return {
    id: c.id,
    contactName: c.contactName || c.contactPhone,
    contactPhone: c.contactPhone,
    lastMessage: c.lastMessageBody || "",
    lastMessageAt: c.lastMessageAt || c.createdAt,
    unreadCount: c.unreadCount,
    channelType: (c.channelType as ChannelType) ?? null,
  };
}

function mapMessageStatus(
  status: BackendMessageStatus,
): Message["status"] {
  switch (status) {
    case "QUEUED":
    case "PROCESSING":
      return "sending";
    case "SENT":
      return "sent";
    case "DELIVERED":
      return "delivered";
    case "READ":
      return "read";
    case "FAILED":
      return "failed";
    default:
      return "sending";
  }
}

function mapMessage(m: MessageResponse): Message {
  return {
    id: m.id,
    conversationId: m.conversationId || "",
    content: m.body || "",
    direction: m.direction === "OUTBOUND" ? "outgoing" : "incoming",
    status: mapMessageStatus(m.status),
    createdAt: m.createdAt,
    senderName: m.contactName || undefined,
    type: (m.type as Message["type"]) || "TEXT",
    mediaUrl: m.mediaUrl,
    mediaMimeType: m.mediaMimeType,
    channelType: m.channelType ?? null,
    channelPayload: m.channelPayload ?? null,
  };
}

// ─── Props ───────────────────────────────────────

export interface InboxViewProps {
  /** Filter conversations for a specific user's session (admin/manager drill-down) */
  targetUserId?: string;
  /** Display name for the target user */
  targetUserName?: string;
  /** Whether this is an admin/manager drill-down view */
  isAdminView?: boolean;
  /** Callback to go back to user list (admin/manager) */
  onBack?: () => void;
  /** Auto-select conversation matching this phone number (from contacts page) */
  autoSelectPhone?: string | null;
}

// ─── Component ───────────────────────────────────────

export function InboxView({
  targetUserId,
  targetUserName,
  isAdminView = false,
  onBack,
  autoSelectPhone,
}: InboxViewProps) {
  const userRole = useAuthStore((s) => s.user?.role);
  const contactPanelOpen = useUIStore((s) => s.contactPanelOpen);
  const toggleContactPanel = useUIStore((s) => s.toggleContactPanel);

  // Admin sees all org conversations — don't gate on own session status
  const skipSessionCheck = isAdminView || userRole === "ADMIN";

  // Inbox store state
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const setSelectedId = useInboxStore((s) => s.setSelectedConversation);
  const filter = useInboxStore((s) => s.filter);

  // WhatsApp session awareness
  const { isLoading: sessionLoading } = useWhatsAppSession();
  const initiateSession = useInitiateSession();
  const disconnectSession = useDisconnectSession();
  useWhatsAppSocket();
  useInboxSocket();
  useChannelSocket();
  const waStatus = useWhatsAppStore((s) => s.status);

  // Channel filter state
  const channelFilter = useInboxStore((s) => s.channelFilter);
  const setChannelFilter = useInboxStore((s) => s.setChannelFilter);

  // Email subject state for EMAIL channel conversations
  const [emailSubject, setEmailSubject] = useState("");
  const [aiSuggestionText, setAiSuggestionText] = useState("");

  // ─── Data hooks ───
  const conversationParams = useMemo(() => {
    const params: Record<string, unknown> = {};
    if (targetUserId) {
      params.targetUserId = targetUserId;
    }
    if (filter === "unread") {
      params.status = "OPEN";
    }
    return Object.keys(params).length > 0 ? params : undefined;
  }, [targetUserId, filter]);

  // When auto-selecting by phone, also fetch that specific conversation directly
  const phoneFilterParams = useMemo(
    () => autoSelectPhone ? { contactPhone: autoSelectPhone, limit: 1 } : undefined,
    [autoSelectPhone],
  );
  const phoneFilterQuery = useConversations(phoneFilterParams);

  const conversationsQuery = useConversations(conversationParams);
  const messagesQuery = useMessages(selectedId);
  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();
  const deleteConversation = useDeleteConversation();
  const closeConversation = useCloseConversation();
  const archiveConversation = useArchiveConversation();
  const reopenConversation = useReopenConversation();
  const sendCsatSurvey = useSendCsatSurvey();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showCreateDeal, setShowCreateDeal] = useState(false);

  // ─── Contact data for selected conversation (lookup by phone) ───
  const selectedRawConv = conversationsQuery.data?.data?.find(
    (c) => c.id === selectedId,
  );
  const { data: contactData } = useContactByPhone(selectedRawConv?.contactPhone ?? null);
  const { data: contactProducts } = useContactProducts(contactData?.id ?? null);
  const changeLeadStatus = useChangeLeadStatus();
  const assignConversation = useAssignConversation();
  const { data: usersData } = useUsers({ status: "ACTIVE" });

  // ─── Map backend data to component props ───
  const conversations = useMemo<Conversation[]>(() => {
    const raw = conversationsQuery.data?.data ?? [];
    const mapped = raw.map(mapConversation);

    if (filter === "unread") {
      return mapped.filter((c) => c.unreadCount > 0);
    }
    return mapped;
  }, [conversationsQuery.data, filter]);

  const currentMessages = useMemo<Message[]>(
    () => (messagesQuery.data?.data ?? []).map(mapMessage).reverse(),
    [messagesQuery.data],
  );

  const selectedConversation = conversations.find(
    (c) => c.id === selectedId,
  );

  // ─── Mark conversation as read on select ───
  useEffect(() => {
    if (!selectedId) return;
    const conv = conversationsQuery.data?.data?.find(
      (c) => c.id === selectedId,
    );
    if (conv && conv.unreadCount > 0) {
      markAsRead.mutate(selectedId);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-select conversation by phone (from contacts page) ───
  useEffect(() => {
    if (!autoSelectPhone) return;
    // Prefer the direct phone-filtered result (exact match, any session)
    const directMatch = phoneFilterQuery.data?.data?.[0];
    if (directMatch && directMatch.id !== selectedId) {
      setSelectedId(directMatch.id);
      return;
    }
    // Fallback: search within already-loaded list
    const match = conversationsQuery.data?.data?.find(
      (c) => c.contactPhone === autoSelectPhone,
    );
    if (match && match.id !== selectedId) {
      setSelectedId(match.id);
    }
  }, [autoSelectPhone, phoneFilterQuery.data, conversationsQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDisconnected =
    waStatus === "disconnected" || waStatus === "reconnecting";
  const hasNoSession = waStatus === "no_session";
  const isConnecting = waStatus === "connecting";

  // Check if any channels exist (to relax WhatsApp session gating)
  const { data: activeChannels } = useChannels(
    (hasNoSession || isConnecting) && !skipSessionCheck ? { status: "ACTIVE" } : undefined,
  );
  const hasActiveChannels = (activeChannels?.length ?? 0) > 0;

  // Compute available channel types for filter pills
  const availableChannelTypes = useMemo<ChannelType[]>(() => {
    const raw = conversationsQuery.data?.data ?? [];
    const types = new Set<ChannelType>();
    for (const c of raw) {
      if (c.channelType) types.add(c.channelType as ChannelType);
    }
    return Array.from(types);
  }, [conversationsQuery.data]);

  // Determine selected conversation's channel info
  const selectedChannelType = selectedRawConv?.channelType as ChannelType | undefined;

  // ─── Send handler (text + media) ───
  const [uploading, setUploading] = useState(false);

  const handleSend = useCallback(
    async (content: string, media?: MediaAttachment) => {
      if (!selectedConversation) return;

      let mediaUrl: string | undefined;
      let mediaMimeType: string | undefined;
      let messageType: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT" = "TEXT";

      if (media) {
        try {
          setUploading(true);
          const uploaded = await uploadApi.uploadFile(media.file);
          mediaUrl = uploaded.url;
          mediaMimeType = uploaded.mimeType;
          messageType = media.type;
        } catch {
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      // Build channel-specific payload
      const channelPayload: Record<string, unknown> | undefined =
        selectedChannelType === "EMAIL" && emailSubject
          ? { subject: emailSubject }
          : undefined;

      sendMessage.mutate({
        contactPhone: selectedConversation.contactPhone,
        contactName: selectedConversation.contactName,
        type: messageType,
        body: content || undefined,
        mediaUrl,
        mediaMimeType,
        idempotencyKey: `${selectedConversation.id}-${Date.now()}`,
        conversationId: selectedId || undefined,
        ...(targetUserId && { viaSessionUserId: targetUserId }),
        ...(selectedRawConv?.channelId && { channelId: selectedRawConv.channelId }),
        ...(channelPayload && { channelPayload }),
      });

      // Reset email subject after sending
      if (selectedChannelType === "EMAIL") setEmailSubject("");
    },
    [selectedConversation, selectedId, sendMessage, targetUserId],
  );

  const handleSendInteractive = useCallback(
    (payload: InteractivePayload) => {
      if (!selectedConversation) return;
      sendMessage.mutate({
        contactPhone: selectedConversation.contactPhone,
        contactName: selectedConversation.contactName,
        type: "INTERACTIVE",
        body: payload.body,
        interactive: payload,
        idempotencyKey: `${selectedConversation.id}-int-${Date.now()}`,
        conversationId: selectedId || undefined,
        ...(targetUserId && { viaSessionUserId: targetUserId }),
        ...(selectedRawConv?.channelId && { channelId: selectedRawConv.channelId }),
      });
    },
    [selectedConversation, selectedId, sendMessage, targetUserId],
  );

  // ─── Loading ───
  if (sessionLoading && !skipSessionCheck) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  // ─── No Session / Connecting: Full-page empty state (skip for admin or if channels exist) ───
  if (!skipSessionCheck && !hasActiveChannels && (hasNoSession || isConnecting)) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))]">
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<MessageSquare className="h-16 w-16" />}
            title={isConnecting ? "Connecting to WhatsApp..." : "Connect WhatsApp to start messaging"}
            description={
              isConnecting
                ? "Please wait while we set up your WhatsApp session."
                : "Link your WhatsApp account to send and receive messages directly from your CRM."
            }
            actionLabel={isConnecting ? "Connecting..." : "Connect WhatsApp"}
            onAction={() => {
              if (!isConnecting) {
                initiateSession.mutate(crypto.randomUUID());
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))]">
      {/* Left panel — Conversation list */}
      <div className="w-[320px] shrink-0 border-r border-outline-variant/15 flex flex-col">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-b border-outline-variant/15 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {targetUserName ? `${targetUserName}'s Inbox` : "Back to Users"}
          </button>
        )}
        <div className="flex-1 min-h-0">
          <ConversationList
            conversations={conversations}
            activeId={selectedId}
            onSelect={setSelectedId}
            channelFilter={channelFilter}
            onChannelFilterChange={setChannelFilter}
            availableChannelTypes={availableChannelTypes}
          />
        </div>
      </div>

      {/* Center panel — Message thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Disconnected banner */}
        {isDisconnected && !skipSessionCheck && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-warning-container/80 border-b border-warning/20">
            <div className="flex items-center gap-2 text-warning">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span className="text-[13px] font-medium">
                {waStatus === "reconnecting"
                  ? "Reconnecting to WhatsApp..."
                  : "Your WhatsApp session was disconnected"}
              </span>
            </div>
            {waStatus === "disconnected" && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => initiateSession.mutate(crypto.randomUUID())}
                >
                  Reconnect
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnectSession.mutate()}
                  className="text-error hover:text-error"
                >
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        )}

        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  name={selectedConversation.contactName}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[14px] font-semibold text-on-surface truncate">
                      {selectedConversation.contactName}
                    </h3>
                    {selectedChannelType && (
                      <Badge variant="default" className="shrink-0">
                        <ChannelIcon type={selectedChannelType} className="h-3 w-3 mr-1" />
                        {CHANNEL_TYPE_LABELS[selectedChannelType]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] text-on-surface-variant">
                      {selectedConversation.contactPhone}
                    </p>
                    {contactProducts && contactProducts.length > 0 && contactProducts.slice(0, 2).map((p) => (
                      <span key={p.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{p.name}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Close / Reopen */}
                {selectedRawConv?.status === "OPEN" ? (
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    disabled={closeConversation.isPending}
                    className="p-2 rounded-lg text-on-surface-variant hover:text-warning hover:bg-warning/10 transition-colors"
                    title="Close conversation"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => selectedId && reopenConversation.mutate(selectedId)}
                    disabled={reopenConversation.isPending}
                    className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Reopen conversation"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                {/* Archive */}
                {selectedRawConv?.status !== "ARCHIVED" && (
                  <button
                    onClick={() => selectedId && archiveConversation.mutate(selectedId)}
                    disabled={archiveConversation.isPending}
                    className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                    title="Archive conversation"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                )}
                {/* Create Deal */}
                {contactData?.id && (
                  <button
                    onClick={() => setShowCreateDeal(true)}
                    className="p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Create deal"
                  >
                    <Handshake className="h-4 w-4" />
                  </button>
                )}
                {/* Send CSAT */}
                <button
                  onClick={() => {
                    if (!selectedId || !selectedRawConv) return;
                    sendCsatSurvey.mutate({
                      conversationId: selectedId,
                      contactPhone: selectedRawConv.contactPhone,
                      sessionId: selectedRawConv.sessionId ?? undefined,
                    });
                  }}
                  disabled={sendCsatSurvey.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50 transition-colors"
                  title="Send CSAT survey to customer"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>{sendCsatSurvey.isPending ? "Sending…" : "Send Survey"}</span>
                </button>
                {/* Delete */}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteConversation.isPending}
                  className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                  title="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleContactPanel}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    contactPanelOpen
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
                  )}
                  title={
                    contactPanelOpen
                      ? "Hide contact info"
                      : "Show contact info"
                  }
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="15" y1="3" x2="15" y2="21" />
                  </svg>
                </button>
              </div>
            </div>

            {/* AI Summary Panel */}
            {selectedId && (
              <ConversationSummaryPanel conversationId={selectedId} />
            )}

            {/* Messages */}
            {messagesQuery.isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Spinner size="md" className="text-primary" />
              </div>
            ) : (
              <MessageThread messages={currentMessages} />
            )}

            {/* AI Insight Panel */}
            <AiInsightPanel conversationId={selectedId} />

            {/* AI Reply Suggestions */}
            <AiReplySuggestions
              conversationId={selectedId}
              onSelect={setAiSuggestionText}
            />

            {/* Input — disabled when disconnected */}
            {isDisconnected && !skipSessionCheck ? (
              <div className="shrink-0 px-4 py-3 border-t border-outline-variant/15">
                <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-container px-4 py-3 text-[13px] text-on-surface-variant/50">
                  <WifiOff className="h-4 w-4" />
                  Session disconnected — reconnect to send messages
                </div>
              </div>
            ) : (
              <ChatInput
                onSend={handleSend}
                onSendInteractive={handleSendInteractive}
                disabled={sendMessage.isPending}
                uploading={uploading}
                channelType={selectedChannelType}
                emailSubject={emailSubject}
                onSubjectChange={setEmailSubject}
                prefillText={aiSuggestionText}
                onPrefillApplied={() => setAiSuggestionText("")}
                maxTextLength={
                  selectedChannelType === "INSTAGRAM" ? 1000
                    : selectedChannelType === "FACEBOOK_MESSENGER" ? 2000
                    : undefined
                }
              />
            )}
          </>
        ) : (
          <EmptyState
            icon={<MessageSquare className="h-16 w-16" />}
            title="No conversation selected"
            description="Select a conversation from the list to start chatting."
            className="flex-1"
          />
        )}
      </div>

      {/* Right panel — Contact details */}
      {contactPanelOpen && selectedConversation && selectedId && (
        <div className="w-[300px] shrink-0 border-l border-outline-variant/15">
          <ContactPanel
            contact={{
              id: contactData?.id ?? "",
              name: contactData?.name ?? selectedConversation.contactName,
              phone: contactData?.phoneNumber ?? selectedConversation.contactPhone,
              email: contactData?.email ?? undefined,
              leadStatus: contactData?.leadStatus ?? "NEW",
              tags: contactData?.contactTags?.map((t) => t.tag.name) ?? [],
              notes: "",
              assignedTo: contactData?.owner
                ? `${contactData.owner.firstName} ${contactData.owner.lastName}`
                : undefined,
            }}
            onClose={toggleContactPanel}
            onStatusChange={contactData ? (cId, status) => {
              changeLeadStatus.mutate({ contactId: cId, status });
            } : undefined}
            isUpdatingStatus={changeLeadStatus.isPending}
            conversationAssignedToId={selectedRawConv?.assignedToId ?? null}
            orgUsers={usersData?.users ?? []}
            canAssign={userRole === "ADMIN" || userRole === "MANAGER"}
            isAssigning={assignConversation.isPending}
            onAssign={(assignedToId) => {
              if (selectedId) {
                assignConversation.mutate({ conversationId: selectedId, assignedToId });
              }
            }}
          />
        </div>
      )}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Conversation"
        message="This conversation will be removed from your inbox. Messages are preserved for audit purposes."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteConversation.isPending}
        onConfirm={() => {
          if (!selectedId) return;
          deleteConversation.mutate(selectedId, {
            onSuccess: () => {
              setSelectedId(null);
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <ConfirmDialog
        open={showCloseConfirm}
        title="Close Conversation"
        message="This will close the conversation. You can reopen it anytime, or send a CSAT survey separately using the survey button."
        confirmLabel="Close"
        variant="default"
        loading={closeConversation.isPending}
        onConfirm={() => {
          if (!selectedId) return;
          closeConversation.mutate(selectedId, {
            onSuccess: () => {
              setShowCloseConfirm(false);
            },
          });
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
      <CreateDealModal
        open={showCreateDeal}
        onClose={() => setShowCreateDeal(false)}
        prefilledContactId={contactData?.id}
        prefilledContactName={contactData?.name || selectedConversation?.contactName}
        lockContact
      />
    </div>
  );
}
