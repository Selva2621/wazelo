"use client";

// The app's dashboard checklist ("Complete your setup", frontend
// components/dashboard/setup-checklist.tsx), told on scroll: the ring fills and
// each step checks off as it passes the middle of the screen.

import { useRef } from "react";
import { Check, FileText, Package, QrCode, Upload, type LucideIcon } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: QrCode, title: "Connect WhatsApp", text: "Scan a QR from Settings, Linked Devices. Your number stays on your phone." },
  { icon: Package, title: "Add your products", text: "A catalogue you can tag on contacts and target in campaigns." },
  { icon: FileText, title: "Create a message template", text: "Write it once. Send it from a chat, a campaign or a sequence." },
  { icon: Upload, title: "Import your contacts", text: "Upload a CSV, or pull leads straight from the Lead Scraper." },
];

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

export function Setup() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const rows = gsap.utils.toArray<HTMLElement>("[data-setup=step]");
      const label = root.current!.querySelector<HTMLElement>("[data-setup=count]")!;
      const pct = root.current!.querySelector<HTMLElement>("[data-setup=pct]")!;
      const show = (done: number) => {
        rows.forEach((r, i) => (r.dataset.done = String(i < done)));
        label.textContent = `${done} of ${STEPS.length} steps done`;
        pct.textContent = `${Math.round((done / STEPS.length) * 100)}%`;
      };

      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        show(0);
        // Ring follows the scroll smoothly; ticks land as each row crosses the middle.
        gsap.fromTo(
          "[data-setup=ring]",
          { strokeDashoffset: RING_C },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: { trigger: "[data-setup=list]", start: "top 55%", end: "bottom 55%", scrub: 0.6 },
          },
        );
        rows.forEach((row, i) =>
          ScrollTrigger.create({
            trigger: row,
            start: "center 55%",
            onEnter: () => show(i + 1),
            onLeaveBack: () => show(i),
          }),
        );
      });
      // Reduced motion: the finished checklist.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-setup=ring]", { strokeDashoffset: 0 });
        show(STEPS.length);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="setup" className="relative scroll-mt-16 py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20 lg:px-8">
        {/* left: heading and the checklist card, held in view while the steps pass */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-4xl font-semibold leading-[1.05] tracking-tighter text-on-surface md:text-5xl">
            Live in four steps.
          </h2>
          <p className="mt-4 max-w-[40ch] text-lg leading-relaxed text-on-surface-variant">The same checklist you see on your first day in the app.</p>

          <div className="lg-glass mt-10 flex w-max items-center gap-5 rounded-2xl p-5 pr-7">
            <div className="relative size-[120px]">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                <circle cx="60" cy="60" r={RING_R} fill="none" strokeWidth="8" className="stroke-ink/10" />
                <circle
                  data-setup="ring"
                  cx="60"
                  cy="60"
                  r={RING_R}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={0}
                  className="stroke-primary-container"
                />
              </svg>
              <span data-setup="pct" className="absolute inset-0 grid place-items-center text-2xl font-semibold tabular-nums text-on-surface">
                100%
              </span>
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-on-surface">Complete your setup</p>
              <p data-setup="count" className="mt-1 text-sm text-on-surface-variant">
                4 of 4 steps done
              </p>
            </div>
          </div>
        </div>

        {/* right: the four steps */}
        <ol data-setup="list" className="flex flex-col">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li
              key={title}
              data-setup="step"
              data-done="true"
              className="group flex gap-5 border-t border-outline-variant py-10 first:border-t-0 first:pt-0 lg:py-14"
            >
              <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-surface-container-lowest text-on-surface-variant ring-1 ring-outline-variant transition-colors duration-300 group-data-[done=true]:bg-primary-container group-data-[done=true]:text-on-primary group-data-[done=true]:ring-primary-container">
                <Icon className="h-5 w-5 transition-opacity duration-200 group-data-[done=true]:opacity-0" />
                <Check className="absolute h-5 w-5 scale-50 opacity-0 transition-all duration-300 ease-standard group-data-[done=true]:scale-100 group-data-[done=true]:opacity-100" strokeWidth={2.5} />
              </span>
              <div className="pt-1.5">
                <h3 className="text-2xl font-semibold tracking-tight text-on-surface md:text-3xl">{title}</h3>
                <p className="mt-2 max-w-[46ch] leading-relaxed text-on-surface-variant">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
