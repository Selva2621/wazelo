"use client";

// Shared layout for every /features/<slug> page: split hero with the feature's
// illustration (public/illustrations/feature-<slug>.svg), a capability bento,
// the setup steps, the page's live demo, and a closing call to action.

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import SiteNavbar from "@/components/Navbar";
import SiteFooter from "@/components/Footer";
import { SiteBackdrop } from "@/components/site-backdrop";
import { Illustration } from "@/components/illustration";
import { Reveal } from "@/components/home/reveal";
import { easeOut } from "@/components/mocks/motion";
import { APP_REGISTER_URL } from "@/lib/wazelo";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FeatureDetailData {
  slug: string;
  tag: string;
  heroTitle: string;
  heroSubtitle: string;
  overviewTitle: string;
  overviewDesc: string;
  capabilities: { icon: string; title: string; desc: string }[];
  howItWorks: { step: string; title: string; desc: string }[];
  relatedFeatures: { label: string; href: string; icon: string }[];
  /** Grouped specifics (e.g. every trigger, every filter), shown as pills. */
  details?: { title: string; items: string[] }[];
  /** Short questions and plain answers, shown as an accordion. */
  faqs?: { q: string; a: string }[];
  interactiveSection?: ReactNode;
}

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";
const primaryBtn = `group inline-flex items-center gap-2 rounded-full bg-primary-container px-7 py-3.5 text-base font-semibold text-on-primary transition-colors duration-200 hover:bg-primary active:scale-[0.98] ${focusRing}`;

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ data }: { data: FeatureDetailData }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="site-aurora" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-28 sm:px-6 lg:min-h-[86dvh] lg:grid-cols-2 lg:gap-16 lg:px-8 lg:pb-20 lg:pt-24">
        <div>
          <Reveal>
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm">
              <Link href="/#features" className={`rounded text-placeholder transition-colors hover:text-on-surface ${focusRing}`}>
                Features
              </Link>
              <span aria-hidden className="text-placeholder">/</span>
              <span aria-current="page" className="font-medium text-on-surface-variant">
                {data.tag}
              </span>
            </nav>
          </Reveal>
          <Reveal delay={0.05}>
            <h1
              className="text-4xl font-semibold leading-[1.04] tracking-tighter text-on-surface sm:text-5xl lg:text-6xl"
              dangerouslySetInnerHTML={{ __html: data.heroTitle }}
            />
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-on-surface-variant">{data.heroSubtitle}</p>
          </Reveal>
          <Reveal delay={0.2} className="mt-9 flex flex-wrap items-center gap-3">
            <a href={APP_REGISTER_URL} className={primaryBtn}>
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <Link
              href="/#features"
              className={`inline-flex items-center rounded-full border border-outline-variant px-6 py-3.5 text-base font-medium text-on-surface transition-colors duration-200 hover:border-on-surface-variant active:scale-[0.98] ${focusRing}`}
            >
              All features
            </Link>
          </Reveal>
        </div>

        {/* Fixed-height slot so the page doesn't shift when the SVG loads. */}
        <div className="relative h-64 sm:h-80 lg:h-[30rem]">
          <Illustration name={`feature-${data.slug}`} label={`${data.tag} illustration`} className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ data }: { data: FeatureDetailData }) {
  return (
    <section className="border-t border-outline-variant/50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="max-w-3xl">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-on-surface md:text-4xl">{data.overviewTitle}</h2>
          <p className="mt-6 max-w-[65ch] text-lg leading-relaxed text-on-surface-variant">{data.overviewDesc}</p>
        </Reveal>
      </div>
    </section>
  );
}

// ─── Capabilities bento ───────────────────────────────────────────────────────
// Six cells: a 2x2 lead tile, two stacked beside it, then a row of three.
// At md (2 columns) the last tile spans the row so no cell is left empty.
const BENTO_CELLS = [
  "md:col-span-2 lg:row-span-2 bg-primary-container/10 border-primary-container/25",
  "lg:col-start-3 bg-surface-container-lowest border-outline-variant/60",
  "lg:col-start-3 bg-surface-container-lowest border-outline-variant/60",
  "bg-surface-container-high border-transparent",
  "bg-surface-container-lowest border-outline-variant/60",
  "md:col-span-2 lg:col-span-1 bg-surface-container-high border-transparent",
];

function Capabilities({ items }: { items: FeatureDetailData["capabilities"] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <Reveal>
        <h2 className="text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">What you can do</h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((c, i) => {
          const lead = i === 0;
          return (
            <Reveal key={c.title} delay={0.05 * i} className={`rounded-2xl border ${BENTO_CELLS[i % BENTO_CELLS.length]}`}>
              <div className={`flex h-full flex-col ${lead ? "justify-between gap-10 p-8 lg:min-h-[22rem] lg:p-10" : "p-6"}`}>
                <Icon
                  name={c.icon}
                  className={lead ? "!text-[44px] text-primary-container" : "!text-[26px] text-primary-container"}
                />
                <div className={lead ? "" : "mt-5"}>
                  <h3 className={`font-semibold text-on-surface ${lead ? "text-2xl tracking-tight md:text-3xl" : "text-base"}`}>{c.title}</h3>
                  <p className={`mt-2 leading-relaxed text-on-surface-variant ${lead ? "max-w-[44ch] text-base" : "text-sm"}`}>{c.desc}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

// ─── In detail ────────────────────────────────────────────────────────────────
function Details({ groups }: { groups: NonNullable<FeatureDetailData["details"]> }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
      <Reveal>
        <h2 className="text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">In detail</h2>
      </Reveal>
      <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g, i) => (
          <Reveal key={g.title} delay={0.06 * i}>
            <h3 className="border-t border-outline-variant/60 pt-5 text-base font-semibold text-on-surface">{g.title}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {g.items.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-outline-variant/70 bg-surface-container-lowest px-3 py-1.5 text-sm text-on-surface-variant"
                >
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
// No FAQPage JSON-LD here: the root layout already emits the site-wide one,
// and a page should carry only one.
function Faqs({ items }: { items: NonNullable<FeatureDetailData["faqs"]> }) {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8 lg:pt-28">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">Questions</h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="divide-y divide-outline-variant/50 border-y border-outline-variant/50">
            {items.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className={`flex cursor-pointer list-none items-start justify-between gap-6 rounded text-base font-medium text-on-surface [&::-webkit-details-marker]:hidden ${focusRing}`}>
                  {f.q}
                  <Icon name="add" className="!text-[20px] shrink-0 text-placeholder transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-on-surface-variant">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function Steps({ steps }: { steps: FeatureDetailData["howItWorks"] }) {
  const reduce = useReducedMotion();
  return (
    <section className="border-y border-outline-variant/50 bg-surface-container-low/60">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">Up and running in minutes</h2>
        </Reveal>
        <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((s, i) => (
            <li key={s.title}>
              {/* The progress rule fills left to right as the steps enter, in order. */}
              <div className="h-0.5 w-full overflow-hidden rounded-full bg-outline-variant/60">
                <motion.div
                  className="h-full origin-left bg-primary-container"
                  initial={reduce ? false : { scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.7, delay: 0.25 * i, ease: easeOut }}
                />
              </div>
              <Reveal delay={0.25 * i + 0.1}>
                <h3 className="mt-6 text-lg font-semibold text-on-surface">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{s.desc}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─── Closing: call to action + related features ───────────────────────────────
function Closing({ data }: { data: FeatureDetailData }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <Reveal className="grid overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-container-low lg:grid-cols-[1.25fr_1fr]">
        <div className="flex flex-col gap-8 p-8 sm:flex-row sm:items-center lg:p-12">
          <div className="relative h-36 w-48 shrink-0">
            <Illustration name="success" className="h-full w-full" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-on-surface md:text-4xl">
              Ready to try <span className="text-primary-container">{data.tag}</span>?
            </h2>
            <p className="mt-3 text-base text-on-surface-variant">Free trial. No credit card. Set up in minutes.</p>
            <a href={APP_REGISTER_URL} className={`mt-7 ${primaryBtn}`}>
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        <nav aria-label="Related features" className="border-t border-outline-variant/60 p-8 lg:border-l lg:border-t-0 lg:p-12">
          <h3 className="text-sm font-medium text-placeholder">Related features</h3>
          <ul className="mt-4 divide-y divide-outline-variant/50">
            {data.relatedFeatures.map((f) => (
              <li key={f.href}>
                <Link href={f.href} className={`group flex items-center gap-3 rounded py-3.5 text-on-surface transition-colors hover:text-primary-container ${focusRing}`}>
                  <Icon name={f.icon} className="!text-[20px] text-primary-container" />
                  <span className="flex-1 font-medium">{f.label}</span>
                  <ArrowUpRight className="h-4 w-4 text-placeholder transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary-container" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Reveal>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FeatureDetailPage({ data }: { data: FeatureDetailData }) {
  return (
    <div className="relative isolate min-h-dvh bg-surface font-sans text-on-surface">
      <SiteBackdrop />
      <SiteNavbar activePage="Features" />
      <main>
        <Hero data={data} />
        <Overview data={data} />
        <Capabilities items={data.capabilities} />
        {data.details?.length ? <Details groups={data.details} /> : null}
        <Steps steps={data.howItWorks} />
        {data.interactiveSection && (
          <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6 lg:px-8 lg:pt-28">
            <Reveal>{data.interactiveSection}</Reveal>
          </section>
        )}
        {data.faqs?.length ? <Faqs items={data.faqs} /> : null}
        <Closing data={data} />
      </main>
      <SiteFooter />
    </div>
  );
}
