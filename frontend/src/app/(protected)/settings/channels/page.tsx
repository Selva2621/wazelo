"use client";

import { useState, useMemo } from "react";
import { Plus, Smartphone, MessageCircle, Mail, Radio, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StartHint } from "@/components/ui/start-hint";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChannelList } from "@/components/channels/channel-list";
import { ChannelForm } from "@/components/channels/channel-form";
import { ChannelDetailPanel } from "@/components/channels/channel-detail-panel";
import { SuspendChannelDialog } from "@/components/channels/suspend-channel-dialog";
import {
  useChannels,
  useCreateChannel,
  useUpdateChannel,
  useSuspendChannel,
  useReactivateChannel,
  useDeleteChannel,
} from "@/hooks/use-channels";
import { useChannelSocket } from "@/hooks/use-channel-socket";
import { usePageTitle } from "@/hooks/use-page-title";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { useAuthStore } from "@/stores/auth-store";
import { useWhatsAppStore } from "@/stores/whatsapp-store";
import { useWhatsAppSession } from "@/hooks/use-whatsapp";
import { useCloudNumbers } from "@/hooks/use-cloud-numbers";
import { useWidgetConfig } from "@/hooks/use-widget";
import { useEmailAccount } from "@/hooks/use-email";
import type {
  Channel,
  ChannelStatus,
  CreateChannelRequest,
  UpdateChannelRequest,
} from "@/lib/types/channels";

type TabValue = "all" | "ACTIVE" | "SUSPENDED";

/**
 * WhatsApp (QR + Cloud API), the website widget and email are set up on their own settings pages
 * and never write to the /channels registry, so an empty registry still shows them here with
 * their live status.
 */
function BuiltInChannels({ canViewCloud }: { canViewCloud: boolean }) {
  useWhatsAppSession();
  const waStatus = useWhatsAppStore((s) => s.status);
  const { data: cloudNumbers } = useCloudNumbers(canViewCloud);
  const { data: widget, isLoading: widgetLoading } = useWidgetConfig();
  const { data: email, isLoading: emailLoading } = useEmailAccount();

  const cloudConnected = (cloudNumbers ?? []).some((n) => n.status === "CONNECTED");
  const items = [
    {
      href: "/settings/whatsapp",
      icon: Smartphone,
      name: "WhatsApp",
      description: "Chats, campaigns and automations on your number.",
      loading: waStatus === "loading",
      connected: waStatus === "connected" || cloudConnected,
    },
    {
      href: "/settings/chat-widget",
      icon: MessageCircle,
      name: "Website chat widget",
      description: "Visitors chat from your site; replies land in Inbox.",
      loading: widgetLoading,
      connected: !!widget?.enabled,
    },
    {
      href: "/settings/email",
      icon: Mail,
      name: "Email",
      description: "Proposals, welcome mails and follow-ups from your address.",
      loading: emailLoading,
      connected: email?.status === "ACTIVE",
    },
  ];

  return (
    <div className="space-y-4">
      <StartHint
        icon={<Radio />}
        title="No extra channels added"
        description="Your built-in channels are below."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ href, icon: Icon, name, description, loading, connected }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 outline-none transition-colors duration-120 ease-standard hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-focus"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-container text-on-surface-variant group-hover:text-primary">
                <Icon className="h-5 w-5" />
              </span>
              {loading ? (
                <span className="text-label text-on-surface-variant">—</span>
              ) : connected ? (
                <Badge variant="success" dot>Connected</Badge>
              ) : (
                <Badge variant="default" dot>Not connected</Badge>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-body-lg font-semibold text-on-surface">{name}</p>
              <p className="mt-0.5 text-label text-on-surface-variant">{description}</p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-label font-medium text-primary">
              {connected ? "Manage" : "Connect"}
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ChannelsPage() {
  usePageTitle("Channels");
  useChannelSocket();

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const canCreate = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [tab, setTab] = useState<TabValue>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [detailChannel, setDetailChannel] = useState<Channel | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Channel | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Channel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);

  const statusParam = tab === "all" ? undefined : (tab as ChannelStatus);
  const { data: channels, isLoading, isError, refetch } = useChannels(
    statusParam ? { status: statusParam } : undefined,
  );

  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const suspendChannel = useSuspendChannel();
  const reactivateChannel = useReactivateChannel();
  const deleteChannel = useDeleteChannel();

  const tabs = useMemo(
    () => [
      { id: "all", label: "All" },
      { id: "ACTIVE", label: "Active" },
      { id: "SUSPENDED", label: "Suspended" },
    ],
    [],
  );

  const handleCreate = (data: CreateChannelRequest | UpdateChannelRequest) => {
    createChannel.mutate(data as CreateChannelRequest, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleUpdate = (data: CreateChannelRequest | UpdateChannelRequest) => {
    if (!editingChannel) return;
    updateChannel.mutate(
      { id: editingChannel.id, data: data as UpdateChannelRequest },
      { onSuccess: () => setEditingChannel(null) },
    );
  };

  const handleSuspend = (reason: string) => {
    if (!suspendTarget) return;
    suspendChannel.mutate(
      { id: suspendTarget.id, data: { reason } },
      { onSuccess: () => setSuspendTarget(null) },
    );
  };

  const handleReactivate = () => {
    if (!reactivateTarget) return;
    reactivateChannel.mutate(reactivateTarget.id, {
      onSuccess: () => setReactivateTarget(null),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteChannel.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] overflow-hidden max-lg:h-auto max-lg:overflow-visible">
      {canCreate && !showForm && !editingChannel && (
        <MobilePageActions
          primary={{ label: "Add Channel", onClick: () => { setShowForm(true); setDetailChannel(null); } }}
        />
      )}
      {/* Header */}
      <PageHeader
        title="Channels"
        className="shrink-0 px-6 pt-5 pb-4 max-lg:hidden"
        actions={
          canCreate &&
          !showForm &&
          !editingChannel && (
            <Button
              variant="primary"
              onClick={() => {
                setShowForm(true);
                setDetailChannel(null);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add channel
            </Button>
          )
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-4 max-lg:overflow-visible max-lg:pt-4">
        {/* Create form */}
        {showForm && (
          <ChannelForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isSubmitting={createChannel.isPending}
          />
        )}

        {/* Edit form */}
        {editingChannel && (
          <ChannelForm
            channel={editingChannel}
            onSubmit={handleUpdate}
            onCancel={() => setEditingChannel(null)}
            isSubmitting={updateChannel.isPending}
          />
        )}

        {/* Detail panel */}
        {detailChannel && !editingChannel && !showForm && (
          <ChannelDetailPanel
            channel={detailChannel}
            onClose={() => setDetailChannel(null)}
          />
        )}

        {/* Filter tabs */}
        <div className="mb-4">
          <Tabs
            tabs={tabs}
            activeTab={tab}
            onTabChange={(val) => setTab(val as TabValue)}
          />
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="text-center py-20">
            <p className="text-body-lg text-error mb-3">Failed to load channels</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Channel list */}
        {!isLoading && !isError && channels && channels.length === 0 && tab === "all" && (
          <BuiltInChannels canViewCloud={canCreate} />
        )}

        {!isLoading && !isError && channels && (channels.length > 0 || tab !== "all") && (
          <ChannelList
            channels={channels}
            onEdit={(ch) => {
              setEditingChannel(ch);
              setShowForm(false);
              setDetailChannel(null);
            }}
            onSuspend={setSuspendTarget}
            onReactivate={setReactivateTarget}
            onDelete={setDeleteTarget}
            canManage={isAdmin}
            canDelete={isAdmin}
          />
        )}
      </div>

      {/* Suspend dialog */}
      <SuspendChannelDialog
        open={!!suspendTarget}
        channelName={suspendTarget?.name ?? ""}
        onConfirm={handleSuspend}
        onCancel={() => setSuspendTarget(null)}
        loading={suspendChannel.isPending}
      />

      {/* Reactivate confirmation */}
      {reactivateTarget && (
        <ConfirmDialog
          open
          title="Reactivate Channel"
          message={`Reactivate "${reactivateTarget.name}"? Credentials will be re-verified before activation.`}
          confirmLabel="Reactivate"
          onConfirm={handleReactivate}
          onCancel={() => setReactivateTarget(null)}
          loading={reactivateChannel.isPending}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          open
          title="Delete Channel"
          message={`Permanently delete "${deleteTarget.name}"? This cannot be undone. Active conversations must be closed first.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteChannel.isPending}
        />
      )}
    </div>
  );
}
