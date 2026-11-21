import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/json-ld";
import { CHECKED_ON, COMPETITORS } from "@/components/compare/competitors";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const seo = {
  path: "/compare",
  title: "Compare Wazelo with Wati, Interakt and AiSensy",
  description:
    "Side-by-side comparisons of Wazelo with Wati, Interakt and AiSensy: price, users, follow-up sequences, AI replies, chatbot and sales pipeline.",
};

export const metadata = pageMetadata(seo);

export default function CompareHub() {
  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Compare", path: seo.path }])]} />
      <Navbar />

      <main className="px-4 pb-28 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Compare</p>
          <h1 className="mt-5 max-w-4xl font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">
            Choosing a <em className="text-rust">WhatsApp CRM?</em>
          </h1>
          <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-ink-soft">
            See how Wazelo compares on price, users, follow-up, AI and sales pipeline. Figures come from each company&apos;s own pages, checked on {CHECKED_ON}.
          </p>

          <ul className="mt-14 grid gap-5 md:grid-cols-3">
            {COMPETITORS.map((c) => (
              <li key={c.slug} className="min-w-0">
                <Link
                  href={`/compare/${c.slug}`}
                  className={`group flex h-full flex-col rounded-[1.5rem] border border-ink/10 bg-card/60 p-8 transition-colors hover:border-ink/30 ${focusInk}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="font-display text-3xl">Wazelo vs {c.name}</span>
                    <ArrowUpRight className="mt-2 h-5 w-5 shrink-0 text-ink-faint transition-colors group-hover:text-rust" />
                  </span>
                  <span className="mt-4 text-[15px] leading-relaxed text-ink-soft">{c.summary}</span>
                  <span className="mt-6 text-sm text-ink-soft">
                    Team of 15: <strong className="font-semibold text-ink">{c.teamOf15.us}</strong> on Wazelo vs {c.teamOf15.them} a month
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
