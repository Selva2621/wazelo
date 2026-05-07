"use client";

import { useState } from "react";
import { Key, Plus, RotateCcw, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listApiKeys, createApiKey, revokeApiKey, rotateApiKey } from "@/lib/api/api-keys";
import { usePageTitle } from "@/hooks/use-page-title";
const SCOPES = ["read", "write", "contacts", "messages", "campaigns"];

type ConfirmAction = { type: "rotate" | "revoke"; id: string; name: string } | null;

export default function ApiKeysPage() {
  usePageTitle("API Keys");

  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", scopes: ["read"] as string[], expiresInDays: "" });
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ["api-keys"],
    queryFn: listApiKeys,
  });

  const createMut = useMutation({
    mutationFn: (d: Parameters<typeof createApiKey>[0]) => createApiKey(d),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKey(result.rawKey);
      setShowCreate(false);
      setForm({ name: "", scopes: ["read"], expiresInDays: "" });
    },
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const rotateMut = useMutation({
    mutationFn: (id: string) => rotateApiKey(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKey(result.rawKey ?? null);
      setCopied(false);
    },
  });

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleScope = (scope: string) => {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            API Keys
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">Manage API keys for third-party integrations</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New API Key
        </Button>
      </div>

      {/* New key display banner */}
      {newKey && (
        <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
          <p className="text-[13px] font-medium text-success mb-2">New API key generated. Copy it now — it will never be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-surface px-3 py-2 text-[12px] font-mono text-on-surface break-all">
              {newKey}
            </code>
            <Button size="sm" variant="ghost" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <button onClick={() => setNewKey(null)} className="text-[11px] text-on-surface-variant mt-2 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary" /></div>
      ) : !keys?.length ? (
        <EmptyState
          icon={<Key className="h-12 w-12" />}
          title="No API keys"
          description="Create API keys to integrate with external systems."
          actionLabel="New API Key"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id} className={!k.isActive ? "opacity-50" : ""}>
                <TableCell>
                  <div>
                    <p className="text-[13px] font-medium text-on-surface">{k.name}</p>
                    <p className="text-[10px] text-on-surface-variant/50">
                      by {k.createdBy.firstName} {k.createdBy.lastName}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-[12px] text-on-surface-variant">{k.keyPrefix}...</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-0.5">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="muted" className="text-[9px] px-1 py-0">{s}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {k.isActive ? (
                    <Badge variant="success" className="text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="error" className="text-[10px]">Revoked</Badge>
                  )}
                </TableCell>
                <TableCell className="text-[11px] text-on-surface-variant">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell className="text-[11px] text-on-surface-variant">
                  {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell>
                  {k.isActive && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setConfirmAction({ type: "rotate", id: k.id, name: k.name })}
                        disabled={rotateMut.isPending}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors disabled:opacity-40"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rotate
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: "revoke", id: k.id, name: k.name })}
                        disabled={revokeMut.isPending}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" />
                        Revoke
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40">
          <div className="w-full max-w-md rounded-3xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
              <h2 className="text-lg font-semibold text-on-surface">New API Key</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg text-on-surface-variant hover:text-error">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Key name (e.g. Zapier Integration)"
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none"
              />
              <div>
                <p className="text-[12px] font-medium text-on-surface-variant mb-1.5">Scopes</p>
                <div className="flex flex-wrap gap-1.5">
                  {SCOPES.map((scope) => (
                    <button
                      key={scope}
                      onClick={() => toggleScope(scope)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        form.scopes.includes(scope)
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={form.expiresInDays}
                onChange={(e) => setForm((f) => ({ ...f, expiresInDays: e.target.value }))}
                placeholder="Expires in days (empty = never)"
                type="number"
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={() => createMut.mutate({
                  name: form.name,
                  scopes: form.scopes,
                  expiresInDays: form.expiresInDays ? parseInt(form.expiresInDays, 10) : undefined,
                })}
                disabled={!form.name.trim() || form.scopes.length === 0}
              >
                Generate Key
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.type === "rotate" ? "Rotate API Key" : "Revoke API Key"}
        message={
          confirmAction?.type === "rotate"
            ? `"${confirmAction.name}" will be revoked and a new key will be generated. Copy the new key immediately — it won't be shown again.`
            : `"${confirmAction?.name}" will be permanently disabled. Any integrations using this key will stop working immediately.`
        }
        confirmLabel={confirmAction?.type === "rotate" ? "Rotate Key" : "Revoke Key"}
        variant={confirmAction?.type === "revoke" ? "danger" : "warning"}
        loading={rotateMut.isPending || revokeMut.isPending}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!confirmAction) return;
          if (confirmAction.type === "rotate") {
            rotateMut.mutate(confirmAction.id, {
              onSuccess: (result) => {
                setNewKey(result.rawKey);
                setCopied(false);
                setConfirmAction(null);
              },
            });
          } else {
            revokeMut.mutate(confirmAction.id, {
              onSuccess: () => setConfirmAction(null),
            });
          }
        }}
      />
    </div>
  );
}
