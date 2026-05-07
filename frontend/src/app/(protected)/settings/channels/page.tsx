"use client";

import { useState, useMemo } from "react";
import { Radio, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useAuthStore } from "@/stores/auth-store";
import type {
  Channel,
  ChannelStatus,
  CreateChannelRequest,
  UpdateChannelRequest,
} from "@/lib/types/channels";

type TabValue = "all" | "ACTIVE" | "SUSPENDED";

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
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-on-surface">Channels</h1>
              <p className="text-sm text-on-surface-variant">
                Manage communication channels for your organization
              </p>
            </div>
          </div>

          {canCreate && !showForm && !editingChannel && (
            <Button
              variant="primary"
              onClick={() => {
                setShowForm(true);
                setDetailChannel(null);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Channel
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
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
            <p className="text-sm text-error mb-3">Failed to load channels</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Channel list */}
        {!isLoading && !isError && channels && (
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
