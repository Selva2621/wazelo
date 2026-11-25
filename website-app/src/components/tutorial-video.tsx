"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TUTORIAL_VIDEOS } from "@/components/tutorial-videos";
import { TUTORIALS_URL } from "@/lib/seo";
import {
  MediaControlBar,
  MediaController,
  MediaFullscreenButton,
  MediaLoadingIndicator,
  MediaMuteButton,
  MediaPlayButton,
  MediaPlaybackRateButton,
  MediaPreviewChapterDisplay,
  MediaPreviewTimeDisplay,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from "media-chrome/react";

/**
 * A narrated feature tutorial (demo/tutorials), streamed as adaptive HLS (1080p/720p) from
 * Wazelo's object storage. Nothing but the poster and the small step list loads until the
 * reader presses play. Plays through hls.js (loaded on demand); native HLS only where hls.js cannot run.
 * Controls are Media Chrome, themed in globals.css (.wz-player); the seek bar shows the steps as chapters.
 * `?v=<id>&t=<seconds>` in the page URL (the docs page's key-moment links) makes that video
 * start from that second when it's played.
 */
type Step = { id: string; title: string; start: number };

const PREVIEW = 4; // steps shown on phones before "Show all steps"

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** unit: "chapters" for the full demo (its list also ends with the outro, so no count). */
export function TutorialVideo({ id, title, unit = "steps" }: { id: string; title: string; unit?: "steps" | "chapters" }) {
  const video = useRef<HTMLVideoElement>(null);
  const started = useRef(false);
  const startAt = useRef<number | null>(null); // from ?v=<id>&t=<seconds>
  // Steps come from the generated data (tutorial-videos.ts), so they're in the HTML on first paint.
  const data = TUTORIAL_VIDEOS.find((v) => v.id === id);
  const all: Step[] = useMemo(() => data?.chapters ?? [], [data]); // steps plus the intro, for the seek bar
  const steps = useMemo(() => all.filter((c) => c.id !== "intro"), [all]);
  const length = data?.duration ?? null;
  const [now, setNow] = useState(0);
  const [open, setOpen] = useState(false);
  const base = `${TUTORIALS_URL}/${id}`;

  // Key-moment link: ?v=<this id>&t=<seconds> starts this video there on its first play.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = Number(q.get("t"));
    if (q.get("v") === id && Number.isFinite(t) && t > 0) startAt.current = t;
  }, [id]);

  // Attach the stream on first play only.
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let hls: { destroy(): void } | null = null;
    const start = async () => {
      if (started.current) return;
      started.current = true;
      const src = `${base}/master.m3u8`;
      if (startAt.current !== null) {
        const t = startAt.current;
        startAt.current = null;
        el.addEventListener("loadedmetadata", () => { el.currentTime = t; }, { once: true });
      }
      // hls.js first: newer Chrome also says it plays HLS natively, but its native player stops
      // with "Parsed buffers not in DTS sequence" when it switches 720p -> 1080p. Native HLS only
      // where hls.js can't run (older iPhones without Media Source).
      const { default: Hls } = await import("hls.js");
      if (!Hls.isSupported()) {
        if (el.canPlayType("application/vnd.apple.mpegurl")) {
          el.src = src;
          el.play().catch(() => {});
        }
        return;
      }
      // No HLS subtitles: the captions are burned into the picture.
      const h = new Hls({ capLevelToPlayerSize: true, enableWebVTT: false, enableIMSC1: false, enableCEA708Captions: false });
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
    startAt.current = null; // a chapter picked in the list wins over a ?t= link
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

  // Steps as a chapters text track, so the seek bar splits into steps and names them on hover.
  // Added from code, not a <track>: Chrome empties a <track>'s cues when hls.js swaps the source,
  // so the cues go back in on every load, and a mode flip tells Media Chrome to re-read them.
  useEffect(() => {
    const el = video.current;
    if (!el || !all.length || !length) return;
    const fill = () => {
      const tt = Array.from(el.textTracks).find((t) => t.kind === "chapters") ?? el.addTextTrack("chapters", "Chapters");
      tt.mode = "hidden";
      if (tt.cues?.length) return;
      all.forEach((c, i) => tt.addCue(new VTTCue(c.start, all[i + 1]?.start ?? length, c.title)));
      tt.mode = "disabled";
      tt.mode = "hidden";
    };
    fill();
    el.addEventListener("loadedmetadata", fill);
    return () => el.removeEventListener("loadedmetadata", fill);
  }, [all, length]);

  const current = steps.reduce((acc, s, i) => (now >= s.start ? i : acc), -1);

  return (
    <figure className="mb-8">
      <MediaController
        className="wz-player aspect-video w-full overflow-hidden rounded-xl shadow-[0_30px_60px_-30px_rgba(60,40,20,0.45),0_0_0_1px_rgba(23,19,15,0.08)]"
        defaultDuration={length ?? undefined}
      >
        <video
          slot="media"
          ref={video}
          // Media Chrome sets this on the media element; matching it keeps hydration clean.
          tabIndex={-1}
          // CORS-mode for every request, so a cached copy always carries the CORS headers hls.js needs.
          crossOrigin="anonymous"
          poster={`${base}/poster.jpg`}
          preload="none"
          playsInline
          onTimeUpdate={(e) => setNow(e.currentTarget.currentTime)}
          aria-label={`${title}: narrated tutorial`}
        />
        <MediaLoadingIndicator slot="centered-chrome" noAutohide className="wz-loading" />
        <MediaPlayButton slot="centered-chrome" className="wz-big-play" />
        <MediaControlBar className="wz-bar">
          <MediaTimeRange className="wz-range">
            <MediaPreviewChapterDisplay slot="preview" />
            <MediaPreviewTimeDisplay slot="preview" />
          </MediaTimeRange>
        </MediaControlBar>
        <MediaControlBar className="wz-bar">
          <MediaPlayButton />
          <MediaSeekBackwardButton seekOffset={10} />
          <MediaSeekForwardButton seekOffset={10} />
          <MediaMuteButton />
          <MediaVolumeRange className="wz-volume" />
          <MediaTimeDisplay showDuration />
          <span className="flex-1" />
          <MediaPlaybackRateButton rates={[1, 1.25, 1.5, 2]} />
          <MediaFullscreenButton />
        </MediaControlBar>
      </MediaController>
      <figcaption className="mt-2 text-sm text-ink-faint">
        {title} · {unit === "chapters" ? "full walkthrough" : "step-by-step tutorial"} with voice-over and captions{length ? ` · ${clock(length)}` : ""}
      </figcaption>
      {steps.length > 0 && (
        <ol id={`${id}-steps`} aria-label={`${title}: ${unit}`} className="mt-4 grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
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
          {open ? `Show fewer ${unit}` : unit === "chapters" ? "Show all chapters" : `Show all ${steps.length} steps`}
          <svg aria-hidden viewBox="0 0 20 20" className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>
      )}
    </figure>
  );
}
