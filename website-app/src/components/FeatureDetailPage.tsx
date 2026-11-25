"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import { PhoneFrame } from "@/components/story/phone-frame";
import SiteNavbar from "@/components/Navbar";
import { LoopVideo } from "@/components/home/loop-video";
import { useStoryClip } from "@/components/story/story-media";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FeatureDetailData {
  slug: string;
  tag: string;
  heroTitle: string;
  heroSubtitle: string;
  heroScreen: string;
  overviewTitle: string;
  overviewDesc: string;
  capabilities: { icon: string; title: string; desc: string }[];
  howItWorks: { step: string; title: string; desc: string }[];
  screens?: { src: string; caption: string }[];
  relatedFeatures: { label: string; href: string; icon: string }[];
  interactiveSection?: React.ReactNode;
}

/**
 * Real app recordings (public/media/story) for every feature page: desktop "<clip>.mp4" and the
 * phone cut "<clip>-m.mp4". Story clips (ch*) come in ₹ and $ versions; `shared` clips
 * (demo/rec-features.js) have one version. `phoneOnly`: the phone recording on every screen.
 */
const HERO_CLIPS: Record<string, { clip: string; path: string; shared?: boolean; phoneOnly?: boolean }> = {
  "shared-inbox": { clip: "ch2-reply", path: "app.wazelo.in/inbox" },
  "ai-assistant": { clip: "ch2-reply", path: "app.wazelo.in/inbox" },
  "lead-finder": { clip: "ch1-find", path: "app.wazelo.in/leads/finder" },
  "lead-ads": { clip: "ch1-ads", path: "app.wazelo.in/lead-ads" },
  sequences: { clip: "ch3-follow", path: "app.wazelo.in/sequences" },
  proposals: { clip: "ch4-close", path: "app.wazelo.in/proposals" },
  automation: { clip: "feat-automation", path: "app.wazelo.in/automation", shared: true },
  deals: { clip: "feat-deals", path: "app.wazelo.in/deals", shared: true },
  analytics: { clip: "feat-analytics", path: "app.wazelo.in/dashboard", shared: true },
  campaigns: { clip: "feat-campaigns", path: "app.wazelo.in/campaigns", shared: true },
  chatbot: { clip: "feat-chatbot", path: "app.wazelo.in/chatbot", shared: true },
  contacts: { clip: "feat-contacts", path: "app.wazelo.in/contacts", shared: true },
  csat: { clip: "feat-csat", path: "app.wazelo.in/csat", shared: true },
  "developer-api": { clip: "feat-developer-api", path: "app.wazelo.in/settings/api-keys", shared: true },
  "lead-scoring": { clip: "feat-lead-scoring", path: "app.wazelo.in/lead-scoring", shared: true },
  "multi-channel": { clip: "feat-multi-channel", path: "app.wazelo.in/inbox", shared: true },
  "website-chat": { clip: "feat-website-chat", path: "app.wazelo.in/settings/chat-widget", shared: true },
  "mobile-app": { clip: "feat-mobile-app", path: "app.wazelo.in", shared: true, phoneOnly: true },
};

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Frame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-[0_60px_120px_-40px_rgba(60,40,20,0.5),0_0_0_1px_rgba(23,19,15,0.08)]">
      <div className="flex items-center gap-2 border-b border-ink/[0.07] bg-[#faf8f5] px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#e8645a]" />
        <span className="size-2.5 rounded-full bg-[#f1bf4c]" />
        <span className="size-2.5 rounded-full bg-[#5fc454]" />
        <span className="ml-3 truncate rounded-md bg-ink/[0.05] px-3 py-1 font-mono text-[11px] text-ink-soft">{path}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FeatureDetailPage({ data }: { data: FeatureDetailData }) {
  const root = useRef<HTMLDivElement>(null);
  const clip = HERO_CLIPS[data.slug];
  const storyClip = useStoryClip(); // ₹ or $ recordings, like the pricing
  const media = (mobile: boolean) =>
    clip?.shared
      ? { src: `/media/story/${clip.clip}${mobile ? "-m" : ""}.mp4`, poster: `/media/story/${clip.clip}${mobile ? "-m" : ""}.jpg` }
      : storyClip(clip!.clip, mobile);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.1 } })
          .from("[data-fd=crumb]", { y: 12, autoAlpha: 0, duration: 0.7 })
          .from("[data-fd=title]", { y: 50, autoAlpha: 0 }, 0.1)
          .from("[data-fd=sub]", { y: 24, autoAlpha: 0 }, 0.3)
          .from("[data-fd=cta]", { y: 20, autoAlpha: 0, stagger: 0.08 }, 0.4)
          .from("[data-fd=media]", { y: 90, autoAlpha: 0, duration: 1.4 }, 0.45);

        const rise = (sel: string, trigger: string, stagger = 0.08) =>
          gsap.from(sel, { y: 50, autoAlpha: 0, stagger, duration: 1, ease: "expo.out", scrollTrigger: { trigger, start: "top 78%", once: true } });
        rise("[data-fd=over] > *", "[data-fd=over]", 0.12);
        rise("[data-fd=cap]", "[data-fd=caps]");
        rise("[data-fd=step]", "[data-fd=steps]", 0.12);
        rise("[data-fd=rel]", "[data-fd=related]", 0.05);
        rise("[data-fd=end] > *", "[data-fd=end]", 0.12);
        if (document.querySelector("[data-fd=demo]")) {
          gsap.from("[data-fd=demo]", { y: 80, scale: 0.96, autoAlpha: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: "[data-fd=demo]", start: "top 85%", once: true } });
        }
      });
      mm.add(MQ_FULL, () => {
        // Media tilts back flat as it scrolls into place; the step line draws with scroll.
        if (document.querySelector("[data-fd=media]")) {
          gsap.fromTo("[data-fd=media-tilt]", { rotationX: 14, scale: 0.94, transformPerspective: 1600, transformOrigin: "50% 0%" }, { rotationX: 0, scale: 1, ease: "none", scrollTrigger: { trigger: "[data-fd=media]", start: "top 95%", end: "top 30%", scrub: 0.6 } });
        }
        gsap.fromTo("[data-fd=line]", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: "[data-fd=steps]", start: "top 75%", end: "bottom 60%", scrub: 0.6 } });
        gsap.fromTo("[data-fd=progress]", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.3 } });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      {/* heroTitle arrives as HTML with an inline accent colour; restyle it for paper. */}
      <style>{`[data-fd=title] span{color:var(--color-rust)!important;font-style:italic}`}</style>
      <span data-fd="progress" aria-hidden className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 bg-rust" />
      <SiteNavbar activePage="Features" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pb-32 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p data-fd="crumb" className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-ink-faint">
              <Link href="/#features" className="-my-2 inline-block py-2 hover:text-ink">Features</Link>
              <span>/</span>
              <span className="text-rust">{data.tag}</span>
            </p>
            <h1
              data-fd="title"
              className="mt-6 font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.92] tracking-[-0.02em]"
              dangerouslySetInnerHTML={{ __html: data.heroTitle }}
            />
            <p data-fd="sub" className="mt-8 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
              {data.heroSubtitle}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a data-fd="cta" href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link data-fd="cta" href="/#features" className={`inline-flex items-center rounded-full border border-ink/20 px-7 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}>
                See all features
              </Link>
            </div>
          </div>

          {(clip || data.heroScreen) && (
            <div data-fd="media" className="mt-16 lg:mt-24">
              <div data-fd="media-tilt" className="will-change-transform">
                {clip ? (
                  <>
                    <PhoneFrame className={clip.phoneOnly ? "" : "lg:hidden"}>
                      <LoopVideo {...media(true)} label={`${data.tag} in the Wazelo app`} className="!aspect-auto h-full" />
                    </PhoneFrame>
                    {!clip.phoneOnly && (
                      <div className="mx-auto hidden max-w-5xl lg:block">
                        <Frame path={clip.path}>
                          <LoopVideo {...media(false)} label={`${data.tag} in the Wazelo app`} />
                        </Frame>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="tone-fixed overflow-hidden rounded-[1.5rem] bg-ink shadow-[0_60px_120px_-40px_rgba(60,40,20,0.5)]">
                    <Image src={data.heroScreen} alt={data.tag} width={1280} height={800} sizes="(min-width: 1280px) 1216px, 100vw" className="h-auto w-full" priority />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      <section className="border-t border-ink/10 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div data-fd="over" className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-12">
          <h2 className="font-display text-4xl leading-[1] tracking-[-0.01em] md:text-6xl lg:col-span-7">{data.overviewTitle}</h2>
          <p className="max-w-md text-lg leading-relaxed text-ink-soft lg:col-span-4 lg:col-start-9 lg:pt-3">{data.overviewDesc}</p>
        </div>
      </section>

      {/* ── Capabilities ─────────────────────────────────────────────────── */}
      <section className="bg-paper-deep/60 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">What you can do</p>
          <div data-fd="caps" className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
            {data.capabilities.map((c, i) => (
              <div key={c.title} data-fd="cap" className="border-t border-ink/15 py-8">
                <div className="flex items-center justify-between">
                  <span className="shrink-0 font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                  <span className="material-symbols-outlined text-[22px] text-rust">{c.icon}</span>
                </div>
                <h3 className="mt-6 font-display text-3xl leading-tight">{c.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-display text-4xl leading-none md:text-6xl">
            Up and running <em className="text-rust">in minutes.</em>
          </h2>
          <div data-fd="steps" className="relative mt-16">
            <span aria-hidden className="absolute left-0 right-0 top-[1.15rem] hidden h-px bg-ink/10 lg:block" />
            <span aria-hidden data-fd="line" className="absolute left-0 right-0 top-[1.15rem] hidden h-px origin-left scale-x-0 bg-rust lg:block" />
            <ol className="grid gap-10 lg:grid-cols-4 lg:gap-8">
              {data.howItWorks.map((s, i) => (
                <li key={s.step + s.title} data-fd="step" className="relative flex gap-5 lg:block">
                  <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full border border-ink/20 bg-paper font-mono text-xs">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="lg:mt-8">
                    <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Live demo (the older pages' interactive mock, shown as a screen) ── */}
      {/* Desktop only: the mock is a desktop app layout and is cut off at phone width; phones
          already get the readable phone recording at the top of the page. */}
      {/* Pages with a real app recording don't show the old hand-built mock. */}
      {data.interactiveSection && !clip && (
        <section className="hidden px-4 pb-24 sm:px-6 lg:block lg:px-8 lg:pb-32">
          <div data-fd="demo" className="mx-auto max-w-7xl tone-fixed overflow-hidden rounded-[2rem] bg-ink p-5 text-on-surface sm:p-8 lg:p-12">
            <p className="mb-8 text-xs font-medium uppercase tracking-[0.22em] text-paper/50">See it in action</p>
            {data.interactiveSection}
          </div>
        </section>
      )}

      {/* ── Related ──────────────────────────────────────────────────────── */}
      <section className="border-t border-ink/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-display text-3xl md:text-4xl">Works well with</h2>
          <div data-fd="related" className="flex flex-wrap gap-3">
            {data.relatedFeatures.map((f) => (
              <Link
                key={f.label}
                data-fd="rel"
                href={f.href}
                className={`group inline-flex items-center gap-2 rounded-full border border-ink/15 bg-card/60 px-5 py-3 text-sm font-medium transition-colors hover:border-rust hover:text-rust ${focusInk}`}
              >
                <span className="material-symbols-outlined text-[18px] text-rust">{f.icon}</span>
                {f.label}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-40 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="tone-fixed bg-ink px-4 py-28 text-paper sm:px-6 lg:px-8 lg:py-36">
        <div data-fd="end" className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
            Ready to try <em className="text-[#f0b483]">{data.tag.toLowerCase()}?</em>
          </h2>
          <p className="mx-auto mt-6 max-w-[40ch] text-lg text-paper/70">Free for 14 days. No credit card. Set up in minutes.</p>
          <a href={APP_REGISTER_URL} className="group mt-10 inline-flex items-center gap-2 rounded-full bg-paper px-8 py-4 text-sm font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper">
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      <SiteFooter showCta={false} />
    </div>
  );
}
