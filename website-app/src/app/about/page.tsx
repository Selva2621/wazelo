"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, ScrollTrigger, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const TIMELINE = [
  { when: "2024", what: "The idea: one place to follow up every lead a small business gets." },
  { when: "Q1 2025", what: "First version ships with a shared inbox and campaigns." },
  { when: "Q2 2025", what: "Automation rules and the chatbot builder arrive." },
  { when: "Now", what: "Meta lead ads, website chat, an AI assistant, proposals and a mobile app." },
];

const VALUES = [
  { title: "Speed", desc: "A lead that waits goes cold. We build for the reply that goes out in seconds." },
  { title: "Privacy", desc: "Your conversations are yours. We don't sell your data." },
  { title: "Simplicity", desc: "Powerful doesn't have to mean complicated. Clarity comes first." },
  { title: "Follow-through", desc: "The sale is usually in the fifth message, not the first. Wazelo remembers to send it." },
];

const PHOTOS = [
  { img: "realty", who: "Realtors" },
  { img: "coaching-desk", who: "Coaching institutes" },
  { img: "boutique", who: "Shops and boutiques" },
];

export default function AboutPage() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.1 } })
          .from("[data-ab=kicker]", { y: 12, autoAlpha: 0, duration: 0.7 })
          .from("[data-ab=title]", { y: 50, autoAlpha: 0 }, 0.1)
          .from("[data-ab=sub]", { y: 24, autoAlpha: 0 }, 0.3)
          .from("[data-ab=cta]", { y: 20, autoAlpha: 0, stagger: 0.08 }, 0.4)
          .from("[data-ab=hero-photo]", { y: 90, autoAlpha: 0, duration: 1.4 }, 0.45);

        const rise = (sel: string, trigger: string, stagger = 0.1) =>
          gsap.from(sel, { y: 50, autoAlpha: 0, stagger, duration: 1, ease: "expo.out", scrollTrigger: { trigger, start: "top 78%", once: true } });
        rise("[data-ab=mission] > *", "[data-ab=mission]", 0.12);
        rise("[data-ab=story] > *", "[data-ab=story]", 0.12);
        rise("[data-ab=when]", "[data-ab=timeline]", 0.1);
        rise("[data-ab=value]", "[data-ab=values]", 0.08);
        rise("[data-ab=end] > *", "[data-ab=end]", 0.12);
        ScrollTrigger.batch("[data-ab=photo-card]", {
          start: "top 85%",
          once: true,
          onEnter: (els) => gsap.from(els, { y: 80, autoAlpha: 0, stagger: 0.12, duration: 1.2, ease: "expo.out" }),
        });
      });
      mm.add(MQ_FULL, () => {
        // Photo cards drift a little as the page scrolls past (photos are never cropped).
        gsap.utils.toArray<HTMLElement>("[data-ab=drift]").forEach((el) =>
          gsap.fromTo(el, { y: -18 }, { y: 18, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } }),
        );
        gsap.fromTo("[data-ab=line]", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-ab=timeline]", start: "top 75%", end: "bottom 60%", scrub: 0.6 } });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      <SiteNavbar activePage="About" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pb-32 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p data-ab="kicker" className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">About Wazelo</p>
            <h1 data-ab="title" className="mt-6 font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">
              We built the tool <em className="text-rust">we kept wishing for.</em>
            </h1>
            <p data-ab="sub" className="mt-8 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
              Wazelo is the lead follow-up platform. It catches every lead, replies fast and keeps following up until they buy.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a data-ab="cta" href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link data-ab="cta" href="/#features" className={`inline-flex items-center rounded-full border border-ink/20 px-7 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}>
                See the product
              </Link>
            </div>
          </div>

          <div data-ab="hero-photo" className="relative mt-16 lg:mt-24">
            <div data-ab="drift" className="overflow-hidden rounded-[1.5rem] bg-paper-deep">
              <Image src="/media/story/hero.jpg" alt="A bakery owner checking messages on her phone behind the counter" width={1280} height={704} priority sizes="(min-width: 1280px) 1216px, 100vw" className="h-auto w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Mission (ink band) ───────────────────────────────────────────── */}
      <section className="tone-fixed bg-ink px-4 py-28 text-paper sm:px-6 lg:px-8 lg:py-40">
        <div data-ab="mission" className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-paper/50">Why we exist</p>
          <p className="mt-8 font-display text-[clamp(2.25rem,4.5vw,4.25rem)] leading-[1.05] tracking-[-0.02em]">
            Every Indian business deserves to answer every lead, <em className="text-[#f0b483]">without an enterprise price tag.</em>
          </p>
          <span aria-hidden className="mx-auto mt-12 block h-px w-32 bg-rust" />
        </div>
      </section>

      {/* ── Story + timeline ─────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-12 lg:gap-12">
          <div data-ab="story" className="lg:col-span-6">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">How it started</p>
            <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-6xl">
              Built out of <em className="text-rust">missed follow-ups.</em>
            </h2>
            <p className="mt-8 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
              We ran a small services business in India. Leads came in on personal WhatsApp numbers, follow-ups slipped, and nobody could see who had replied to whom.
            </p>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
              The tools we tried were built for email and calls. So in 2024 we started building our own.
            </p>
          </div>

          <ol data-ab="timeline" className="relative lg:col-span-5 lg:col-start-8 lg:pt-4">
            <span aria-hidden className="absolute bottom-0 left-[1.1rem] top-0 w-px bg-ink/10" />
            <span aria-hidden data-ab="line" className="absolute bottom-0 left-[1.1rem] top-0 w-px origin-top bg-rust" />
            {TIMELINE.map((t, i) => (
              <li key={t.when} data-ab="when" className="relative flex gap-6 pb-10 last:pb-0">
                <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border border-ink/20 bg-paper font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="pt-1.5">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-rust">{t.when}</p>
                  <p className="mt-2 text-[17px] leading-snug">{t.what}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Who it's for ─────────────────────────────────────────────────── */}
      <section className="border-t border-ink/10 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <h2 className="max-w-3xl font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-6xl">
            For people who sell <em className="text-rust">on WhatsApp.</em>
          </h2>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {PHOTOS.map((p, i) => (
              <figure key={p.img} data-ab="photo-card" className={i === 1 ? "md:mt-16" : ""}>
                <div data-ab="drift" className="overflow-hidden rounded-[1.25rem] bg-paper-deep">
                  <Image src={`/media/story/${p.img}.jpg`} alt="" width={1024} height={1280} sizes="(min-width: 768px) 33vw, 100vw" className="h-auto w-full" />
                </div>
                <figcaption className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-rust">{p.who}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────────── */}
      <section className="bg-paper-deep/60 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">What we care about</p>
          <div data-ab="values" className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => (
              <div key={v.title} data-ab="value" className="border-t border-ink/15 py-8">
                <span className="shrink-0 font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-6 font-display text-3xl leading-tight">{v.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-4 py-28 sm:px-6 lg:px-8 lg:py-36">
        <div data-ab="end" className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
            See it with <em className="text-rust">your own leads.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-[40ch] text-lg text-ink-soft">Free for 14 days. No credit card.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <Link href="/contact" className={`inline-flex items-center rounded-full border border-ink/20 px-8 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}>
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter showCta={false} />
    </div>
  );
}
