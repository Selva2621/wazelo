"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Reveal } from "@/components/home/reveal";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_MOTION } from "@/lib/gsap";

// Prices and limits from backend/prisma/seed-plans.js (INR). Yearly = 10x monthly.
// Each WhatsApp number is one QR-linked session. Automation is Growth and up.
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
  features: ["Lead Scraper and lead pipeline", "20 message templates", "Drip sequences", "5 campaigns a month"],
};

const TEAM_PLANS: (Plan & { popular?: boolean })[] = [
  {
    name: "Starter",
    monthly: 499,
    yearly: 4990,
    limits: "5 users, 5 WhatsApp numbers, 5,000 messages a month",
    features: ["Shared inbox", "10 campaigns a month", "10 message templates", "50 AI credits", "1 Shopify store", "1,000 API calls"],
  },
  {
    name: "Growth",
    monthly: 999,
    yearly: 9990,
    limits: "15 users, 15 WhatsApp numbers, 25,000 messages a month",
    features: ["Everything in Starter", "Automation rules", "50 campaigns a month", "50 message templates", "200 AI credits", "3 Shopify stores", "10,000 API calls"],
    popular: true,
  },
  {
    name: "Pro",
    monthly: 1999,
    yearly: 19990,
    limits: "50 users, 50 WhatsApp numbers, 1,00,000 messages a month",
    features: ["Everything in Growth", "200 campaigns a month", "200 message templates", "500 AI credits", "5 Shopify stores", "Full API access"],
  },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

function Price({ plan, yearly }: { plan: Plan; yearly: boolean }) {
  const value = yearly ? plan.yearly : plan.monthly;
  return (
    <p className="flex items-baseline gap-1">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="text-4xl font-semibold tracking-tight tabular-nums"
        >
          {inr(value)}
        </motion.span>
      </AnimatePresence>
      <span className="text-sm opacity-75">/{yearly ? "year" : "month"}</span>
    </p>
  );
}

function Features({ items }: { items: string[] }) {
  return (
    <ul className="mb-8 mt-6 flex flex-col gap-2.5 text-sm">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2.5">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary-container" />
          <span className="text-on-surface-variant">{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function Pricing() {
  const [yearly, setYearly] = useState(false);
  const section = useRef<HTMLElement>(null);

  // Plans rise in one after another as the grid scrolls into view.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap.from("[data-plan]", {
          y: 70,
          autoAlpha: 0,
          stagger: 0.15,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-plan]", start: "top 85%", once: true },
        });
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} id="pricing" className="ember-rule scroll-mt-16 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-container">Pricing</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface md:text-5xl">
              Pay for the way you work.
            </h2>
            <p className="mt-4 text-base text-on-surface-variant">Every plan starts with a 14-day free trial. No card needed.</p>
          </div>
          <div role="group" aria-label="Billing period" className="flex w-max gap-1 rounded-full border border-outline-variant bg-surface-container-lowest p-1 text-sm">
            {[
              { label: "Monthly", value: false },
              { label: "Yearly, 2 months free", value: true },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={yearly === o.value}
                onClick={() => setYearly(o.value)}
                className={`relative rounded-full px-4 py-2 font-medium transition-colors ${focusRing} ${
                  yearly === o.value ? "text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {yearly === o.value && (
                  <motion.span layoutId="billing-pill" className="absolute inset-0 rounded-full bg-primary-container" transition={{ type: "spring", stiffness: 420, damping: 38 }} />
                )}
                <span className="relative">{o.label}</span>
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:grid-cols-12">
          {/* Solo: freelancers */}
          <div data-plan className="lg:col-span-4">
            <article className="flex h-full flex-col rounded-2xl border border-primary/50 bg-surface-container-lowest bg-[radial-gradient(40rem_18rem_at_0%_0%,rgb(var(--fx-accent)/0.2),transparent_65%)] p-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-on-surface">{SOLO.name}</h3>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary-container">For freelancers</span>
              </div>
              <div className="mt-6 text-on-surface">
                <Price plan={SOLO} yearly={yearly} />
              </div>
              <p className="mt-3 text-sm text-on-surface-variant">{SOLO.limits}</p>
              <Features items={SOLO.features} />
              <a
                href={APP_REGISTER_URL}
                className={`mt-auto inline-flex justify-center rounded-full bg-primary-container px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary active:scale-[0.98] ${focusRing}`}
              >
                Start free trial
              </a>
            </article>
          </div>

          {/* Team plans, one container */}
          <div data-plan className="lg:col-span-8">
            <div className="grid h-full divide-y divide-outline-variant rounded-2xl border border-outline-variant bg-surface-container-lowest md:grid-cols-3 md:divide-x md:divide-y-0">
              {TEAM_PLANS.map((p) => (
                <article key={p.name} className="flex flex-col p-8">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-on-surface">{p.name}</h3>
                    {p.popular && <span className="rounded-full border border-outline-variant px-2.5 py-0.5 text-xs text-on-surface-variant">Most chosen</span>}
                  </div>
                  <div className="mt-6 text-on-surface">
                    <Price plan={p} yearly={yearly} />
                  </div>
                  <p className="mt-3 text-sm text-on-surface-variant">{p.limits}</p>
                  <Features items={p.features} />
                  <a
                    href={APP_REGISTER_URL}
                    className={`mt-auto inline-flex justify-center rounded-full px-6 py-3 text-sm font-semibold transition-colors active:scale-[0.98] ${focusRing} ${
                      p.popular ? "bg-on-surface text-surface hover:bg-on-surface/85" : "border border-outline-variant text-on-surface hover:border-outline"
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
          <div className="mt-4 flex flex-col gap-6 rounded-2xl border border-outline-variant p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-on-surface">Enterprise</h3>
              <p className="mt-2 max-w-[60ch] text-sm text-on-surface-variant">
                From {inr(3999)} a month for 200 users and 200 WhatsApp numbers, with unlimited messages, campaigns, templates and Shopify stores, full API access and custom AI credits.
              </p>
            </div>
            <Link
              href="/contact"
              className={`inline-flex shrink-0 justify-center rounded-full border border-outline-variant px-6 py-3 text-sm font-semibold text-on-surface transition-colors hover:border-outline active:scale-[0.98] ${focusRing}`}
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
