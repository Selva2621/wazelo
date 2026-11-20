"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, ScrollTrigger, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";
import { LoopVideo } from "@/components/home/loop-video";

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

// ─── Industries data ──────────────────────────────────────────────────────────
type Industry = {
  id: string;
  tag: string;
  title: [string, string];
  desc: string;
  bullets: string[];
  /** Portrait from public/media/story; sections without one show the app clip full size. */
  photo?: string;
  clip: string;
};

const industries: Industry[] = [
  {
    id: "ecommerce",
    tag: "E-commerce",
    title: ["Recover carts.", "Drive repeat orders."],
    desc: "Turn WhatsApp into your best sales channel. Reach customers at every stage of their buying journey with automated, personalised messages.",
    bullets: [
      "Abandoned cart recovery with one-click checkout links",
      "Order confirmation and shipping updates on WhatsApp",
      "Post-delivery review requests and upsell campaigns",
      "Customer support with a shared team inbox",
    ],
    photo: "boutique",
    clip: "ch2-reply",
  },
  {
    id: "realestate",
    tag: "Real estate",
    title: ["Close more deals.", "Faster."],
    desc: "Real estate runs on relationships. Wazelo helps you follow up instantly, send property details, and stay top of mind with every prospect.",
    bullets: [
      "Instant lead response from WhatsApp ads and portals",
      "Property brochures and virtual tour links on demand",
      "Site visit reminders and follow-up automation",
      "Deal pipeline tracking with contact tags",
    ],
    photo: "realty",
    clip: "ch3-follow",
  },
  {
    id: "healthcare",
    tag: "Healthcare",
    title: ["Reduce no-shows.", "Improve care."],
    desc: "Automate appointment reminders, prescription alerts and health tips, all through a channel your patients already use every day.",
    bullets: [
      "Appointment booking confirmations and reminders",
      "Prescription ready and refill notifications",
      "Post-visit care instructions and follow-ups",
      "Lab report delivery by WhatsApp message",
    ],
    photo: "hero",
    clip: "ch3-follow",
  },
  {
    id: "education",
    tag: "Education",
    title: ["Engage students.", "Enrol faster."],
    desc: "From admission enquiries to fee payment nudges, Wazelo keeps your institution connected with students and parents all year.",
    bullets: [
      "Instant response to admission enquiry forms",
      "Fee due reminders and payment confirmation",
      "Exam schedule and result notifications",
      "Bulk broadcast for events and announcements",
    ],
    photo: "coaching-desk",
    clip: "ch1-find",
  },
  {
    id: "travel",
    tag: "Travel and hospitality",
    title: ["Deliver the experience", "before they arrive."],
    desc: "Set the tone before check-in. Send itineraries, upsell add-ons, and answer customer queries from one WhatsApp-first inbox.",
    bullets: [
      "Booking confirmation with a downloadable itinerary",
      "Pre-arrival upsell for room upgrades and excursions",
      "Real-time flight or tour status updates",
      "Post-trip review requests and loyalty offers",
    ],
    clip: "ch2-reply",
  },
  {
    id: "finance",
    tag: "Finance and insurance",
    title: ["Nurture leads.", "Retain clients."],
    desc: "Personalised follow-up at scale. Stay on top of policy renewals, KYC steps and loan applications without missing a beat.",
    bullets: [
      "Policy renewal reminders and premium due alerts",
      "KYC document collection on WhatsApp",
      "Loan application status updates",
      "Investment portfolio alerts and SIP reminders",
    ],
    clip: "ch4-close",
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

function scrollToIndustry(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 120;
  window.scrollTo({ top, behavior: "smooth" });
}

// ─── Industry section ─────────────────────────────────────────────────────────
function IndustrySection({ ind, index }: { ind: Industry; index: number }) {
  const reverse = index % 2 === 1;
  const clipLabel = `${ind.tag} follow-up in the Wazelo app`;

  return (
    <section id={ind.id} data-uc="section" className={`scroll-mt-32 border-t border-ink/10 px-4 py-24 sm:px-6 lg:px-8 lg:py-32 ${index % 2 === 1 ? "bg-paper-deep/60" : ""}`}>
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-12 lg:gap-10">
        {/* Text */}
        <div data-uc="text" className={`lg:col-span-5 ${reverse ? "lg:order-2 lg:col-start-8" : ""}`}>
          <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">
            <span className="font-mono tracking-normal">{pad(index + 1)}</span>
            <span aria-hidden className="h-px w-8 bg-ink/20" />
            <span className="text-rust">{ind.tag}</span>
          </p>
          <h2 className="mt-6 font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-6xl">
            {ind.title[0]} <em className="text-rust">{ind.title[1]}</em>
          </h2>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-ink-soft">{ind.desc}</p>
          <ul className="mt-10">
            {ind.bullets.map((b, bi) => (
              <li key={b} data-uc="bullet" className="flex gap-5 border-t border-ink/15 py-4 last:border-b">
                <span className="pt-0.5 font-mono text-xs text-ink-faint">{pad(bi + 1)}</span>
                <span className="text-[15px] leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
          <a
            data-uc="cta"
            href={APP_REGISTER_URL}
            className={`group mt-10 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-black active:scale-[0.98] ${focusInk}`}
          >
            Try it free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Media */}
        <div data-uc="media" className={`lg:col-span-6 ${reverse ? "lg:order-1 lg:col-start-1" : "lg:col-start-7"}`}>
          {ind.photo ? (
            <div className="relative pb-16 sm:pb-20">
              {/* Whole photo at its own shape (portrait or landscape), never cropped. */}
              <div data-uc="photo" className="overflow-hidden rounded-[1.25rem] bg-paper-deep">
                <Image
                  src={`/media/story/${ind.photo}.jpg`}
                  alt=""
                  width={ind.photo === "hero" ? 1280 : 1024}
                  height={ind.photo === "hero" ? 704 : 1280}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="h-auto w-full"
                />
              </div>
              <div
                data-uc="clip"
                className={`absolute bottom-0 w-[68%] overflow-hidden rounded-xl bg-white shadow-[0_40px_80px_-30px_rgba(60,40,20,0.55),0_0_0_1px_rgba(23,19,15,0.08)] ${reverse ? "right-4 sm:right-8" : "left-4 sm:left-8"}`}
              >
                <LoopVideo src={`/media/story/${ind.clip}.mp4`} poster={`/media/story/${ind.clip}.jpg`} label={clipLabel} />
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-[0_60px_120px_-40px_rgba(60,40,20,0.5),0_0_0_1px_rgba(23,19,15,0.08)]">
              <div className="flex items-center gap-2 border-b border-ink/[0.07] bg-[#faf8f5] px-4 py-3">
                <span className="size-2.5 rounded-full bg-[#e8645a]" />
                <span className="size-2.5 rounded-full bg-[#f1bf4c]" />
                <span className="size-2.5 rounded-full bg-[#5fc454]" />
                <span className="ml-3 truncate rounded-md bg-ink/[0.05] px-3 py-1 font-mono text-[11px] text-ink-soft">app.wazelo.in</span>
              </div>
              <LoopVideo src={`/media/story/${ind.clip}.mp4`} poster={`/media/story/${ind.clip}.jpg`} label={clipLabel} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Use cases page ───────────────────────────────────────────────────────────
export default function UseCasesPage() {
  const root = useRef<HTMLDivElement>(null);
  const [activeIndustry, setActiveIndustry] = useState(industries[0].id);

  useGSAP(
    () => {
      // Active state for the jump bar runs regardless of motion preference.
      industries.forEach((ind) => {
        ScrollTrigger.create({
          trigger: `#${ind.id}`,
          start: "top 140px",
          end: "bottom 140px",
          onToggle: (self) => self.isActive && setActiveIndustry(ind.id),
        });
      });

      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.1 } })
          .from("[data-uc=kicker]", { y: 12, autoAlpha: 0, duration: 0.7 })
          .from("[data-uc=title]", { y: 50, autoAlpha: 0 }, 0.1)
          .from("[data-uc=sub]", { y: 24, autoAlpha: 0 }, 0.3)
          .from("[data-uc=pill]", { y: 16, autoAlpha: 0, stagger: 0.05 }, 0.4);

        gsap.utils.toArray<HTMLElement>("[data-uc=section]").forEach((sec) => {
          const st = { trigger: sec, start: "top 75%", once: true };
          gsap.from(sec.querySelectorAll("[data-uc=text] > *:not(ul), [data-uc=bullet]"), { y: 40, autoAlpha: 0, stagger: 0.07, duration: 1, ease: "expo.out", scrollTrigger: st });
          gsap.from(sec.querySelector("[data-uc=media]"), { y: 80, autoAlpha: 0, duration: 1.3, ease: "expo.out", scrollTrigger: st });
          const clip = sec.querySelector("[data-uc=clip]");
          if (clip) gsap.from(clip, { y: 40, autoAlpha: 0, duration: 1.1, delay: 0.35, ease: "expo.out", scrollTrigger: st });
        });

        gsap.from("[data-uc=why] > *", { y: 40, autoAlpha: 0, stagger: 0.12, duration: 1, ease: "expo.out", scrollTrigger: { trigger: "[data-uc=why]", start: "top 75%", once: true } });
        gsap.from("[data-uc=end] > *", { y: 40, autoAlpha: 0, stagger: 0.12, duration: 1, ease: "expo.out", scrollTrigger: { trigger: "[data-uc=end]", start: "top 80%", once: true } });
      });

      mm.add(MQ_FULL, () => {
        // Photo cards drift; the clip card rises a touch faster. Nothing is cropped.
        gsap.utils.toArray<HTMLElement>("[data-uc=photo]").forEach((el) =>
          gsap.fromTo(el, { y: -18 }, { y: 18, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } }),
        );
        gsap.utils.toArray<HTMLElement>("[data-uc=clip]").forEach((el) =>
          gsap.fromTo(el, { y: 40 }, { y: -40, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } }),
        );
        gsap.fromTo("[data-uc=progress]", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom bottom", scrub: 0.3 } });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      <span data-uc="progress" aria-hidden className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left scale-x-0 bg-rust" />
      <SiteNavbar activePage="Use Cases" />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-28 lg:pt-44">
        <div className="mx-auto max-w-7xl">
          <p data-uc="kicker" className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Use cases</p>
          <h1 data-uc="title" className="mt-6 max-w-5xl font-display text-[clamp(3rem,8vw,7.5rem)] leading-[0.92] tracking-[-0.02em]">
            One platform. <em className="text-rust">Every industry.</em>
          </h1>
          <p data-uc="sub" className="mt-8 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            From e-commerce to healthcare, Wazelo makes sure every lead gets a reply and a follow-up, for businesses of every shape and size.
          </p>
          <div className="mt-12 flex flex-wrap gap-2.5">
            {industries.map((ind, i) => (
              <button
                key={ind.id}
                data-uc="pill"
                type="button"
                onClick={() => scrollToIndustry(ind.id)}
                className={`inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/60 px-5 py-2.5 text-sm font-medium transition-colors hover:border-rust hover:text-rust ${focusInk}`}
              >
                <span className="font-mono text-[11px] text-ink-faint">{pad(i + 1)}</span>
                {ind.tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky jump bar ───────────────────────────────────────────────── */}
      <nav aria-label="Industries" className="sticky top-16 z-40 hidden border-y border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur-sm sm:px-6 md:block lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-1.5">
          {industries.map((ind) => {
            const on = activeIndustry === ind.id;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => scrollToIndustry(ind.id)}
                aria-current={on ? "true" : undefined}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${focusInk} ${on ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
              >
                {ind.tag}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Industry sections ─────────────────────────────────────────────── */}
      {industries.map((ind, i) => (
        <IndustrySection key={ind.id} ind={ind} index={i} />
      ))}

      {/* ── Why WhatsApp ──────────────────────────────────────────────────── */}
      <section className="border-t border-ink/10 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div data-uc="why" className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-12">
          <h2 className="font-display text-4xl leading-[0.95] tracking-[-0.02em] md:text-6xl lg:col-span-7">
            Why WhatsApp? <em className="text-rust">Your customers are already there.</em>
          </h2>
          <p className="max-w-md text-lg leading-relaxed text-ink-soft lg:col-span-4 lg:col-start-9 lg:pt-3">
            Whatever you sell, people ask on WhatsApp first. Wazelo gives every one of those chats a reply, an owner and a follow-up.
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-ink px-4 py-28 text-paper sm:px-6 lg:px-8 lg:py-36">
        <div data-uc="end" className="mx-auto max-w-4xl text-center">
          <h2 className="font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
            Follow up every lead, <em className="text-[#f0b483]">starting today.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-[40ch] text-lg text-paper/70">Free for 14 days. No credit card. Set up in minutes.</p>
          <a
            href={APP_REGISTER_URL}
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-paper px-8 py-4 text-sm font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          >
            Get started for free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
