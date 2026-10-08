"use client";

// Animated SVG illustration. Loads /illustrations/<name>.svg (unDraw files the
// team downloads by hand; the unDraw licence forbids automated downloading),
// inlines it so GSAP can reach the shapes, then:
//   1. builds it in: shapes appear in drawing order, outlined paths draw on
//   2. breathes: shapes in the accent colour float gently
// Plays when on screen (IntersectionObserver, so it also works inside the
// horizontally panned freelancer section), pauses off screen, and stays static
// with reduced motion. A missing file renders nothing.

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

if (typeof window !== "undefined") gsap.registerPlugin(DrawSVGPlugin);

/** Accent colour chosen on undraw.co before downloading. */
const ACCENT = "#f59e0b";
const SHAPES = "path, circle, ellipse, rect, polygon, polyline, line";

/** The scene neutrals from scripts/draw-illustrations.mjs, mapped to theme
 *  variables (theme.css --illo-*) so backgrounds, desks and cards follow the
 *  light / dark theme. People, props and the accent keep their own colours. */
const THEME_MAP: Record<string, string> = {
  "#1b1f2c": "var(--illo-blob)",
  "#20253a": "var(--illo-blob)",
  "#2c3248": "var(--illo-floor)",
  "#3a405a": "var(--illo-desk)",
  "#3a4260": "var(--illo-desk)",
  "#2e344a": "var(--illo-desk-leg)",
  "#2b3146": "var(--illo-chair)",
  "#262c3d": "var(--illo-card)",
  "#2f3650": "var(--illo-card-2)",
  "#30374f": "var(--illo-card-2)",
  "#2a3144": "var(--illo-device)",
};

function retheme(svg: SVGSVGElement) {
  svg.querySelectorAll("*").forEach((el) => {
    for (const prop of ["fill", "stroke"] as const) {
      const v = el.getAttribute(prop)?.toLowerCase();
      // A CSS property (not the attribute) so var() resolves and flips with the theme.
      if (v && THEME_MAP[v]) (el as SVGElement).style.setProperty(prop, THEME_MAP[v]);
    }
  });
}

/** Crop the viewBox to the drawing so it fills its slot. */
function fitToArt(svg: SVGSVGElement) {
  try {
    const b = svg.getBBox();
    if (b.width && b.height) {
      const pad = Math.max(b.width, b.height) * 0.04;
      svg.setAttribute("viewBox", `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
    }
  } catch {
    /* keep the original viewBox */
  }
}

/** Keep only drawing markup from the file. */
function sanitize(svg: SVGSVGElement) {
  svg.querySelectorAll("script, foreignObject, iframe, object, embed").forEach((n) => n.remove());
  svg.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const v = attr.value.trim().toLowerCase();
      if (attr.name.startsWith("on") || ((attr.name === "href" || attr.name === "xlink:href") && v.startsWith("javascript:"))) {
        el.removeAttribute(attr.name);
      }
    }
  });
}

// Loaded art changes section heights; recalc scroll positions once loads settle.
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 250);
}

const isAccent = (el: Element) => {
  const fill = (el.getAttribute("fill") || (el as SVGElement).style?.fill || "").toLowerCase();
  return fill === ACCENT;
};

interface Props {
  name: string;
  /** Accessible description; omit for purely decorative art. */
  label?: string;
  className?: string;
}

export function Illustration({ name, label, className }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Fetch and inline the file.
  useEffect(() => {
    let cancelled = false;
    fetch(`/illustrations/${name}.svg`)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        if (cancelled || !root.current) return;
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const svg = doc.querySelector("svg");
        if (!svg || doc.querySelector("parsererror")) return;
        sanitize(svg);
        retheme(svg);
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.setAttribute("class", "h-full w-full overflow-visible");
        if (label) {
          svg.setAttribute("role", "img");
          svg.setAttribute("aria-label", label);
        } else {
          svg.setAttribute("aria-hidden", "true");
        }
        const node = document.importNode(svg, true);
        root.current.replaceChildren(node);
        fitToArt(node);
        setReady(true);
        scheduleRefresh();
      })
      .catch(() => {
        if (process.env.NODE_ENV !== "production") console.info(`[Illustration] /illustrations/${name}.svg not found yet`);
      });
    return () => {
      cancelled = true;
    };
  }, [name, label]);

  // Animate once the shapes exist.
  useGSAP(
    () => {
      if (!ready || !root.current) return;
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        const el = root.current!;
        const shapes = gsap.utils.toArray<SVGElement>(el.querySelectorAll(SHAPES));
        const strokes = shapes.filter((s) => {
          const stroke = s.getAttribute("stroke");
          return stroke && stroke !== "none" && (!s.getAttribute("fill") || s.getAttribute("fill") === "none");
        });
        const fills = shapes.filter((s) => !strokes.includes(s));
        const accents = fills.filter(isAccent);

        // Whole build lasts about 1.4s however many shapes the file has.
        const each = Math.min(0.03, 1.1 / Math.max(fills.length, 1));
        const build = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
        build
          .from(fills, { autoAlpha: 0, scale: 0.86, y: 6, transformOrigin: "50% 50%", duration: 0.5, stagger: each })
          .from(strokes, { drawSVG: "0%", duration: 0.9, stagger: 0.05 }, 0.15);

        // Idle loops. Files can mark parts with data-anim hooks (see
        // public/illustrations/README.md); files without hooks float their accent shapes.
        const hook = (name: string) => gsap.utils.toArray<SVGGElement>(el.querySelectorAll(`[data-anim="${name}"]`));
        const loop = { paused: true, repeat: -1, yoyo: true, ease: "sine.inOut" } as const;
        const loops: gsap.core.Tween[] = [];
        const origin = (n: Element) => n.getAttribute("data-origin") ?? undefined;
        hook("wave").forEach((n) => loops.push(gsap.fromTo(n, { rotation: -14, svgOrigin: origin(n) }, { rotation: 10, svgOrigin: origin(n), duration: 0.6, ...loop })));
        hook("sway").forEach((n, i) => loops.push(gsap.fromTo(n, { rotation: -3, svgOrigin: origin(n) }, { rotation: 3, svgOrigin: origin(n), duration: 2.4 + i * 0.3, ...loop })));
        hook("float").forEach((n, i) => loops.push(gsap.to(n, { y: -7, duration: 2 + (i % 3) * 0.35, delay: i * 0.2, ...loop })));
        hook("pulse").forEach((n) => loops.push(gsap.to(n, { opacity: 0.35, duration: 0.9, ...loop })));
        if (!loops.length && accents.length) {
          loops.push(gsap.to(accents, { y: -6, duration: 2.2, stagger: { each: 0.25, from: "random" }, ...loop }));
        }
        const breathe = { play: () => loops.forEach((t) => t.play()), pause: () => loops.forEach((t) => t.pause()) };

        let built = false;
        const io = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              if (!built) {
                built = true;
                build.play().then(() => breathe.play());
              } else if (build.progress() === 1) breathe.play();
            } else breathe.pause();
          },
          { threshold: 0.35 },
        );
        io.observe(el);
        const onVisibility = () => (document.hidden ? breathe.pause() : undefined);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
          io.disconnect();
          document.removeEventListener("visibilitychange", onVisibility);
        };
      });
    },
    { scope: root, dependencies: [ready], revertOnUpdate: true },
  );

  // Until a file has loaded the box takes no space (a missing illustration leaves
  // no gap) but stays rendered, so the SVG can be measured for cropping.
  return <div ref={root} className={ready ? className : "pointer-events-none absolute h-px w-px overflow-hidden opacity-0"} />;
}
