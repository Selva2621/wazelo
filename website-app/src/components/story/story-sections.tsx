"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, ScrollTrigger, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import { LiveTime } from "./live-time";

/* ─── "Paid." ────────────────────────────────────────────────────────────── */

export function PaidBand() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top 75%", end: "center center", scrub: 0.8 } })
          .fromTo("[data-p=word]", { scale: 0.7, autoAlpha: 0.15, letterSpacing: "0.08em" }, { scale: 1, autoAlpha: 1, letterSpacing: "-0.03em", ease: "none" }, 0)
          .fromTo("[data-p=line]", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0.3)
          .fromTo("[data-p=sub]", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: "none" }, 0.5);
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="tone-fixed relative overflow-hidden bg-ink px-4 py-24 text-paper sm:px-6 sm:py-40 lg:py-56">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-paper/50">Friday, 11:20 AM</p>
        <p data-p="word" className="mt-6 font-display text-[clamp(6rem,22vw,18rem)] leading-[0.8] will-change-transform">
          Paid<span className="text-rust">.</span>
        </p>
        <span data-p="line" aria-hidden className="mx-auto mt-10 block h-px w-48 origin-center bg-rust" />
        <p data-p="sub" className="mx-auto mt-10 max-w-[40ch] font-display text-3xl italic leading-snug text-paper/80 md:text-4xl">
          One lead, caught at <LiveTime fallback="any hour" />. Not one reply missed.
        </p>
      </div>
    </section>
  );
}

/* ─── People ─────────────────────────────────────────────────────────────── */

const PEOPLE = [
  { img: "realty", who: "Realtors", line: "Every site-visit request answered, even at midnight." },
  { img: "coaching-desk", who: "Coaching institutes", line: "Enquiries become admissions with follow-ups that never forget." },
  { img: "boutique", who: "Shops and boutiques", line: "Reply to every “price?” while you serve the customer in front of you." },
];

export function People() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap.from("[data-pp=head] > *", { y: 40, autoAlpha: 0, stagger: 0.1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: root.current, start: "top 70%", once: true } });
        ScrollTrigger.batch("[data-pp=card]", {
          start: "top 85%",
          once: true,
          onEnter: (els) => gsap.from(els, { y: 80, autoAlpha: 0, stagger: 0.12, duration: 1.2, ease: "expo.out" }),
        });
      });
      // Photo cards drift a little as the section scrolls past.
      mm.add(MQ_FULL, () => {
        gsap.utils.toArray<HTMLElement>("[data-pp=photo]").forEach((el) =>
          gsap.fromTo(el, { y: -18 }, { y: 18, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } }),
        );
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} className="bg-paper px-4 py-28 text-ink sm:px-6 lg:px-8 lg:py-40">
      <div className="mx-auto max-w-7xl">
        <div data-pp="head" className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <h2 className="font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-7xl lg:col-span-7">
            Built for people who sell <em className="text-rust">on WhatsApp.</em>
          </h2>
          <p className="max-w-sm text-base leading-relaxed text-ink-soft lg:col-span-4 lg:col-start-9">
            Agencies, shops, clinics, realtors and coaches. If your customers message you, Wazelo makes sure none of them wait.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3 lg:mt-24">
          {PEOPLE.map((p, i) => (
            <figure key={p.img} data-pp="card" className={i === 1 ? "md:mt-24" : ""}>
              {/* Whole photo at its own 4:5 shape; the card drifts, the photo is never cropped. */}
              <div data-pp="photo" className="overflow-hidden rounded-[1.25rem] bg-paper-deep">
                <Image src={`/media/story/${p.img}.jpg`} alt="" width={1024} height={1280} sizes="(min-width: 768px) 33vw, 100vw" className="h-auto w-full" />
              </div>
              <figcaption className="mt-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rust">{p.who}</p>
                <p className="mt-2 max-w-[30ch] text-lg leading-snug">{p.line}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Everything else ────────────────────────────────────────────────────── */

const GROUPS: { name: string; items: { label: string; desc: string; href: string; isNew?: boolean }[] }[] = [
  {
    name: "Catch",
    items: [
      { label: "Meta lead ads", desc: "Facebook and Instagram form leads land in your inbox instantly.", href: "/features/lead-ads", isNew: true },
      { label: "Website chat", desc: "A chat bubble on your site that turns visitors into leads.", href: "/features/website-chat", isNew: true },
      { label: "Lead finder", desc: "Find businesses on Google Maps and IndiaMART to message.", href: "/features/lead-finder", isNew: true },
      { label: "Contacts and groups", desc: "Every lead in one list, tagged and grouped.", href: "/features/contacts" },
      { label: "Instagram, Messenger, email", desc: "Every channel in the same inbox.", href: "/features/multi-channel" },
    ],
  },
  {
    name: "Reply",
    items: [
      { label: "Shared inbox", desc: "Your whole team on one WhatsApp number.", href: "/features/shared-inbox" },
      { label: "AI assistant", desc: "Suggests replies from your own prices and FAQs.", href: "/features/ai-assistant", isNew: true },
      { label: "Chatbot builder", desc: "Answers common questions on its own.", href: "/features/chatbot" },
      { label: "Campaigns", desc: "Send an offer to a group with approved templates.", href: "/features/campaigns" },
    ],
  },
  {
    name: "Follow up",
    items: [
      { label: "Sequences", desc: "Follow-ups that stop the moment the lead replies.", href: "/features/sequences" },
      { label: "Automation rules", desc: "Tag, assign and update leads automatically.", href: "/features/automation" },
      { label: "Lead scoring", desc: "See at a glance who is hot and who is cold.", href: "/features/lead-scoring" },
      { label: "Mobile app", desc: "Reply from your phone, wherever you are.", href: "/features/mobile-app", isNew: true },
    ],
  },
  {
    name: "Close",
    items: [
      { label: "Proposals", desc: "Send a quote on WhatsApp, accepted from a link.", href: "/features/proposals", isNew: true },
      { label: "Deals pipeline", desc: "Track every deal from enquiry to paid.", href: "/features/deals" },
      { label: "CSAT surveys", desc: "Ask customers how you did, right in the chat.", href: "/features/csat" },
      { label: "Analytics", desc: "Reply times, conversions and team performance.", href: "/features/analytics" },
      { label: "API, webhooks and MCP", desc: "Connect Wazelo to the rest of your tools.", href: "/features/developer-api" },
    ],
  },
];

export function FeatureList() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MQ_MOTION, () => {
        gsap.from("[data-f=col]", { y: 50, autoAlpha: 0, stagger: 0.1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: root.current, start: "top 70%", once: true } });
      });
    },
    { scope: root },
  );
  return (
    <section ref={root} id="features" className="scroll-mt-16 border-t border-ink/10 bg-paper px-4 py-28 text-ink sm:px-6 lg:px-8 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <h2 className="max-w-3xl font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-6xl">
          Everything to catch, chase and close. <span className="text-ink-faint">In one place.</span>
        </h2>
        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {GROUPS.map((g, gi) => (
            <div key={g.name} data-f="col">
              <p className="flex items-baseline gap-3 border-b border-ink/15 pb-4">
                <span className="font-mono text-xs text-ink-faint">0{gi + 1}</span>
                <span className="font-display text-3xl">{g.name}</span>
              </p>
              <ul className="mt-2">
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className="group flex items-center justify-between gap-3 border-b border-ink/[0.07] py-3.5 transition-colors hover:text-rust focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rust"
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[15px] font-medium">
                          {it.label}
                          {it.isNew && <span className="rounded-full bg-rust/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rust">New</span>}
                        </span>
                        <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{it.desc}</span>
                      </span>
                      {/* Always visible on touch screens so rows read as links; hover-reveal on desktop. */}
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition-all duration-300 group-hover:text-rust lg:-translate-x-1 lg:opacity-0 lg:group-hover:translate-x-0 lg:group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Closing ────────────────────────────────────────────────────────────── */

export function StoryCta() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap.from("[data-e=copy] > *", { y: 40, autoAlpha: 0, stagger: 0.12, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: root.current, start: "top 65%", once: true } });
      });
      mm.add(MQ_FULL, () => {
        gsap.fromTo("[data-e=bg]", { autoAlpha: 0.35 }, { autoAlpha: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "center center", scrub: true } });
      });
    },
    { scope: root },
  );
  return (
    // The photo is shown whole: on desktop the section takes the photo's own shape, on phones
    // the photo sits on top and fades into the ink behind the copy.
    <section ref={root} className="tone-fixed relative flex min-h-[90svh] items-center overflow-hidden bg-ink px-4 py-32 text-paper sm:px-6 lg:aspect-[1280/704] lg:min-h-0 lg:px-8 lg:py-0">
      <div data-e="bg" className="absolute inset-x-0 top-0">
        <Image src="/media/story/hero.jpg" alt="" width={1280} height={704} sizes="100vw" className="h-auto w-full" />
        <div aria-hidden className="absolute inset-0 bg-ink/70" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-ink lg:hidden" />
      </div>
      <div data-e="copy" className="relative mx-auto max-w-4xl text-center">
        <h2 className="font-display text-[clamp(3.4rem,8vw,7.5rem)] leading-[0.9] tracking-[-0.02em]">
          Reply first.
          <br />
          <em className="text-[#f0b483]">Every time.</em>
        </h2>
        <p className="mx-auto mt-8 max-w-[40ch] text-lg text-paper/75">Set up in minutes. Every feature of your plan, free for 14 days.</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href={APP_REGISTER_URL}
            className="group inline-flex items-center gap-2 rounded-full bg-paper px-8 py-4 text-sm font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full border border-paper/30 px-8 py-4 text-sm font-semibold text-paper transition-colors hover:border-paper/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            Talk to sales
          </Link>
        </div>
      </div>
    </section>
  );
}
