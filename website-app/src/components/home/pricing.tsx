"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_MOTION } from "@/lib/gsap";

import { ENTERPRISE, money, num, planBySlug, plansFor, priceOf, type Currency, type Plan } from "@/components/pricing/plans";
import { useCurrency } from "@/components/pricing/use-currency";
import { CurrencySwitch } from "@/components/pricing/currency-switch";

// Prices and limits come from components/pricing/plans.ts (mirrors backend seed-plans).
const SOLO = planBySlug("solo");
const TEAM_PLANS = plansFor("team");
const limits = (p: Plan, c: Currency) =>
  `${p.users} ${p.users === 1 ? "user" : "users"}, ${p.numbers} WhatsApp ${p.numbers === 1 ? "number" : "numbers"}, ${num(p.messages, c)} messages a month`;
const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** Hidden (but holding its space) until the visitor's currency is known. */
function Price({ plan, yearly, currency }: { plan: Plan; yearly: boolean; currency: Currency | null }) {
  const c = currency ?? "USD";
  const value = priceOf(plan.price, c, yearly);
  return (
    <p className={`flex items-baseline gap-1.5 transition-opacity duration-300 ${currency ? "opacity-100" : "opacity-0"}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={`${c}-${value}`}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
          className="font-display text-6xl leading-none tabular-nums"
        >
          {money(value, c)}
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
  const currency = useCurrency();
  const c = currency ?? "USD";
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
              Simple pricing. <em className="text-rust">Start free.</em>
            </h2>
            <p className="mt-5 text-base text-ink-soft">Every plan starts with a 14-day free trial. No card needed.</p>
            <div className="mt-3">
              <CurrencySwitch currency={currency} />
            </div>
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
                <Price plan={SOLO} yearly={yearly} currency={currency} />
              </div>
              <p className="mt-4 text-sm text-paper/60">{limits(SOLO, c)}</p>
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
                    <Price plan={p} yearly={yearly} currency={currency} />
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">{limits(p, c)}</p>
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
                <span className={currency ? "" : "invisible"}>From {money(ENTERPRISE.price[c], c)} a month</span> for {ENTERPRISE.users} users and {ENTERPRISE.numbers} numbers, with unlimited messages and campaigns, and {num(ENTERPRISE.aiCredits, c)} AI credits a month.
              </p>
            </div>
            <Link href="/contact" className={`inline-flex shrink-0 justify-center rounded-full border border-ink/20 px-6 py-3.5 text-sm font-semibold transition-colors hover:border-ink/50 active:scale-[0.98] ${focusInk}`}>
              Talk to sales
            </Link>
          </div>
        </div>

        <p className="mt-10 text-center text-[15px] text-ink-soft">
          <Link href="/pricing" className={`group inline-flex items-center gap-1.5 rounded font-semibold text-rust underline-offset-4 hover:underline ${focusInk}`}>
            Compare every plan, including Solo Pro
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </p>
      </div>
    </section>
  );
}
