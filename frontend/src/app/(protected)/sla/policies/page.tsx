"use client";

import { useState } from "react";
import { Shield, Plus, ArrowLeft } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useSlaPolicies,
  useCreateSlaPolicy,
  useUpdateSlaPolicy,
  useDeleteSlaPolicy,
} from "@/hooks/use-sla";
import { Spinner } from "@/components/ui/spinner";
import { SlaPolicyList } from "@/components/sla/sla-policy-list";
import { SlaPolicyForm } from "@/components/sla/sla-policy-form";
import type { SlaPolicy, CreateSlaPolicyRequest } from "@/lib/types/sla";

export default function SlaPoliciesPage() {
  usePageTitle("SLA Policies");
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SlaPolicy | undefined>();

  const { data: policies, isLoading, isError, refetch } = useSlaPolicies();
  const createMutation = useCreateSlaPolicy();
  const updateMutation = useUpdateSlaPolicy();
  const deleteMutation = useDeleteSlaPolicy();

  const handleCreate = (data: CreateSlaPolicyRequest) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setShowForm(false);
        setEditingPolicy(undefined);
      },
    });
  };

  const handleUpdate = (data: CreateSlaPolicyRequest) => {
    if (!editingPolicy) return;
    updateMutation.mutate(
      { id: editingPolicy.id, data },
      {
        onSuccess: () => {
          setShowForm(false);
          setEditingPolicy(undefined);
        },
      },
    );
  };

  const handleToggle = (id: string, isActive: boolean) => {
    updateMutation.mutate({ id, data: { isActive } });
  };

  const handleEdit = (policy: SlaPolicy) => {
    setEditingPolicy(policy);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this SLA policy?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPolicy(undefined);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/sla"
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </a>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">
            SLA Policies
          </h1>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingPolicy(undefined);
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Policy
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {isError && (
          <div className="rounded-xl bg-error/10 border border-error/20 p-4 text-center">
            <p className="text-[13px] text-error mb-2">
              Failed to load SLA policies
            </p>
            <button
              onClick={() => refetch()}
              className="text-[12px] text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <SlaPolicyForm
            policy={editingPolicy}
            onSubmit={(data) =>
              editingPolicy
                ? handleUpdate(data as CreateSlaPolicyRequest)
                : handleCreate(data as CreateSlaPolicyRequest)
            }
            onCancel={handleCancel}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        )}

        {/* Policy List */}
        {policies && !showForm && (
          <SlaPolicyList
            policies={policies}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isUpdating={updateMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
