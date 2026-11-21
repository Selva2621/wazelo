"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Download, FileX, MessageSquareText } from "lucide-react";
import { publicProposalApi, type PublicProposal } from "@/lib/api/proposals";
import { ProposalDocument } from "@/components/proposals/proposal-document";

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

// Phones: 48px buttons and fields
const btn =
  "inline-flex h-11 max-sm:h-12 items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#1f2328]/40 focus-visible:ring-offset-2 disabled:opacity-50";
const primary = `${btn} bg-[#1f2328] text-white hover:bg-[#32383f]`;
const secondary = `${btn} border border-[#d0d4d9] bg-white text-[#1f2328] hover:bg-[#f6f7f8]`;
const input =
  "max-sm:min-h-12 w-full rounded-lg border border-[#d0d4d9] bg-white px-3 py-2.5 text-[15px] text-[#1f2328] outline-none placeholder:text-[#8b949e] focus:border-[#1f2328] focus:ring-2 focus:ring-[#1f2328]/20";

function Banner({ tone, icon, children }: { tone: "green" | "amber" | "grey"; icon: React.ReactNode; children: React.ReactNode }) {
  const tones = {
    green: "border-[#b7e3c7] bg-[#ecf8f0] text-[#14532d]",
    amber: "border-[#f2d7a6] bg-[#fdf6e7] text-[#713f12]",
    grey: "border-[#d0d4d9] bg-white text-[#31373d]",
  };
  return (
    <div role="status" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-[15px] ${tones[tone]}`}>
      <span className="mt-0.5 shrink-0" aria-hidden>{icon}</span>
      <div>{children}</div>
    </div>
  );
}

function Actions({ token, proposal }: { token: string; proposal: PublicProposal }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"idle" | "accept" | "changes">("idle");
  const [name, setName] = useState(proposal.client.name ?? "");
  const [note, setNote] = useState("");
  const done = (p: PublicProposal) => {
    qc.setQueryData(["public-proposal", token], p);
    setMode("idle");
  };
  const accept = useMutation({ mutationFn: () => publicProposalApi.accept(token, name.trim()), onSuccess: done });
  const changes = useMutation({ mutationFn: () => publicProposalApi.requestChanges(token, note.trim()), onSuccess: done });
  const error = (accept.error ?? changes.error)?.message;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "accept" && name.trim().length >= 2) accept.mutate();
    if (mode === "changes" && note.trim().length >= 2) changes.mutate();
  };

  return (
    <div className="sticky bottom-0 border-t border-[#e6e8eb] bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur print:hidden max-sm:pl-[max(16px,var(--safe-left))] max-sm:pr-[max(16px,var(--safe-right))]">
      <div className="mx-auto max-w-2xl">
        {mode === "idle" ? (
          <div className="flex gap-2">
            <button type="button" className={`${primary} flex-1`} onClick={() => setMode("accept")}>
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Accept
            </button>
            <button type="button" className={`${secondary} flex-1`} onClick={() => setMode("changes")}>
              <MessageSquareText className="h-4 w-4 shrink-0" aria-hidden />
              <span className="sm:hidden">Changes</span>
              <span className="hidden sm:inline">Request changes</span>
            </button>
            <a
              className={`${secondary} max-sm:w-12 max-sm:px-0`}
              href={publicProposalApi.pdfUrl(token)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download PDF"
              title="Download PDF"
            >
              <Download className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">PDF</span>
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-2.5">
            {mode === "accept" ? (
              <>
                <label htmlFor="accept-name" className="block text-[15px] font-medium">
                  Type your name to accept {proposal.number}
                </label>
                <input
                  id="accept-name"
                  className={input}
                  value={name}
                  maxLength={200}
                  autoComplete="name"
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                />
              </>
            ) : (
              <>
                <label htmlFor="change-note" className="block text-[15px] font-medium">
                  What should {proposal.business.name} change?
                </label>
                <textarea
                  id="change-note"
                  className={`${input} resize-y`}
                  rows={3}
                  value={note}
                  maxLength={2000}
                  autoFocus
                  placeholder="e.g. Can we do 3 pages instead of 5 and bring the price down?"
                  onChange={(e) => setNote(e.target.value)}
                />
              </>
            )}
            {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
            <div className="flex gap-2">
              <button type="button" className={secondary} onClick={() => setMode("idle")}>
                Back
              </button>
              <button
                type="submit"
                className={`${primary} flex-1`}
                disabled={accept.isPending || changes.isPending || (mode === "accept" ? name.trim().length < 2 : note.trim().length < 2)}
              >
                {mode === "accept" ? (accept.isPending ? "Accepting…" : "Accept proposal") : changes.isPending ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** What the client opens from WhatsApp: the proposal, with Accept / Request changes / PDF. */
export default function PublicProposalPage() {
  const { token } = useParams<{ token: string }>();
  const { data: p, isLoading, isError } = useQuery({
    queryKey: ["public-proposal", token],
    queryFn: () => publicProposalApi.get(token),
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
        <span className="size-8 animate-spin rounded-full border-2 border-[#d0d4d9] border-t-[#1f2328]" />
      </div>
    );
  }
  if (isError || !p) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-4 text-center max-lg:px-6 max-lg:pb-[var(--safe-bottom)] max-lg:pt-[var(--safe-top)]">
        <FileX className="h-10 w-10 text-[#8b949e]" aria-hidden />
        <h1 className="text-lg font-semibold">This proposal isn&apos;t available</h1>
        <p className="text-[15px] text-[#59636e]">The link may be wrong, or the proposal was withdrawn. Ask the sender for a new link.</p>
      </div>
    );
  }

  const open = (p.status === "SENT" || p.status === "VIEWED") && !p.expired;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-3 py-6 sm:px-4 sm:py-10 print:max-w-none print:p-0 max-sm:pt-[calc(1rem+var(--safe-top))] max-sm:pl-[max(12px,var(--safe-left))] max-sm:pr-[max(12px,var(--safe-right))]">
        {p.status === "ACCEPTED" && (
          <Banner tone="green" icon={<CheckCircle2 className="h-5 w-5" />}>
            <p className="font-medium">Accepted{p.acceptedBy ? ` by ${p.acceptedBy}` : ""} on {day(p.respondedAt)}</p>
            <p>{p.business.name} will be in touch on WhatsApp about next steps.</p>
          </Banner>
        )}
        {p.status === "CHANGES_REQUESTED" && (
          <Banner tone="amber" icon={<MessageSquareText className="h-5 w-5" />}>
            <p className="font-medium">Changes requested</p>
            <p>{p.business.name} will update this proposal and send it to you again.</p>
          </Banner>
        )}
        {p.expired && (
          <Banner tone="grey" icon={<Clock className="h-5 w-5" />}>
            <p className="font-medium">This proposal expired on {day(p.validUntil)}</p>
            <p>Message {p.business.name} on WhatsApp for an updated one.</p>
          </Banner>
        )}

        <ProposalDocument
          className="rounded-xl p-5 shadow-sm sm:p-10 print:rounded-none print:p-0"
          data={{
            number: p.number,
            title: p.title,
            intro: p.intro,
            scope: p.scope,
            items: p.items,
            taxPercent: p.taxPercent,
            currency: p.currency,
            totals: p.totals,
            terms: p.terms,
            validUntil: p.validUntil,
            issuedAt: p.issuedAt,
            clientName: p.client.name,
            businessName: p.business.name,
            businessWebsite: p.business.website,
          }}
        />
        <p className="pb-2 text-center text-xs text-[#8b949e] print:hidden">Sent with Wazelo</p>
      </div>
      {open && <Actions token={token} proposal={p} />}
    </div>
  );
}
