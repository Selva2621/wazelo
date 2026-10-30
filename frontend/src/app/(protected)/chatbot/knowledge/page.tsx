"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { UnansweredCard } from "@/components/knowledge/unanswered-card";
import { HandoverCard } from "@/components/knowledge/handover-card";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { aiApi } from "@/lib/api/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { FaqsCard } from "@/components/knowledge/faqs-card";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { PageHeader } from "@/components/layout/page-header";
import {
  FilesCard,
  InstructionsCard,
  WebsitesCard,
  costOf,
  credits,
  errorMessage,
  knowledgeCard as card,
} from "@/components/knowledge/knowledge-cards";

const sectionTitle = "text-body-lg font-medium text-on-surface";
const hint = "text-label text-on-surface-variant";

/* ─── Test chat ─── */

interface ChatTurn {
  id: number;
  role: "you" | "bot";
  text: string;
  sources?: { title: string; url?: string | null }[];
  missed?: boolean;
}

function TestChat({ askCost }: { askCost: number }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, asking]);

  const ask = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 2 || asking) return;
    setQuestion("");
    setTurns((t) => [...t, { id: Date.now(), role: "you", text: q }]);
    setAsking(true);
    try {
      const r = await aiApi.kbSearch(q);
      setTurns((t) => [
        ...t,
        r.answer
          ? { id: Date.now() + 1, role: "bot", text: r.answer, sources: r.sources }
          : {
              id: Date.now() + 1,
              role: "bot",
              missed: true,
              text: "Not in your knowledge yet — on WhatsApp the bot would say a team member will reply. Add it to your website, a file or the instructions.",
            },
      ]);
    } catch (err) {
      setTurns((t) => [...t, { id: Date.now() + 1, role: "bot", missed: true, text: errorMessage(err, "Couldn't get an answer") }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <aside id="test-bot" aria-labelledby="test-heading" className={cn(card, "max-lg:scroll-mt-4 flex h-[calc(100dvh-10rem)] min-h-[420px] flex-col overflow-hidden lg:sticky lg:top-[calc(var(--header-height)+1rem)] lg:h-[calc(100dvh-var(--header-height)-2rem)]")}>
      <div className="border-b border-outline-variant px-5 py-4">
        <h2 id="test-heading" className={cn(sectionTitle, "flex items-center gap-2")}>
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          Test your bot
        </h2>
        <p className={hint}>Ask what customers ask. Each question uses {credits(askCost)}.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {turns.length === 0 && !asking && (
          <p className="pt-8 text-center text-body text-on-surface-variant">
            Try &ldquo;What are your prices?&rdquo; or &ldquo;Do you deliver?&rdquo;
          </p>
        )}
        {turns.map((t) => (
          <div key={t.id} className={cn("flex", t.role === "you" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-body",
                t.role === "you" && "rounded-br-sm bg-primary text-on-primary",
                t.role === "bot" && !t.missed && "rounded-bl-sm bg-surface-container-high text-on-surface",
                t.missed && "rounded-bl-sm border border-dashed border-outline text-on-surface-variant",
              )}
            >
              <p className="whitespace-pre-wrap">{t.text}</p>
              {t.sources && t.sources.length > 0 && (
                <p className="mt-1.5 flex flex-wrap gap-x-2 text-label text-on-surface-variant">
                  {t.sources.map((s, i) =>
                    s.url ? (
                      <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                        {s.title.split("|")[0].trim()}
                      </a>
                    ) : (
                      <span key={i}>{s.title.split("|")[0].trim()}</span>
                    ),
                  )}
                </p>
              )}
            </div>
          </div>
        ))}
        {asking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-surface-container-high px-3.5 py-2.5"><Spinner size="sm" /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={ask} className="flex gap-2 border-t border-outline-variant p-3">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something…"
          aria-label="Test question"
          maxLength={500}
        />
        <Button type="submit" aria-label="Ask" disabled={question.trim().length < 2 || asking} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </aside>
  );
}

export default function ChatbotKnowledgePage() {
  usePageTitle("Bot knowledge");
  const { data: creditsData } = useAiCredits();
  const buildCost = costOf(creditsData?.costs, "kb_build", 10);
  const askCost = costOf(creditsData?.costs, "kb_search", 1);
  const faqCost = costOf(creditsData?.costs, "faq_generate", 3);

  return (
    // No overflow wrapper here: the window scrolls, so the test chat can stick beside the cards
    <div>
      {/* Mobile: the test chat sits below a long list, so offer a jump to it */}
      <MobilePageActions
        more={[{ label: "Test your bot", onSelect: () => document.getElementById("test-bot")?.scrollIntoView({ behavior: "smooth" }) }]}
      />
      <div className="mx-auto max-w-6xl space-y-5 p-6">
        <div className="space-y-1">
          <Link href="/chatbot" className="inline-flex items-center gap-1 rounded-md text-label text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus max-lg:hidden">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Chatbot
          </Link>
          <PageHeader
            className="max-lg:hidden"
            title="Bot knowledge"
            description={
              <>
                What your bot answers from. Turn on &ldquo;Use knowledge base&rdquo; in a flow to use it. The same knowledge is in{" "}
                <Link href="/settings?tab=ai-memory" className="font-medium text-primary hover:underline">
                  Settings → Business Knowledge
                </Link>
                .
              </>
            }
          />
          {/* Phones/tablets: the nav bar has the title */}
          <p className="text-body text-on-surface-variant lg:hidden">
            What your bot answers from. Turn on &ldquo;Use knowledge base&rdquo; in a flow to use it.
          </p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5">
            <div data-tour="kb-websites"><WebsitesCard buildCost={buildCost} /></div>
            <div data-tour="kb-unanswered"><UnansweredCard className={card} /></div>
            <div data-tour="kb-faqs"><FaqsCard suggestCost={faqCost} className={card} /></div>
            <div data-tour="kb-files"><FilesCard /></div>
            <div data-tour="kb-instructions"><InstructionsCard /></div>
            <div data-tour="kb-handover"><HandoverCard className={card} /></div>
          </div>
          <TestChat askCost={askCost} />
        </div>
      </div>
    </div>
  );
}
