"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Muted looping product clip (public/media/story).
 * Plays only while on screen and while `active`; restarts from 0 when it becomes
 * active so each step's story starts at the beginning. Reduced motion shows the poster.
 */
export function LoopVideo({
  src,
  poster,
  label,
  active = true,
  priority = false,
  className = "",
}: {
  src: string;
  poster: string;
  label: string;
  active?: boolean;
  priority?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const onScreen = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const sync = () => {
      if (reduce || !active || !onScreen.current || document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    const obs = new IntersectionObserver(([e]) => {
      onScreen.current = e.isIntersecting;
      sync();
    }, { threshold: 0.2 });
    obs.observe(v);
    document.addEventListener("visibilitychange", sync);
    // Skip the clip's 0.5 s fade-in so a newly active step never flashes an empty stage.
    if (active) v.currentTime = 0.5;
    sync();
    return () => {
      obs.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [active, reduce]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={priority ? "auto" : "metadata"}
      aria-label={label}
      className={`block aspect-video w-full object-cover ${className}`}
    />
  );
}
