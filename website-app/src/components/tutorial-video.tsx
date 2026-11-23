"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A narrated feature tutorial (demo/tutorials), streamed as adaptive HLS (1080p/720p) from
 * Wazelo's object storage. Nothing but the poster and the small step list loads until the
 * reader presses play. Safari plays HLS natively; other browsers use hls.js, loaded on demand.
 */
export const TUTORIALS_URL =
  process.env.NEXT_PUBLIC_TUTORIALS_URL ??
  "https://br-sparkling-resonance-aoz6332e.storage.c-2.ap-southeast-1.aws.neon.tech/tutorials";

type Step = { id: string; title: string; start: number };

const PREVIEW = 4; // steps shown on phones before "Show all steps"

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function TutorialVideo({ id, title }: { id: string; title: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const started = useRef(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [length, setLength] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [open, setOpen] = useState(false);
  const base = `${TUTORIALS_URL}/${id}`;

  useEffect(() => {
    let off = false;
    fetch(`${base}/chapters.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { duration: number; chapters: Step[] } | null) => {
        if (off || !j) return;
        setSteps(j.chapters.filter((c) => c.id !== "intro"));
        setLength(j.duration);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [base]);

  // Attach the stream on first play only.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let hls: { destroy(): void } | null = null;
    const start = async () => {
      if (started.current) return;
      started.current = true;
      const src = `${base}/master.m3u8`;
      if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = src;
        el.play().catch(() => {});
        return;
      }
      const { default: Hls } = await import("hls.js");
      if (!Hls.isSupported()) return;
      const h = new Hls({ capLevelToPlayerSize: true });
      h.loadSource(src);
      h.attachMedia(el);
      h.on(Hls.Events.MANIFEST_PARSED, () => el.play().catch(() => {}));
      hls = h;
    };
    el.addEventListener("play", start);
    return () => {
      el.removeEventListener("play", start);
      hls?.destroy();
    };
  }, [base]);

  const seek = (t: number) => {
    const el = video.current;
    if (!el) return;
    const go = () => {
      el.currentTime = t;
      el.play().catch(() => {});
    };
    if (started.current && el.readyState > 0) go();
    else {
      el.addEventListener("loadedmetadata", go, { once: true });
      el.play().catch(() => {});
    }
  };

  const current = steps.reduce((acc, s, i) => (now >= s.start ? i : acc), -1);

  return (
    <figure className="mb-8">
      <video
        ref={video}
        poster={`${base}/poster.jpg`}
        controls
        preload="none"
        playsInline
        onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
        aria-label={`${title}: narrated tutorial`}
        className="aspect-video w-full rounded-xl bg-ink shadow-[0_30px_60px_-30px_rgba(60,40,20,0.45),0_0_0_1px_rgba(23,19,15,0.08)]"
      />
      <figcaption className="mt-2 text-sm text-ink-faint">
        {title} · step-by-step tutorial with voice-over and captions{length ? ` · ${clock(length)}` : ""}
      </figcaption>
      {steps.length > 0 && (
        <ol id={`${id}-steps`} aria-label={`${title}: steps`} className="mt-4 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
          {steps.map((s, i) => (
            // On phones only the first steps (and the one playing) show until "Show all steps".
            <li key={s.id} className={open || i < PREVIEW || i === current ? undefined : "hidden sm:block"}>
              <button
                type="button"
                onClick={() => seek(s.start)}
                aria-current={i === current ? "step" : undefined}
                className={`flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  i === current ? "bg-rust/10 text-ink" : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                <span className="w-9 shrink-0 font-mono text-xs tabular-nums text-ink-faint">{clock(s.start)}</span>
                <span className={i === current ? "font-medium" : undefined}>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {steps.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`${id}-steps`}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-sm font-medium text-rust transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:hidden"
        >
          {open ? "Show fewer steps" : `Show all ${steps.length} steps`}
          <svg aria-hidden viewBox="0 0 20 20" className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>
      )}
    </figure>
  );
}
