"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_MOTION } from "@/lib/gsap";
import { FEATURE_GROUPS } from "@/components/features/feature-groups";

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default function FeaturesClient() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.1 } })
          .from("[data-fh=head] > *", { y: 40, autoAlpha: 0, stagger: 0.1 });
        gsap.utils.toArray<HTMLElement>("[data-fh=group]").forEach((g) =>
          gsap.from(g.querySelectorAll("[data-fh=card]"), {
            y: 50,
            autoAlpha: 0,
            stagger: 0.07,
            duration: 1,
            ease: "expo.out",
            scrollTrigger: { trigger: g, start: "top 78%", once: true },
          }),
        );
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      <Navbar activePage="Features" />

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-20 lg:pt-40">
          <div data-fh="head" className="mx-auto max-w-7xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Features</p>
            <h1 className="mt-5 max-w-4xl font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">
              Every lead, <em className="text-rust">followed up.</em>
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
              Wazelo catches leads from your ads, your website and WhatsApp, answers them in seconds and keeps following up until they buy.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link href="/pricing" className={`inline-flex items-center rounded-full border border-ink/20 px-7 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}>
                See pricing
              </Link>
            </div>

            {/* The four stages, in the order a lead moves through them */}
            <nav aria-label="Feature groups" className="mt-14 flex flex-wrap gap-2">
              {FEATURE_GROUPS.map((g, i) => (
                <a
                  key={g.key}
                  href={`#${g.key}`}
                  className={`inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm transition-colors hover:border-ink/40 ${focusInk}`}
                >
                  <span className="font-mono text-xs text-ink-faint">0{i + 1}</span>
                  {g.name}
                </a>
              ))}
            </nav>
          </div>
        </section>

        {/* ── Journey sections ──────────────────────────────────────────── */}
        {FEATURE_GROUPS.map((g, i) => (
          <section key={g.key} id={g.key} data-fh="group" className="scroll-mt-20 border-t border-ink/10 px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <div className="lg:sticky lg:top-28">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-rust">
                    0{i + 1} · {g.name}
                  </p>
                  <h2 className="mt-4 font-display text-4xl leading-[1] tracking-[-0.02em] md:text-5xl">{g.title}</h2>
                  <p className="mt-5 max-w-[36ch] text-base leading-relaxed text-ink-soft">{g.intro}</p>
                </div>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
                {g.items.map((it) => (
                  <li key={it.href} data-fh="card" className="min-w-0">
                    <Link
                      href={it.href}
                      className={`group flex h-full flex-col rounded-[1.25rem] border border-ink/10 bg-card/60 p-6 transition-colors hover:border-ink/30 ${focusInk}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                          {it.label}
                          {it.isNew && <span className="rounded-full bg-rust/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rust">New</span>}
                        </span>
                        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-rust" />
                      </span>
                      <span className="mt-3 text-[15px] leading-relaxed text-ink-soft">{it.desc}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-28 sm:px-6 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
              See it with <em className="text-rust">your own leads.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-[40ch] text-lg text-ink-soft">Free for 14 days. No credit card.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link href="/pricing" className={`inline-flex items-center rounded-full border border-ink/20 px-8 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}>
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer showCta={false} />
    </div>
  );
}
