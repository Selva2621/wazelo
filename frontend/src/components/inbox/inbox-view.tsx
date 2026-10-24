"use client";

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import { MessageSquare, WifiOff, ArrowLeft, Trash2, XCircle, Archive, RotateCcw, Star, Handshake, ChevronLeft, Ellipsis } from "lucide-react";
import { useHideTabBar, useMobileTitle } from "@/hooks/use-mobile-chrome";
import { ActionSheet } from "@/components/ios/action-sheet";
import { MOBILE_BACK_EVENT } from "@/components/mobile/edge-swipe-back";
import { haptic } from "@/lib/haptics";
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
import { MessageThread, MessageThreadSkeleton } from "@/components/chat/message-thread";
import { Drawer } from "@/components/ui/modal";
import { useMediaQuery } from "@/hooks/use-media-query";
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
import { IconButton } from "@/components/ui/icon-button";

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

// ─── Mobile: the part of the screen not covered by the keyboard ───
// iOS keeps fixed elements in the full-height layout when the keyboard opens, so the open
// chat sizes itself to the visual viewport to keep the composer above the keyboard.

function subscribeViewport(onChange: () => void) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  vv.addEventListener("resize", onChange);
  vv.addEventListener("scroll", onChange);
  return () => {
    vv.removeEventListener("resize", onChange);
    vv.removeEventListener("scroll", onChange);
  };
}

function viewportSnapshot() {
  const vv = window.visualViewport;
  return vv ? `${Math.round(vv.height)}|${Math.round(vv.offsetTop)}` : "";
}

function useVisualViewport() {
  const snap = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => "");
  if (!snap) return null;
  const [height, top] = snap.split("|").map(Number);
  return { height, top, keyboardOpen: height < window.innerHeight - 120 };
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

  // Below lg the inbox is a stack (list → thread) and contact info opens as a bottom sheet.
  // The persisted contactPanelOpen preference only drives the desktop side panel.
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mobileContactOpen, setMobileContactOpen] = useState(false);

  // Mobile: an open chat is a full-screen pushed screen (tab bar hidden, own iOS header)
  const inMobileThread = !isDesktop && !!selectedId;
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  useHideTabBar(inMobileThread);
  useMobileTitle(isAdminView && targetUserName ? `${targetUserName.trim()}'s Inbox` : null);
  const viewport = useVisualViewport();

  // Edge swipe back (installed app) closes the open chat instead of leaving the inbox
  useEffect(() => {
    if (!inMobileThread) return;
    const onBack = (e: Event) => {
      e.preventDefault();
      setSelectedId(null);
    };
    window.addEventListener(MOBILE_BACK_EVENT, onBack);
    return () => window.removeEventListener(MOBILE_BACK_EVENT, onBack);
  }, [inMobileThread, setSelectedId]);

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

  // Rendered in the desktop side panel and the mobile bottom sheet
  const renderContactPanel = (onClose: () => void) =>
    selectedConversation && selectedId ? (
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
        onClose={onClose}
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
        conversationId={selectedId ?? undefined}
        onUseMessage={(text) => {
          setAiSuggestionText(text);
          setMobileContactOpen(false);
        }}
      />
    ) : null;

  const contactInfoOpen = isDesktop ? contactPanelOpen : mobileContactOpen;

  // ─── Loading ───
  if (sessionLoading && !skipSessionCheck) {
    return (
      <div className="flex h-[calc(100dvh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  // ─── No Session / Connecting: Full-page empty state (skip for admin or if channels exist) ───
  if (!skipSessionCheck && !hasActiveChannels && (hasNoSession || isConnecting)) {
    return (
      <div className="flex h-[calc(100dvh-var(--header-height))]">
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
    <div className="flex h-[calc(100dvh-var(--header-height))]">
      {/* Left panel — Conversation list (full width on mobile until a chat is opened) */}
      <div
        className={cn(
          "w-full lg:w-[320px] shrink-0 lg:border-r border-outline-variant/15 flex-col",
          selectedId ? "hidden lg:flex" : "flex",
        )}
      >
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 text-body font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container border-b border-outline-variant/15 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {/* Mobile: the nav bar already shows whose inbox this is */}
            <span className="max-lg:hidden">{targetUserName ? `${targetUserName}'s Inbox` : "Back to Users"}</span>
            <span className="lg:hidden">All users</span>
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
            isLoading={conversationsQuery.isLoading}
          />
        </div>
      </div>

      {/* Center panel — Message thread (replaces the list on mobile) */}
      <div
        className={cn(
          "flex-1 flex-col min-w-0",
          selectedId ? "flex" : "hidden lg:flex",
          // Mobile: full-screen chat over the app bars
          selectedId && "max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-40 max-lg:h-dvh max-lg:bg-surface",
        )}
        style={inMobileThread && viewport ? { height: viewport.height, top: viewport.top } : undefined}
      >
        {/* Disconnected banner */}
        {isDisconnected && !skipSessionCheck && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-warning-container/80 border-b border-warning/20">
            <div className="flex items-center gap-2 text-warning">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span className="text-body font-medium">
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
            {/* Chat header (mobile): ‹ Inbox · contact · … */}
            <div className="ios-nav-bar shrink-0 lg:hidden max-lg:-order-1" data-scrolled="true">
              <div className="flex h-[52px] items-center gap-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    haptic();
                    setSelectedId(null);
                  }}
                  className="flex h-11 shrink-0 items-center pr-1 text-primary active:opacity-50"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="h-7 w-7" strokeWidth={2.2} aria-hidden />
                  <span className="-ml-0.5 text-[17px]">Inbox</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileContactOpen(true)}
                  className="flex min-w-0 flex-1 items-center justify-center gap-2 active:opacity-60"
                  aria-label="Contact info"
                >
                  <Avatar name={selectedConversation.contactName} size="sm" />
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-[16px] font-semibold leading-5 text-on-surface">
                      {selectedConversation.contactName}
                    </span>
                    <span className="block truncate text-[12px] leading-4 text-on-surface-variant">
                      {selectedConversation.contactName !== selectedConversation.contactPhone
                        ? selectedConversation.contactPhone
                        : CHANNEL_TYPE_LABELS[selectedChannelType ?? "WHATSAPP"]}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic();
                    setThreadMenuOpen(true);
                  }}
                  className="grid size-11 shrink-0 place-items-center text-primary active:opacity-50"
                  aria-label="Conversation actions"
                >
                  <Ellipsis className="h-6 w-6" strokeWidth={2.2} aria-hidden />
                </button>
              </div>
            </div>

            {/* Chat header (desktop) */}
            <div className="shrink-0 flex items-center justify-between gap-2 px-2 sm:px-4 py-3 border-b border-outline-variant/15 max-lg:hidden">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <IconButton size="sm"
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden -mr-1"
                  title="Back to conversations" aria-label="Back to conversations">
                  <ArrowLeft className="h-5 w-5" />
                </IconButton>
                <Avatar
                  name={selectedConversation.contactName}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-body-lg font-semibold text-on-surface truncate">
                      {selectedConversation.contactName}
                    </h3>
                    {selectedChannelType && (
                      <Badge variant="default" className="shrink-0">
                        <ChannelIcon type={selectedChannelType} className="h-3 w-3 mr-1" />
                        {CHANNEL_TYPE_LABELS[selectedChannelType]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-label text-on-surface-variant truncate">
                      {selectedConversation.contactPhone}
                    </p>
                    {contactProducts && contactProducts.length > 0 && contactProducts.slice(0, 2).map((p) => (
                      <span key={p.id} className="hidden sm:inline text-caption px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{p.name}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
                {/* Close / Reopen */}
                {selectedRawConv?.status === "OPEN" ? (
                  <IconButton size="sm"
                    onClick={() => setShowCloseConfirm(true)}
                    disabled={closeConversation.isPending}
                    className="hover:text-warning hover:bg-warning/10"
                    title="Close conversation" aria-label="Close conversation">
                    <XCircle className="h-4 w-4" />
                  </IconButton>
                ) : (
                  <IconButton size="sm"
                    onClick={() => selectedId && reopenConversation.mutate(selectedId)}
                    disabled={reopenConversation.isPending}
                    className="hover:text-primary hover:bg-primary/10"
                    title="Reopen conversation" aria-label="Reopen conversation">
                    <RotateCcw className="h-4 w-4" />
                  </IconButton>
                )}
                {/* Archive */}
                {selectedRawConv?.status !== "ARCHIVED" && (
                  <IconButton size="sm"
                    onClick={() => selectedId && archiveConversation.mutate(selectedId)}
                    disabled={archiveConversation.isPending}
                   
                    title="Archive conversation" aria-label="Archive conversation">
                    <Archive className="h-4 w-4" />
                  </IconButton>
                )}
                {/* Create Deal */}
                {contactData?.id && (
                  <IconButton size="sm"
                    onClick={() => setShowCreateDeal(true)}
                    className="hover:text-primary hover:bg-primary/10"
                    title="Create deal" aria-label="Create deal">
                    <Handshake className="h-4 w-4" />
                  </IconButton>
                )}
                {/* Send CSAT */}
                <Button variant="secondary" size="sm"
                  onClick={() => {
                    if (!selectedId || !selectedRawConv) return;
                    sendCsatSurvey.mutate({
                      conversationId: selectedId,
                      contactPhone: selectedRawConv.contactPhone,
                      sessionId: selectedRawConv.sessionId ?? undefined,
                    });
                  }}
                  disabled={sendCsatSurvey.isPending}
                  className="bg-warning-container text-warning border-warning/30 hover:bg-warning/20 hover:border-warning/50"
                  title="Send CSAT survey to customer"
                  aria-label="Send CSAT survey"
                >
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  <span className="hidden sm:inline">{sendCsatSurvey.isPending ? "Sending…" : "Send Survey"}</span>
                </Button>
                {/* Delete */}
                <IconButton size="sm" variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteConversation.isPending}
                 
                  title="Delete conversation" aria-label="Delete conversation">
                  <Trash2 className="h-4 w-4" />
                </IconButton>
                <button
                  onClick={isDesktop ? toggleContactPanel : () => setMobileContactOpen(true)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    contactInfoOpen
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container",
                  )}
                  title={contactInfoOpen ? "Hide contact info" : "Show contact info"}
                  aria-label={contactInfoOpen ? "Hide contact info" : "Show contact info"}
                  aria-pressed={contactInfoOpen}
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
              <MessageThreadSkeleton />
            ) : (
              <MessageThread key={selectedId} messages={currentMessages} />
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
                <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-container px-4 py-3 text-body text-on-surface-variant/50">
                  <WifiOff className="h-4 w-4" />
                  Session disconnected — reconnect to send messages
                </div>
              </div>
            ) : (
              <ChatInput
                onSend={handleSend}
                onSendInteractive={handleSendInteractive}
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
            {/* Mobile: clear the home indicator (the keyboard covers it when open) */}
            {!viewport?.keyboardOpen && (
              <div aria-hidden className="h-[var(--safe-bottom)] shrink-0 bg-surface-container-lowest lg:hidden" />
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

      {/* Right panel — Contact details (desktop). CSS-gated so it doesn't flash in after hydration */}
      {contactPanelOpen && selectedConversation && selectedId && (
        <div className="hidden lg:block w-[300px] shrink-0 border-l border-outline-variant/15">
          {renderContactPanel(toggleContactPanel)}
        </div>
      )}

      {/* Contact details (mobile) — bottom sheet */}
      <Drawer
        side="bottom"
        open={!isDesktop && mobileContactOpen && !!selectedConversation}
        onClose={() => setMobileContactOpen(false)}
        className="overflow-y-auto"
        aria-label="Contact info"
      >
        {() => <div className="pt-3">{renderContactPanel(() => setMobileContactOpen(false))}</div>}
      </Drawer>
      {/* Mobile chat actions (the desktop header shows these as icon buttons) */}
      <ActionSheet
        open={threadMenuOpen}
        onClose={() => setThreadMenuOpen(false)}
        title={selectedConversation?.contactName}
        actions={[
          { label: "Contact info", onSelect: () => setMobileContactOpen(true) },
          selectedRawConv?.status === "OPEN"
            ? { label: "Close conversation", onSelect: () => setShowCloseConfirm(true) }
            : {
                label: "Reopen conversation",
                onSelect: () => selectedId && reopenConversation.mutate(selectedId),
              },
          ...(selectedRawConv?.status !== "ARCHIVED"
            ? [{ label: "Archive", onSelect: () => selectedId && archiveConversation.mutate(selectedId) }]
            : []),
          ...(contactData?.id ? [{ label: "Create deal", onSelect: () => setShowCreateDeal(true) }] : []),
          {
            label: "Send satisfaction survey",
            disabled: sendCsatSurvey.isPending,
            onSelect: () => {
              if (!selectedId || !selectedRawConv) return;
              sendCsatSurvey.mutate({
                conversationId: selectedId,
                contactPhone: selectedRawConv.contactPhone,
                sessionId: selectedRawConv.sessionId ?? undefined,
              });
            },
          },
          { label: "Delete conversation", destructive: true, onSelect: () => setShowDeleteConfirm(true) },
        ]}
      />
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
