"use client";

// Logo rail directly under the hero. Marks from Simple Icons, tinted to the muted
// text colour so no brand colour competes with the accent. The rail is the page's
// only marquee: a GSAP loop that pauses off screen and slows on hover.

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";

const LOGOS = [
  { slug: "whatsapp", name: "WhatsApp Business" },
  { slug: "meta", name: "Meta" },
  { slug: "shopify", name: "Shopify" },
  { slug: "razorpay", name: "Razorpay" },
  { slug: "woocommerce", name: "WooCommerce" },
  { slug: "zoho", name: "Zoho" },
  { slug: "googlesheets", name: "Google Sheets" },
  { slug: "zapier", name: "Zapier" },
];

function LogoSet({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-16 pr-16" aria-hidden={hidden || undefined}>
      {LOGOS.map((l) => (
        <li key={l.slug} className="flex items-center gap-3 text-sm text-on-surface-variant">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://cdn.simpleicons.org/${l.slug}/a3aabb`}
            alt={hidden ? "" : l.name}
            width={26}
            height={26}
            loading="lazy"
            className="h-[26px] w-[26px]"
          />
          <span className="whitespace-nowrap">{l.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function Integrations() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        // Track holds two identical sets; moving it by -50% loops seamlessly.
        const loop = gsap.to("[data-rail]", { xPercent: -50, ease: "none", duration: 40, repeat: -1 });
        const st = ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
        });
        const slow = contextSafe!(() => gsap.to(loop, { timeScale: 0.25, duration: 0.6, overwrite: true }));
        const fast = contextSafe!(() => gsap.to(loop, { timeScale: 1, duration: 0.6, overwrite: true }));
        const el = root.current!;
        el.addEventListener("pointerenter", slow);
        el.addEventListener("pointerleave", fast);
        return () => {
          st.kill();
          el.removeEventListener("pointerenter", slow);
          el.removeEventListener("pointerleave", fast);
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} aria-label="Integrations" className="border-y border-outline-variant/70 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:px-6 lg:flex-row lg:gap-10 lg:px-8">
        <p className="shrink-0 text-sm text-on-surface-variant">Works with the tools you already use</p>
        <div className="w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
          <div data-rail className="flex w-max will-change-transform">
            <LogoSet />
            <LogoSet hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
