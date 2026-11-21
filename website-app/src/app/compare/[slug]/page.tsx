import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/json-ld";
import { CHECKED_ON, COMPETITORS, competitorBySlug } from "@/components/compare/competitors";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// Same value as APP_REGISTER_URL in lib/wazelo, which is a client module.
const APP_REGISTER_URL = "https://app.wazelo.in/auth/register";
const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const c = competitorBySlug((await params).slug);
  if (!c) return {};
  return pageMetadata({ path: `/compare/${c.slug}`, title: c.seoTitle, description: c.seoDescription });
}

const WHY_WAZELO = [
  "Every lead gets a reply in seconds and a follow-up sequence that stops when they answer.",
  "AI credits, the chatbot, website chat, a deals pipeline and proposals come with the plan.",
  "Plans start at ₹499 a month for 5 users, with a 14-day free trial and no card.",
];

export default async function ComparePage({ params }: Props) {
  const c = competitorBySlug((await params).slug);
  if (!c) notFound();
  const path = `/compare/${c.slug}`;
  const others = COMPETITORS.filter((o) => o.slug !== c.slug);

  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <JsonLd
        data={[
          webPageJsonLd({ path, title: c.seoTitle, description: c.seoDescription }),
          breadcrumbJsonLd([
            { name: "Compare", path: "/compare" },
            { name: `Wazelo vs ${c.name}`, path },
          ]),
        ]}
      />
      <Navbar />

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-20 lg:pt-40">
          <div className="mx-auto max-w-7xl">
            <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
              <Link href="/compare" className={`rounded hover:text-ink ${focusInk}`}>
                Compare
              </Link>
              <span className="mx-2">/</span>
              <span aria-current="page">Wazelo vs {c.name}</span>
            </nav>
            <h1 className="mt-6 max-w-4xl font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">
              Wazelo vs <em className="text-rust">{c.name}</em>
            </h1>
            <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-ink-soft">{c.summary}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link href="/pricing" className={`inline-flex items-center rounded-full border border-ink/20 px-7 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}>
                See Wazelo pricing
              </Link>
            </div>
          </div>
        </section>

        {/* ── At a glance ───────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-4xl leading-[1] tracking-[-0.02em] md:text-5xl">At a glance</h2>
            <div className="mt-10 overflow-x-auto rounded-[1.5rem] border border-ink/10 bg-card/60">
              <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
                <caption className="sr-only">Wazelo and {c.name} compared</caption>
                <thead>
                  <tr className="border-b border-ink/10">
                    <th scope="col" className="w-[22%] p-5 text-xs font-medium uppercase tracking-[0.16em] text-ink-faint lg:p-6">
                      <span className="sr-only">Feature</span>
                    </th>
                    <th scope="col" className="w-[39%] p-5 font-display text-2xl font-normal lg:p-6">
                      {c.name}
                    </th>
                    <th scope="col" className="w-[39%] bg-rust/[0.06] p-5 font-display text-2xl font-normal text-rust lg:p-6">
                      Wazelo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((r) => (
                    <tr key={r.label} className="border-b border-ink/10 last:border-0">
                      <th scope="row" className="p-5 align-top font-medium lg:p-6">
                        {r.label}
                      </th>
                      <td className="p-5 align-top text-ink-soft lg:p-6">{r.them}</td>
                      <td className="bg-rust/[0.06] p-5 align-top lg:p-6">{r.us}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-ink-faint">{c.billingNote}</p>
          </div>
        </section>

        {/* ── Team of 15 ────────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-4xl leading-[1] tracking-[-0.02em] md:text-5xl">
              What a team of 15 <em className="text-rust">pays a month</em>
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-ink/10 p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-faint">{c.name}</p>
                <p className="mt-4 font-display text-6xl leading-none tabular-nums">{c.teamOf15.them}</p>
                <p className="mt-4 text-[15px] text-ink-soft">{c.teamOf15.themMath}</p>
              </div>
              <div className="rounded-[1.5rem] border border-ink bg-card p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rust">Wazelo</p>
                <p className="mt-4 font-display text-6xl leading-none tabular-nums">{c.teamOf15.us}</p>
                <p className="mt-4 text-[15px] text-ink-soft">{c.teamOf15.usMath}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-faint">Subscription only, before taxes and Meta&apos;s WhatsApp message charges.</p>
          </div>
        </section>

        {/* ── Which fits ────────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl leading-tight md:text-4xl">{c.name} may suit you better if</h2>
              <ul className="mt-6 flex flex-col gap-4 text-[15px]">
                {c.chooseThem.map((t) => (
                  <li key={t} className="flex gap-3 text-ink-soft">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-3xl leading-tight md:text-4xl">
                Wazelo fits if you want <em className="text-rust">every lead followed up</em>
              </h2>
              <ul className="mt-6 flex flex-col gap-4 text-[15px]">
                {WHY_WAZELO.map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-rust" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Sources ───────────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl text-sm text-ink-soft">
            <p className="font-semibold text-ink">Where these figures come from</p>
            <p className="mt-2 max-w-[70ch]">
              {c.name} details are from its public pages, checked on {CHECKED_ON}. Prices and plans change, so confirm them on {c.name}&apos;s site. &ldquo;Not listed&rdquo; means
              the feature is not on its pricing page.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {c.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="nofollow noopener" target="_blank" className={`rounded underline underline-offset-4 hover:text-ink ${focusInk}`}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── CTA + other comparisons ───────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] tracking-[-0.02em]">
              See it with <em className="text-rust">your own leads.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-[40ch] text-lg text-ink-soft">Free for 14 days. No credit card.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
            <p className="mt-12 text-sm text-ink-soft">
              Also compare:{" "}
              {others.map((o, i) => (
                <span key={o.slug}>
                  {i > 0 && " · "}
                  <Link href={`/compare/${o.slug}`} className={`rounded font-semibold text-rust underline-offset-4 hover:underline ${focusInk}`}>
                    Wazelo vs {o.name}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        </section>
      </main>

      <Footer showCta={false} />
    </div>
  );
}
