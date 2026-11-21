import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/json-ld";
import { LoopVideo } from "@/components/home/loop-video";
import { ALL_FEATURES, type FeatureItem } from "@/components/features/feature-groups";
import { bothPrices, num, planBySlug } from "@/components/pricing/plans";
import { USE_CASES, useCaseBySlug } from "@/components/use-cases/use-cases";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

// Same value as APP_REGISTER_URL in lib/wazelo, which is a client module.
const APP_REGISTER_URL = "https://app.wazelo.in/auth/register";
const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const u = useCaseBySlug((await params).slug);
  if (!u) return {};
  return pageMetadata({ path: `/use-cases/${u.slug}`, title: u.seoTitle, description: u.seoDescription });
}

export default async function UseCasePage({ params }: Props) {
  const u = useCaseBySlug((await params).slug);
  if (!u) notFound();
  const path = `/use-cases/${u.slug}`;
  const features = u.features
    .map((href) => ALL_FEATURES.find((f) => f.href === href))
    .filter((f): f is FeatureItem => f !== undefined);
  const plans = u.plan.slugs.map(planBySlug);
  const others = USE_CASES.filter((o) => o.slug !== u.slug);

  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <JsonLd
        data={[
          webPageJsonLd({ path, title: u.seoTitle, description: u.seoDescription }),
          breadcrumbJsonLd([
            { name: "Use cases", path: "/use-cases" },
            { name: u.name, path },
          ]),
        ]}
      />
      <Navbar activePage="Use Cases" />

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-24 lg:pt-40">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-6">
              <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
                <Link href="/use-cases" className={`rounded hover:text-ink ${focusInk}`}>
                  Use cases
                </Link>
                <span className="mx-2">/</span>
                <span aria-current="page">{u.name}</span>
              </nav>
              <p className="mt-6 text-xs font-medium uppercase tracking-[0.22em] text-rust">{u.kicker}</p>
              <h1 className="mt-4 font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
                {u.title[0]} <em className="text-rust">{u.title[1]}</em>
              </h1>
              <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">{u.subtitle}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
                  Start free trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <Link href="/pricing" className={`inline-flex items-center rounded-full border border-ink/20 px-7 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}>
                  See pricing
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6">
              {u.media.kind === "photo" ? (
                <div className="mx-auto max-w-md overflow-hidden rounded-[1.5rem] bg-paper-deep lg:max-w-none">
                  <Image src={u.media.src} alt={u.media.alt} width={u.media.width} height={u.media.height} priority sizes="(min-width: 1024px) 45vw, 100vw" className="h-auto w-full" />
                </div>
              ) : (
                <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-[0_40px_90px_-40px_rgba(60,40,20,0.45),0_0_0_1px_rgba(23,19,15,0.08)]">
                  <LoopVideo src={`/media/story/${u.media.clip}.mp4`} poster={`/media/story/${u.media.clip}.jpg`} label={u.media.label} priority />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── One lead's story ──────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="font-display text-4xl leading-[1] tracking-[-0.02em] md:text-5xl">
                One lead, <em className="text-rust">start to finish</em>
              </h2>
              <p className="mt-5 max-w-[36ch] text-base leading-relaxed text-ink-soft">{u.storyIntro}</p>
            </div>
            {/* Time column 4.25rem + 1.5rem gap = 5.75rem: the rule and each dot sit on that line. */}
            <ol className="relative lg:col-span-7 lg:col-start-6">
              <span aria-hidden className="absolute bottom-3 left-[5.75rem] top-3 w-px bg-ink/15" />
              {u.timeline.map((s, i) => (
                <li key={`${s.when}-${i}`} className="relative grid grid-cols-[4.25rem_1fr] gap-x-6 pb-8 last:pb-0">
                  <span className="pt-0.5 text-right font-mono text-sm tabular-nums text-rust">{s.when}</span>
                  <span className="relative pl-6 text-[17px] leading-snug">
                    <span aria-hidden className="absolute left-[-0.3125rem] top-2 size-2.5 rounded-full border-2 border-paper bg-rust" />
                    {s.what}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Highlight ─────────────────────────────────────────────────── */}
        <section className="tone-fixed bg-ink px-4 py-20 text-paper sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-4xl leading-[1.05] tracking-[-0.02em] md:text-5xl">{u.highlight.title}</h2>
            <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-paper/75">{u.highlight.body}</p>
          </div>
        </section>

        {/* ── Features used ─────────────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-4xl leading-[1] tracking-[-0.02em] md:text-5xl">What you&apos;ll use</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <li key={f.href} className="min-w-0">
                  <Link href={f.href} className={`group flex h-full flex-col rounded-[1.25rem] border border-ink/10 bg-card/60 p-6 transition-colors hover:border-ink/30 ${focusInk}`}>
                    <span className="flex items-start justify-between gap-3 text-lg font-semibold">
                      {f.label}
                      <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-rust" />
                    </span>
                    <span className="mt-3 text-[15px] leading-relaxed text-ink-soft">{f.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── In-depth guide ────────────────────────────────────────────── */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="mx-auto max-w-7xl">
            <Link
              href={u.guide.href}
              className={`group flex flex-col gap-4 rounded-[1.5rem] border border-ink/10 bg-paper-deep/50 p-8 transition-colors hover:border-ink/30 md:flex-row md:items-center md:justify-between ${focusInk}`}
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-rust">The full playbook</span>
                <span className="mt-3 block font-display text-3xl leading-tight">{u.guide.title}</span>
                <span className="mt-2 block max-w-[60ch] text-[15px] leading-relaxed text-ink-soft">{u.guide.blurb}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-rust">
                Read the guide
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </section>

        {/* ── Plan ──────────────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-display text-4xl leading-[1] tracking-[-0.02em] md:text-5xl">The plan that fits</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {plans.map((p) => (
                <div key={p.slug} className="rounded-[1.5rem] border border-ink/10 bg-card/60 p-8">
                  <p className="font-display text-3xl">{p.name}</p>
                  <p className="mt-3 text-lg">{bothPrices(p.price)} a month</p>
                  <p className="mt-3 text-[15px] text-ink-soft">
                    {p.users} {p.users === 1 ? "user" : "users"}, {p.numbers} WhatsApp {p.numbers === 1 ? "number" : "numbers"}, {num(p.messages)} messages and {num(p.aiCredits)} AI credits a month
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[15px] text-ink-soft">
              {u.plan.note}{" "}
              <Link href="/pricing" className={`rounded font-semibold text-rust underline-offset-4 hover:underline ${focusInk}`}>
                Compare every plan
              </Link>
            </p>
          </div>
        </section>

        {/* ── CTA + other use cases ─────────────────────────────────────── */}
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
              Also see:{" "}
              {others.map((o, i) => (
                <span key={o.slug}>
                  {i > 0 && " · "}
                  <Link href={`/use-cases/${o.slug}`} className={`rounded font-semibold text-rust underline-offset-4 hover:underline ${focusInk}`}>
                    {o.name}
                  </Link>
                </span>
              ))}
              {" · "}
              <Link href="/use-cases" className={`rounded font-semibold text-rust underline-offset-4 hover:underline ${focusInk}`}>
                All use cases
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer showCta={false} />
    </div>
  );
}
