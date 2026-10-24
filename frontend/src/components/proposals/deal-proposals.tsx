"use client";

import Link from "next/link";
import { useProposals } from "@/hooks/use-proposals";
import { money } from "./proposal-document";
import { ProposalStatusBadge } from "./proposal-status-badge";
import { NewProposalButton } from "./new-proposal-button";

/** A deal's proposals, with a button to start a new one (open deals only). */
export function DealProposals({ dealId, contactId, open }: { dealId: string; contactId: string; open: boolean }) {
  const { data } = useProposals({ dealId });

  return (
    <div className="space-y-2 rounded-xl bg-surface-container/50 p-3.5">
      <p className="text-label font-medium text-on-surface-variant">Proposals</p>
      {!!data?.length && (
        <ul className="space-y-1">
          {data.map((p) => (
            <li key={p.id}>
              <Link
                href={`/proposals/${p.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-body hover:bg-surface-container"
              >
                <span className="text-on-surface">{p.number}</span>
                <span className="tabular-nums text-on-surface-variant">{money(p.total, p.currency)}</span>
                <span className="ml-auto">
                  <ProposalStatusBadge status={p.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {open && <NewProposalButton contactId={contactId} dealId={dealId} label={data?.length ? "New proposal" : "Send proposal"} />}
    </div>
  );
}
