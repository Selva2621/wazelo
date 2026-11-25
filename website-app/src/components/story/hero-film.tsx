"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HERO_STEPS } from "./hero-steps";
import { useMediaSuffix } from "./story-media";

/**
 * Desktop hero as pre-rendered film: the Blender office scene (demo/blender-hero, Cycles 1440p)
 * cut into one clip per story step (hero-s0..s3). The camera in each clip replays the old
 * real-time scene's rig (hero-3d.tsx): it glides over from the previous device, settles on this
 * one, then pushes in on the detail. Clip N ends where clip N+1 starts, so stepping on is a
 * seamless cut; a chip pick to any other step crossfades. The mouse adds parallax.
 *
 * Two stacked <video> layers: the next clip loads and starts in the hidden one and is swapped
 * in once it is playing, so a cut never shows an empty frame (an ended clip holds its last frame).
 * Files: public/media/hero-film/hero-<shot>[-inr].{webm,mp4,jpg}; ₹ for India, $ elsewhere.
 */

const DIR = "/media/hero-film";
const FADE_MS = 600;

function pickExt() {
  try {
    const v = document.createElement("video");
    // AV1 WebM is ~5x smaller; Safari without AV1 decoding falls back to H.264.
    return v.canPlayType('video/webm; codecs="av01.0.08M.08"') === "probably" ? "webm" : "mp4";
  } catch {
    return "mp4";
  }
}

export function HeroFilm({
  step,
  onStep,
  onReady,
  className = "",
}: {
  step: number;
  /** Called with the next step when a step's shot has played out. */
  onStep: (i: number) => void;
  /** First frame is on screen. */
  onReady: () => void;
  className?: string;
}) {
  const sfx = useMediaSuffix(); // null until the visitor's currency is known
  const ext = useMemo(() => (typeof window === "undefined" ? "mp4" : pickExt()), []);
  const url = useCallback((shot: string) => `${DIR}/hero-${shot}${sfx ?? ""}.${ext}`, [sfx, ext]);

  const layerA = useRef<HTMLVideoElement>(null);
  const layerB = useRef<HTMLVideoElement>(null);
  const layers = useMemo(() => [layerA, layerB], []);
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  const [fade, setFade] = useState(false); // crossfade (true) or hard cut (false) on the last swap
  const prevStep = useRef<number | null>(null);
  const token = useRef(0); // bumps on every step change; stale clip callbacks check it
  const readyOnce = useRef(false);
  const onScreen = useRef(true);
  const [reduce, setReduce] = useState(false);

  const wrap = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const markReady = useCallback(() => {
    if (readyOnce.current) return;
    readyOnce.current = true;
    onReady();
  }, [onReady]);

  /** Starts `src` in the hidden layer and swaps it to the front once it is playing. */
  const playClip = useCallback(
    (src: string, opts: { crossfade: boolean; onEnded?: () => void }) => {
      const my = token.current;
      const backIdx = 1 - frontRef.current;
      const back = layers[backIdx].current;
      const old = layers[frontRef.current].current;
      if (!back) return;
      // A clip that fails to load leaves the current frame (or the poster) up.
      back.onended = null;
      back.onplaying = () => {
        back.onplaying = null;
        if (my !== token.current) return;
        setFade(opts.crossfade);
        frontRef.current = backIdx;
        setFront(backIdx);
        markReady();
        // Keep the old layer's last frame under the fade, then let it go.
        window.setTimeout(() => old?.pause(), opts.crossfade ? FADE_MS : 0);
      };
      back.onended = () => {
        if (my === token.current) opts.onEnded?.();
      };
      back.src = src;
      if (onScreen.current && !document.hidden) back.play().catch(() => {});
    },
    [layers, markReady],
  );

  // Each step's clip opens with the camera gliding over from the previous device, so the next
  // step (auto or picked) is a seamless cut; any other jump crossfades.
  useEffect(() => {
    if (sfx === null || reduce) return;
    const prev = prevStep.current;
    prevStep.current = step;
    token.current += 1;
    const next = (step + 1) % HERO_STEPS.length;
    const seamless = prev === null || step === (prev + 1) % HERO_STEPS.length;
    playClip(url(`s${step}`), { crossfade: !seamless, onEnded: () => onStep(next) });
  }, [step, sfx, reduce, url, playClip, onStep]);

  // Reduced motion: no film, just the step's opening still (and the hero counts as ready).
  useEffect(() => {
    if (reduce && sfx !== null) markReady();
  }, [reduce, sfx, markReady]);

  // Pause off screen / in a background tab.
  useEffect(() => {
    if (reduce) return;
    const sync = () => {
      const v = layers[frontRef.current].current;
      if (!v || !v.currentSrc) return;
      if (!onScreen.current || document.hidden) v.pause();
      else if (!v.ended) v.play().catch(() => {});
    };
    const io = new IntersectionObserver(([e]) => {
      onScreen.current = e.isIntersecting;
      sync();
    });
    if (wrap.current) io.observe(wrap.current);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduce, layers]);

  // Mouse parallax: the frame drifts a little against the pointer, eased.
  useEffect(() => {
    if (reduce) return;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      if (stage.current && onScreen.current) {
        stage.current.style.transform = `translate3d(${(-cur.x * 14).toFixed(2)}px, ${(-cur.y * 9).toFixed(2)}px, 0) scale(1.04)`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  const poster = sfx === null ? undefined : `${DIR}/hero-s${step}${sfx}.jpg`;

  return (
    <div ref={wrap} className={`overflow-hidden bg-[#120e0b] ${className}`}>
      <div ref={stage} className="absolute inset-0 will-change-transform" style={{ transform: "scale(1.04)" }}>
        {reduce
          ? poster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )
          : layers.map((ref, i) => (
              <video
                key={i}
                ref={ref}
                muted
                playsInline
                preload="auto"
                aria-hidden
                className={`absolute inset-0 h-full w-full object-cover ${
                  fade ? "transition-opacity duration-[600ms] ease-out" : ""
                } ${i === front ? "opacity-100" : "opacity-0"}`}
              />
            ))}
      </div>
    </div>
  );
}
