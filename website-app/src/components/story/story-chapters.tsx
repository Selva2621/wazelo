"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, ScrollTrigger, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import { useLenis } from "@/app/lenis-provider";
import { LoopVideo } from "@/components/home/loop-video";
import { PhoneFrame } from "./phone-frame";
import { LiveTime } from "./live-time";

const CHAPTERS = [
  {
    id: "ch1-find",
    day: "Monday",
    time: "10:00 AM",
    title: "You find her before anyone else does.",
    body: "The lead finder pulls bakeries, clinics and shops from Google Maps and business directories, ready to contact.",
    path: "app.wazelo.in/leads/finder",
    link: { label: "Lead finder", href: "/features/lead-finder" },
  },
  {
    id: "ch2-reply",
    day: "Today",
    time: "now",
    title: "She writes back. AI has the answer in seconds.",
    body: "It reads the chat, knows your prices and suggests the reply. Send it, or let it send itself.",
    path: "app.wazelo.in/inbox",
    link: { label: "AI assistant", href: "/features/ai-assistant" },
  },
  {
    id: "ch3-follow",
    day: "Wednesday",
    time: "10:00 AM",
    title: "Quiet for two days? Wazelo follows up.",
    body: "Write a sequence once. It stops the moment she replies.",
    path: "app.wazelo.in/sequences",
    link: { label: "Sequences", href: "/features/sequences" },
  },
  {
    id: "ch4-close",
    day: "Friday",
    time: "11:20 AM",
    title: "The proposal goes out. She says yes.",
    body: "AI drafts it from the chat. She opens it on WhatsApp and accepts from the link.",
    path: "app.wazelo.in/proposals",
    link: { label: "Proposals", href: "/features/proposals" },
  },
] as const;

const VH_PER_CHAPTER = 0.9; // viewport heights of scroll per chapter while pinned

function BrowserFrame({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-[0_50px_100px_-30px_rgba(60,40,20,0.45),0_0_0_1px_rgba(23,19,15,0.08)]">
      <div className="flex items-center gap-2 border-b border-ink/[0.07] bg-[#faf8f5] px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#e8645a]" />
        <span className="size-2.5 rounded-full bg-[#f1bf4c]" />
        <span className="size-2.5 rounded-full bg-[#5fc454]" />
        <span className="ml-3 truncate rounded-md bg-ink/[0.05] px-3 py-1 font-mono text-[11px] text-ink-soft">{path}</span>
      </div>
      {/* 16:9, the shape of the full app recordings: nothing in the clip is cut off. */}
      <div className="relative aspect-video">{children}</div>
    </div>
  );
}

export function StoryChapters() {
  const section = useRef<HTMLElement>(null);
  const pinned = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const lenis = useLenis();
  const [pinMode, setPinMode] = useState(false);
  const [step, setStep] = useState(0);
  const prev = useRef(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_FULL, () => {
        setPinMode(true);
        trigger.current = ScrollTrigger.create({
          trigger: pinned.current,
          pin: true,
          start: "top top",
          end: () => `+=${window.innerHeight * VH_PER_CHAPTER * CHAPTERS.length}`,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const i = Math.min(CHAPTERS.length - 1, Math.floor(self.progress * CHAPTERS.length));
            setStep((s) => (s === i ? s : i));
            gsap.set("[data-c=rail]", { scaleY: self.progress });
          },
        });
        return () => {
          trigger.current = null;
          setPinMode(false);
        };
      });
    },
    { scope: section },
  );

  // The pinned wrapper's content changes height when the layout switches; re-measure.
  useEffect(() => {
    ScrollTrigger.refresh();
    if (pinMode) return;
    const ctx = gsap.context(() => {
      gsap.matchMedia().add(MQ_MOTION, () => {
        gsap.utils.toArray<HTMLElement>("[data-c=card]").forEach((el) =>
          gsap.from(el, { y: 60, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 85%", once: true } }),
        );
      });
    }, section);
    return () => ctx.revert();
  }, [pinMode]);

  // Chapter change: the clock rolls, the copy swaps, the new clip wipes in.
  useEffect(() => {
    if (!pinMode) return;
    const dir = step >= prev.current ? 1 : -1;
    prev.current = step;
    const ctx = gsap.context(() => {
      gsap.matchMedia().add(MQ_MOTION, () => {
        gsap.fromTo("[data-c=clock] > span", { yPercent: 100 * dir, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.05 });
        gsap.fromTo("[data-c=copy] > *", { y: 24 * dir, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", stagger: 0.06 });
        gsap.fromTo(`[data-c-clip="${step}"]`, { clipPath: dir > 0 ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut" });
      });
    }, section);
    return () => ctx.revert();
  }, [step, pinMode]);

  const goTo = (i: number) => {
    const st = trigger.current;
    if (!st) return;
    const y = st.start + ((i + 0.1) / CHAPTERS.length) * (st.end - st.start);
    if (lenis) lenis.scrollTo(y, { duration: 1.2 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const c = CHAPTERS[step];

  return (
    <section ref={section} id="story" className="relative bg-paper text-ink">
      <div ref={pinned}>
        {pinMode ? (
          <div className="flex h-[100svh] items-center px-8">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-12 items-center gap-12">
              <div className="relative col-span-5 pl-10">
                <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-ink/10" />
                <span aria-hidden data-c="rail" className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-rust" />

                <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Her week with Wazelo</p>
                <div data-c="clock" className="mt-6 overflow-hidden">
                  <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-rust">{c.day}</span>
                  <span className="block font-display text-[clamp(4rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">{c.time === "now" ? <LiveTime /> : c.time}</span>
                </div>
                <div data-c="copy" className="mt-8 max-w-md">
                  <h2 className="text-2xl font-semibold leading-snug tracking-tight">{c.title}</h2>
                  <p className="mt-3 text-base leading-relaxed text-ink-soft">{c.body}</p>
                  <Link href={c.link.href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-rust underline-offset-4 hover:underline">
                    {c.link.label} →
                  </Link>
                </div>

                <ol className="mt-12 flex gap-2" aria-label="Chapters">
                  {CHAPTERS.map((ch, i) => (
                    <li key={ch.id}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={i === step ? "step" : undefined}
                        aria-label={`${ch.day} ${ch.time}`}
                        className={`block h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-10 bg-ink" : "w-4 bg-ink/20 hover:bg-ink/40"}`}
                      />
                    </li>
                  ))}
                </ol>
              </div>

              <div className="col-span-7">
                <BrowserFrame path={c.path}>
                  {CHAPTERS.map((ch, i) => (
                    <div key={ch.id} data-c-clip={i} aria-hidden={i !== step} className={`absolute inset-0 ${i === step ? "z-10" : "z-0 opacity-0"}`}>
                      <LoopVideo src={`/media/story/${ch.id}.mp4`} poster={`/media/story/${ch.id}.jpg`} label={ch.title} active={i === step} className="!aspect-auto h-full" />
                    </div>
                  ))}
                </BrowserFrame>
              </div>
            </div>
          </div>
        ) : (
          // Phones and tablets: one card per step, with the app's own phone screens (recorded at
          // phone size, so every word is readable) instead of a shrunken desktop window.
          <div className="mx-auto max-w-xl px-4 py-24 sm:px-6">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Her week with Wazelo</p>
            <p className="mt-4 max-w-[34ch] text-lg leading-snug text-ink-soft">
              Follow one lead, Meera from a bakery, from her first message to a signed deal.
            </p>
            <div className="mt-14 flex flex-col gap-20">
              {CHAPTERS.map((ch, i) => (
                <article key={ch.id} data-c="card">
                  <p className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-rust">
                    <span className="font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")} / {String(CHAPTERS.length).padStart(2, "0")}</span>
                    {ch.day}
                  </p>
                  <p className="mt-1 font-display text-6xl leading-none">{ch.time === "now" ? <LiveTime /> : ch.time}</p>
                  <h2 className="mt-5 text-xl font-semibold leading-snug">{ch.title}</h2>
                  <p className="mt-2 text-base leading-relaxed text-ink-soft">{ch.body}</p>
                  <div className="mt-8">
                    <PhoneFrame>
                      <LoopVideo src={`/media/story/${ch.id}-m.mp4`} poster={`/media/story/${ch.id}-m.jpg`} label={ch.title} className="!aspect-auto h-full" />
                    </PhoneFrame>
                  </div>
                  <Link href={ch.link.href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-rust underline-offset-4 hover:underline">
                    {ch.link.label} →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
