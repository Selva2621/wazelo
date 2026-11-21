"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Send, Settings, Smartphone, Zap } from "lucide-react";

// Coordinates are in CSS pixels: the SVG has no viewBox scaling, so the same path
// string drives both the dashed trail and the plane's CSS offset-path.
const W = 320;
const H = 180;

const PATHS = {
  // Climbs from the phone, loops the loop, and wanders off the top-right edge.
  "404": "M 44 146 C 90 138, 112 92, 150 82 C 200 70, 206 22, 170 22 C 134 22, 138 76, 186 80 C 232 84, 262 52, 304 26",
  // Straight-ish climb that stalls halfway (where the gear spins), then recovers.
  "500": "M 44 146 C 100 130, 128 104, 164 98 C 204 92, 252 62, 304 34",
} as const;

const EASE = [0.45, 0, 0.25, 1] as const;

interface ErrorIllustrationProps {
  code: "404" | "500";
}

/** Animated "message as paper plane": lost on its way (404) or stalled mid-flight (500). */
export function ErrorIllustration({ code }: ErrorIllustrationProps) {
  const reduce = useReducedMotion();
  const maskId = useId();
  const d = PATHS[code];
  const stalls = code === "500";

  // 404: one smooth flight that fades out at the end. 500: fly, hold mid-air, resume.
  const flight = stalls
    ? { distance: ["0%", "50%", "50%", "100%"], times: [0, 0.35, 0.7, 1], duration: 4.4 }
    : { distance: ["0%", "100%"], times: [0, 1], duration: 3.4 };

  const loop = { duration: flight.duration, times: flight.times, ease: EASE, repeat: Infinity, repeatDelay: 0.9 };
  const fade = { opacity: [0, 1, 1, 0], times: [0, 0.08, 0.86, 1] };
  const fadeLoop = { duration: flight.duration, times: fade.times, ease: "linear" as const, repeat: Infinity, repeatDelay: 0.9 };

  return (
    <div aria-hidden className="relative mx-auto select-none" style={{ width: W, height: H }}>
      {/* Soft glow so the scene has a floor in every theme */}
      <div className="absolute left-1/2 top-1/2 h-28 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl" />

      <svg width={W} height={H} className="absolute inset-0 overflow-visible text-outline">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <motion.path
              d={d}
              fill="none"
              stroke="white"
              strokeWidth={6}
              strokeLinecap="round"
              initial={false}
              animate={reduce ? { pathLength: 1 } : { pathLength: [0, ...flight.distance.slice(1).map((p) => parseFloat(p) / 100)] }}
              transition={reduce ? undefined : loop}
            />
          </mask>
        </defs>
        {/* Faint full route, then the dashed trail revealed behind the plane */}
        <path d={d} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={1.5} />
        <motion.path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeDasharray="4 6"
          strokeLinecap="round"
          mask={`url(#${maskId})`}
          animate={reduce ? undefined : { opacity: fade.opacity }}
          transition={reduce ? undefined : fadeLoop}
        />
      </svg>

      {/* Origin: the phone the message left from */}
      <div className="absolute flex size-11 items-center justify-center rounded-xl border border-outline-variant/60 bg-surface-container text-on-surface-variant" style={{ left: 14, top: 128 }}>
        <Smartphone className="size-5" strokeWidth={1.75} />
      </div>

      {/* The plane, riding the same path via CSS offset-path */}
      <motion.div
        className="absolute left-0 top-0"
        style={{ offsetPath: `path("${d}")`, offsetRotate: "auto", offsetDistance: reduce ? "56%" : "0%" }}
        animate={reduce ? undefined : { offsetDistance: flight.distance, opacity: fade.opacity }}
        transition={reduce ? undefined : { offsetDistance: loop, opacity: fadeLoop }}
      >
        {/* Turn the Send glyph so its nose faces offset-path's direction of travel (+x) */}
        <motion.div
          style={{ rotate: 225 }}
          animate={!reduce && stalls ? { rotate: [225, 225, 212, 236, 218, 225, 225] } : undefined}
          transition={
            !reduce && stalls
              ? { duration: flight.duration, times: [0, 0.35, 0.44, 0.52, 0.6, 0.7, 1], repeat: Infinity, repeatDelay: 0.9 }
              : undefined
          }
        >
          <Send className="size-7 fill-primary/15 text-primary" strokeWidth={1.75} />
        </motion.div>
      </motion.div>

      {stalls && (
        <>
          {/* Gear spins while the plane is stuck */}
          <motion.div
            className="absolute text-on-surface-variant"
            style={{ left: 176, top: 52 }}
            initial={false}
            animate={reduce ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0, 0], rotate: [0, 0, 0, 240, 240, 240] }}
            transition={
              reduce
                ? undefined
                : { duration: flight.duration, times: [0, 0.34, 0.4, 0.66, 0.72, 1], ease: "linear", repeat: Infinity, repeatDelay: 0.9 }
            }
          >
            <Settings className="size-6" strokeWidth={1.75} />
          </motion.div>
          {/* Spark flickers once */}
          <motion.div
            className="absolute text-warning"
            style={{ left: 140, top: 66 }}
            initial={false}
            animate={reduce ? { opacity: 0 } : { opacity: [0, 0, 1, 0.15, 1, 0, 0], scale: [0.6, 0.6, 1.1, 0.9, 1, 0.6, 0.6] }}
            transition={
              reduce
                ? undefined
                : { duration: flight.duration, times: [0, 0.4, 0.44, 0.48, 0.52, 0.58, 1], repeat: Infinity, repeatDelay: 0.9 }
            }
          >
            <Zap className="size-4 fill-warning/30" strokeWidth={2} />
          </motion.div>
        </>
      )}
    </div>
  );
}
