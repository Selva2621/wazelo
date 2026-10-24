"use client";

import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { useCreateProposal } from "@/hooks/use-proposals";
import { useContactDeals } from "@/hooks/use-deals";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface NewProposalButtonProps {
  contactId: string;
  /** Link to this deal; when omitted, the contact's open deal (if any) is used */
  dealId?: string;
  className?: string;
  label?: string;
}

/** Creates a draft proposal for the contact (prefilled from the deal) and opens the editor. */
export function NewProposalButton({ contactId, dealId, className, label = "Send proposal" }: NewProposalButtonProps) {
  const router = useRouter();
  const create = useCreateProposal();
  const { data: deals } = useContactDeals(dealId ? null : contactId);
  const openDeal = dealId ?? deals?.find((d) => d.status === "OPEN")?.id;

  return (
    <button
      type="button"
      disabled={create.isPending}
      onClick={() =>
        create.mutate(
          { contactId, ...(openDeal && { dealId: openDeal }) },
          {
            onSuccess: (p) => router.push(`/proposals/${p.id}`),
            onError: (err) => toast.error(err.message || "Couldn't create the proposal"),
          },
        )
      }
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-body font-medium transition-colors disabled:opacity-60",
        "border-outline-variant/30 text-on-surface hover:border-outline-variant/50 hover:bg-surface-container",
        className,
      )}
    >
      {create.isPending ? <Spinner size="sm" /> : <FileText className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />}
      {label}
    </button>
  );
}
