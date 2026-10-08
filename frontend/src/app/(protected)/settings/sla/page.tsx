"use client";

import { useState } from "react";
import { Shield, Plus } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { SlaPolicyList } from "@/components/sla/sla-policy-list";
import { SlaPolicyForm } from "@/components/sla/sla-policy-form";
import { Spinner } from "@/components/ui/spinner";
import {
  useSlaPolicies,
  useCreateSlaPolicy,
  useUpdateSlaPolicy,
  useDeleteSlaPolicy,
} from "@/hooks/use-sla";
import type { SlaPolicy } from "@/lib/types/sla";
import { Button } from "@/components/ui/button";

export default function SlaSettingsPage() {
  usePageTitle("SLA Policies");

  const { data: policies, isLoading } = useSlaPolicies();
  const createPolicy = useCreateSlaPolicy();
  const updatePolicy = useUpdateSlaPolicy();
  const deletePolicy = useDeleteSlaPolicy();

  const [showForm, setShowForm] = useState(false);
  const [editPolicy, setEditPolicy] = useState<SlaPolicy | null>(null);

  const handleCreate = (data: any) => {
    createPolicy.mutate(data, {
      onSuccess: () => {
        setShowForm(false);
      },
    });
  };

  const handleUpdate = (data: any) => {
    if (!editPolicy) return;
    updatePolicy.mutate(
      { id: editPolicy.id, data },
      { onSuccess: () => setEditPolicy(null) },
    );
  };

  const handleToggle = (id: string, isActive: boolean) => {
    updatePolicy.mutate({ id, data: { isActive } });
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this SLA policy?")) {
      deletePolicy.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title font-semibold text-on-surface flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            SLA Policies
          </h1>
          <p className="text-body text-on-surface-variant mt-0.5">
            Set response time targets for conversations. Agents get warned before breach.
          </p>
        </div>
        {!showForm && !editPolicy && (
          <Button
            onClick={() => setShowForm(true)}
           
          >
            <Plus className="h-4 w-4" />
            New Policy
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <SlaPolicyForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          isSubmitting={createPolicy.isPending}
        />
      )}

      {/* Edit form */}
      {editPolicy && (
        <SlaPolicyForm
          policy={editPolicy}
          onSubmit={handleUpdate}
          onCancel={() => setEditPolicy(null)}
          isSubmitting={updatePolicy.isPending}
        />
      )}

      {/* Policy list */}
      <SlaPolicyList
        policies={policies ?? []}
        onToggle={handleToggle}
        onEdit={(p) => { setEditPolicy(p); setShowForm(false); }}
        onDelete={handleDelete}
        isUpdating={updatePolicy.isPending || deletePolicy.isPending}
      />

      {/* Info box */}
      {(policies?.length ?? 0) > 0 && (
        <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
          <p className="text-label text-on-surface-variant">
            <strong className="text-on-surface">How it works:</strong> When a conversation is created,
            the system starts tracking response time. If an agent hasn&apos;t replied within the
            warning threshold, they get an alert. If the breach threshold is exceeded, it&apos;s
            marked as an SLA breach in Analytics → SLA dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
