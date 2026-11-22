"use client";

import { useEffect, useRef, useState } from "react";
import { useStoryPrice } from "./story-media";

/**
 * Phone hero (under 1024px): Meera's whole story as a live WhatsApp chat, drawn in HTML so every
 * word is sharp and nothing heavy downloads. It plays beat by beat, loops, pauses off screen,
 * and the four step buttons jump to a part of the story. Reduced motion shows the finished chat.
 */

// When each message appears (beat index) and which story step it belongs to.
const STEPS = [
  { label: "Lead arrives", from: 0 },
  { label: "AI replies", from: 2 },
  { label: "Follow-up", from: 4 },
  { label: "Deal won", from: 7 },
];
// How long each beat holds before the next one (ms). The last one holds the finished chat.
const BEAT_MS = [900, 1500, 1400, 2000, 1300, 1700, 1600, 1600, 3600];
const LAST = BEAT_MS.length - 1;

function stepOf(beat: number) {
  let s = 0;
  STEPS.forEach((st, i) => {
    if (beat >= st.from) s = i;
  });
  return s;
}

export function HeroChat({ className = "" }: { className?: string }) {
  const price = useStoryPrice();
  const [beat, setBeat] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReduce(mq.matches);
      if (mq.matches) setBeat(LAST);
    };
    apply();
    mq.addEventListener("change", apply);
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.25 });
    if (root.current) io.observe(root.current);
    return () => {
      mq.removeEventListener("change", apply);
      io.disconnect();
    };
  }, []);

  // Advance one beat at a time; after the finished chat, start over.
  useEffect(() => {
    if (reduce || !onScreen) return;
    const id = window.setTimeout(() => setBeat((b) => (b >= LAST ? 0 : b + 1)), BEAT_MS[beat]);
    return () => window.clearTimeout(id);
  }, [beat, reduce, onScreen]);

  const step = stepOf(beat);
  const show = (at: number) => beat >= at;
  const pop = { animation: reduce ? undefined : "fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both" };

  return (
    <div ref={root} className={className}>
      <p className="sr-only">
        Meera taps a property ad and asks on WhatsApp if a 3-bedroom at Northwind Residences is available.
        Wazelo&apos;s AI replies with the price, {price}, follows up after her site visit, and she accepts the offer.
      </p>

      {/* The phone */}
      <div aria-hidden className="mx-auto w-full max-w-[320px] rounded-[2.6rem] bg-[#0d0b09] p-2 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="relative flex h-[500px] flex-col overflow-hidden rounded-[2.15rem] bg-[#0b141a] font-sans text-[#e9edef]">
          {/* Notch */}
          <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />

          {/* Deal won banner */}
          {show(8) && (
            <div className="absolute inset-x-2.5 top-9 z-10 flex items-center gap-3 rounded-2xl bg-[#166534]/95 px-3.5 py-2.5 shadow-[0_14px_30px_rgba(0,0,0,0.45)]" style={pop}>
              <span className="grid size-8 place-items-center rounded-lg bg-[#c2410c] font-display text-lg text-white">W</span>
              <span className="min-w-0 leading-tight">
                <b className="block text-[13px]">Proposal accepted</b>
                <span className="text-[12px] text-white/85">Meera · {price}</span>
              </span>
            </div>
          )}

          {/* Chat header */}
          <div className="flex items-center gap-2.5 bg-[#202c33] px-3.5 pb-2.5 pt-9">
            <span className="grid size-8 place-items-center rounded-full bg-[#e8a6c2] text-[12px] font-bold text-[#3b1d2b]">ME</span>
            <span className="min-w-0 leading-tight">
              <b className="block text-[14px]">Meera</b>
              <span className="text-[11.5px] text-[#8696a0]">Facebook ad · Northwind Residences</span>
            </span>
          </div>

          {/* Messages: newest at the bottom, older ones slide up and out */}
          <div className="flex flex-1 flex-col justify-end gap-2 overflow-hidden px-3 pb-3 pt-2 text-[13.5px] leading-snug">
            {show(0) && <Chip style={pop}>New lead · assigned to Priya (Sales)</Chip>}
            {show(1) && (
              <Bubble style={pop} time="now">
                Hi! Is a 3-bedroom at Northwind Residences still available? What&apos;s the price?
              </Bubble>
            )}
            {beat === 2 && (
              <div className="self-end rounded-2xl rounded-tr-sm bg-[#005c4b]/70 px-3.5 py-2 text-[12px] text-[#e9edef]/85" style={pop}>
                <span className="mr-1 text-[#f0b483]">✦</span>AI is replying
                <span className="ml-1 inline-flex gap-0.5 align-middle">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="size-1 animate-pulse rounded-full bg-current" style={{ animationDelay: `${d * 0.2}s` }} />
                  ))}
                </span>
              </div>
            )}
            {show(3) && (
              <div className="flex flex-col items-end gap-1" style={pop}>
                <span className="text-[10.5px] font-bold tracking-[0.12em] text-[#f0b483]">✦ WAZELO AI · 6 SEC</span>
                <Bubble out time="now">
                  Hi Meera! Yes. 3-bedroom homes start at {price}. Shall I book a site visit for Saturday?
                </Bubble>
              </div>
            )}
            {show(4) && <Chip style={pop}>2 days later · automatic follow-up</Chip>}
            {show(5) && (
              <Bubble out style={pop} time="10:00">
                Hi Meera, how was Saturday&apos;s visit? I can hold apartment B‑1204 for you this week.
              </Bubble>
            )}
            {show(6) && (
              <Bubble style={pop} time="10:04">
                Loved it! Please send the offer.
              </Bubble>
            )}
            {show(7) && (
              <div className="w-[82%] self-end rounded-2xl rounded-tr-sm bg-[#005c4b] p-1.5" style={pop}>
                <div className="rounded-xl bg-[#f3eee6] px-3.5 py-3 text-[#17130f]">
                  <p className="text-[10px] font-bold tracking-[0.14em] text-[#c2410c]">OFFER P-0005</p>
                  <p className="mt-1 font-display text-[19px] leading-[1.05]">3-bed apartment, Northwind Residences</p>
                  <p className="mt-1.5 font-display text-[24px] leading-none">{price}</p>
                  <p
                    className={`mt-2.5 rounded-full py-1.5 text-center text-[12px] font-bold text-white transition-colors duration-500 ${
                      show(8) ? "bg-[#15803d]" : "bg-[#17130f]"
                    }`}
                  >
                    {show(8) ? "Accepted ✓" : "Sent · waiting for Meera"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 px-2.5 pb-4">
            <span className="flex-1 rounded-full bg-[#202c33] px-4 py-2.5 text-[13px] text-[#8696a0]">Message</span>
            <span className="grid size-10 place-items-center rounded-full bg-[#00a884] text-white">➤</span>
          </div>
        </div>
      </div>

      {/* Story steps: tap to jump */}
      <ol className="mx-auto mt-5 grid max-w-[340px] grid-cols-4 gap-1.5" aria-label="Steps of Meera's story">
        {STEPS.map((s, i) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => setBeat(s.from)}
              aria-current={i === step ? "step" : undefined}
              className={`flex min-h-11 w-full flex-col items-center justify-center rounded-xl px-1 py-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper ${
                i === step ? "bg-paper/10 text-paper" : "text-paper/55"
              }`}
            >
              <span className={`mb-1 h-0.5 w-6 rounded-full ${i === step ? "bg-[#f0b483]" : i < step ? "bg-paper/40" : "bg-paper/15"}`} />
              <span className="text-[11px] font-medium leading-tight">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Bubble({ children, out = false, time, style }: { children: React.ReactNode; out?: boolean; time: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`max-w-[84%] rounded-2xl px-3 py-2 ${out ? "self-end rounded-tr-sm bg-[#005c4b]" : "self-start rounded-tl-sm bg-[#202c33]"}`}
      style={style}
    >
      {children}
      <span className="mt-0.5 block text-right text-[10px] text-[#e9edef]/55">
        {time}
        {out && <span className="ml-1 text-[#53bdeb]">✓✓</span>}
      </span>
    </div>
  );
}

function Chip({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span className="self-center rounded-lg bg-[#182229] px-2.5 py-1 text-[10.5px] tracking-[0.04em] text-[#8696a0]" style={style}>
      {children}
    </span>
  );
}
