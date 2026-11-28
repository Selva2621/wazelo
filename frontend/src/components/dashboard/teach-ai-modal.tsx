"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles, X } from "lucide-react";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { useKbDocuments, useKbWebsites } from "@/hooks/use-knowledge-base";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { FaqsCard } from "@/components/knowledge/faqs-card";
import { FilesCard, WebsitesCard, costOf, knowledgeCard } from "@/components/knowledge/knowledge-cards";

/** The cards and the footer status (only mounted while the popup is open) */
function TeachAiBody({ done, onClose }: { done: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: creditsData } = useAiCredits();
  const buildCost = costOf(creditsData?.costs, "kb_build", 10);
  const faqCost = costOf(creditsData?.costs, "faq_generate", 3);

  const { data: websites } = useKbWebsites();
  const { data: documents } = useKbDocuments();
  const reading = (websites ?? []).some((s) => s.status === "QUEUED" || s.status === "CRAWLING");
  const processing = (documents ?? []).some((d) => d.status === "PROCESSING");

  // Files have no live updates: check again while one is being processed, so the step
  // ticks itself without a page reload
  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => qc.invalidateQueries({ queryKey: ["kb", "documents"] }), 3000);
    return () => window.clearInterval(timer);
  }, [processing, qc]);

  return (
    <>
      <div className="mb-5 flex items-center gap-3 pr-8">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 id="teach-ai-title" className="text-title font-semibold text-on-surface">
            Teach your AI assistant
          </h2>
          <p className="text-label text-on-surface-variant">Add at least one: your website, a file or FAQs.</p>
        </div>
      </div>
      <IconButton size="xs" onClick={onClose} aria-label="Close" className="absolute right-4 top-4">
        <X className="h-4 w-4" />
      </IconButton>

      <div className="space-y-4">
        <WebsitesCard buildCost={buildCost} />
        <FilesCard />
        <FaqsCard suggestCost={faqCost} className={knowledgeCard} />
      </div>

      <ModalFooter className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="flex items-center gap-2 text-label text-on-surface-variant">
          {done ? (
            <>
              <span className="grid size-5 place-items-center rounded-full bg-success text-white">
                <Check className="h-3 w-3" aria-hidden />
              </span>
              Your AI can answer now
            </>
          ) : reading || processing ? (
            <>
              <Spinner size="sm" /> Reading… about a minute
            </>
          ) : (
            "Nothing added yet"
          )}
        </p>
        <Button size="lg" disabled={!done} onClick={onClose} className="max-lg:flex-1">
          Continue
        </Button>
      </ModalFooter>
    </>
  );
}

/**
 * Setup step 2, asked on the dashboard itself: the same website, file and FAQ cards as
 * the AI assistant page, so both edit the same knowledge.
 */
export function TeachAiModal({ open, onClose, done }: { open: boolean; onClose: () => void; done: boolean }) {
  return (
    <Modal open={open} onClose={onClose} aria-labelledby="teach-ai-title" className="max-w-2xl p-6">
      {() => <TeachAiBody done={done} onClose={onClose} />}
    </Modal>
  );
}
