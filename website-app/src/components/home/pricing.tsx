"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_MOTION } from "@/lib/gsap";

// Prices and limits from backend/prisma/seed-plans.js (INR). Yearly = 10x monthly.
interface Plan {
  name: string;
  monthly: number;
  yearly: number;
  limits: string;
  features: string[];
}

const SOLO: Plan = {
  name: "Solo",
  monthly: 299,
  yearly: 2990,
  limits: "1 user, 1 WhatsApp number, 3,000 messages a month",
  features: ["Lead finder and client pipeline", "26 freelancer templates", "Follow-up sequences", "5 campaigns a month"],
};

const TEAM_PLANS: (Plan & { popular?: boolean })[] = [
  {
    name: "Starter",
    monthly: 499,
    yearly: 4990,
    limits: "5 users, 5 numbers, 5,000 messages a month",
    features: ["Shared inbox", "10 campaigns a month", "50 AI credits", "1 Shopify store", "Email support"],
  },
  {
    name: "Growth",
    monthly: 999,
    yearly: 9990,
    limits: "15 users, 15 numbers, 25,000 messages a month",
    features: ["Everything in Starter", "50 campaigns a month", "200 AI credits", "Automation workflows", "Priority support"],
    popular: true,
  },
  {
    name: "Pro",
    monthly: 1999,
    yearly: 19990,
    limits: "50 users, 50 numbers, 1,00,000 messages a month",
    features: ["Everything in Growth", "200 campaigns a month", "500 AI credits", "Full API access", "Dedicated account manager"],
  },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Price({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  const value = yearly ? plan.yearly : plan.monthly;
  return (
    <p className="flex items-baseline gap-1.5">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="font-display text-6xl leading-none tabular-nums"
        >
          {inr(value)}
        </motion.span>
      </AnimatePresence>
      <span className="text-sm opacity-60">/{yearly ? "year" : "month"}</span>
    </p>
  );
}

function Features({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="mb-10 mt-8 flex flex-col gap-3 text-[15px]">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-3">
          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? "text-[#f0b483]" : "text-rust"}`} />
          <span className={dark ? "text-paper/80" : "text-ink-soft"}>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  const section = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MQ_MOTION, () => {
        gsap.from("[data-pr=head] > *", { y: 40, autoAlpha: 0, stagger: 0.1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: section.current, start: "top 75%", once: true } });
        gsap.from("[data-plan]", { y: 80, autoAlpha: 0, stagger: 0.12, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: "[data-plan]", start: "top 85%", once: true } });
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} id="pricing" className="scroll-mt-16 border-t border-ink/10 bg-paper px-4 py-28 text-ink sm:px-6 lg:px-8 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <div data-pr="head" className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Pricing</p>
            <h2 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-7xl">
              Simple pricing. <em className="text-rust">In rupees.</em>
            </h2>
            <p className="mt-5 text-base text-ink-soft">Every plan starts with a 14-day free trial. No card needed.</p>
          </div>
          <div role="group" aria-label="Billing period" className="flex w-max gap-1 rounded-full border border-ink/15 bg-card/60 p-1 text-sm">
            {[
              { label: "Monthly", value: false },
              { label: "Yearly, 2 months free", value: true },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={yearly === o.value}
                onClick={() => setYearly(o.value)}
                className={`relative rounded-full px-4 py-2 font-medium transition-colors ${focusInk} ${yearly === o.value ? "text-paper" : "text-ink-soft hover:text-ink"}`}
              >
                {yearly === o.value && <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 38 }} />}
                <span className="relative">{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-5 lg:grid-cols-12">
          {/* Solo: freelancers */}
          <div data-plan className="lg:col-span-4">
            <article className="tone-fixed flex h-full flex-col rounded-[1.5rem] bg-ink p-8 text-paper lg:p-10">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-3xl">{SOLO.name}</h3>
                <span className="rounded-full border border-paper/20 px-3 py-1 text-xs font-medium text-paper/70">For freelancers</span>
              </div>
              <div className="mt-8">
                <Price plan={SOLO} yearly={yearly} />
              </div>
              <p className="mt-4 text-sm text-paper/60">{SOLO.limits}</p>
              <Features items={SOLO.features} dark />
              <a
                href={APP_REGISTER_URL}
                className="group mt-auto inline-flex items-center justify-center gap-2 rounded-full bg-paper px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </article>
          </div>

          {/* Team plans */}
          <div data-plan className="lg:col-span-8">
            <div className="grid h-full divide-y divide-ink/10 rounded-[1.5rem] border border-ink/10 bg-card/70 md:grid-cols-3 md:divide-x md:divide-y-0">
              {TEAM_PLANS.map((p) => (
                <article key={p.name} className={`relative flex flex-col p-8 ${p.popular ? "bg-rust/[0.07]" : ""}`}>
                  {p.popular && <span aria-hidden className="absolute inset-x-8 top-0 h-0.5 bg-rust" />}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-3xl">{p.name}</h3>
                    {p.popular && <span className="rounded-full bg-rust/10 px-2.5 py-0.5 text-xs font-semibold text-rust">Most chosen</span>}
                  </div>
                  <div className="mt-8">
                    <Price plan={p} yearly={yearly} />
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">{p.limits}</p>
                  <Features items={p.features} />
                  <a
                    href={APP_REGISTER_URL}
                    className={`mt-auto inline-flex justify-center rounded-full px-6 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98] ${focusInk} ${
                      p.popular ? "bg-ink text-paper hover:bg-ink/85" : "border border-ink/20 hover:border-ink/50"
                    }`}
                  >
                    Start free trial
                  </a>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Enterprise */}
        <div data-plan>
          <div className="mt-5 flex flex-col gap-6 rounded-[1.5rem] border border-ink/10 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display text-3xl">Enterprise</h3>
              <p className="mt-2 max-w-[60ch] text-[15px] text-ink-soft">
                From {inr(3999)} a month for 200 users and 200 numbers, with unlimited messages and campaigns, a custom SLA and white-label options.
              </p>
            </div>
            <Link href="/contact" className={`inline-flex shrink-0 justify-center rounded-full border border-ink/20 px-6 py-3.5 text-sm font-semibold transition-colors hover:border-ink/50 active:scale-[0.98] ${focusInk}`}>
              Talk to sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
