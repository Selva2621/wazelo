"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Plus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_MOTION } from "@/lib/gsap";
import { ENTERPRISE, TRIAL, money, num, plansFor, priceOf, type Audience, type Currency, type Plan } from "@/components/pricing/plans";
import { PRICING_FAQ } from "@/components/pricing/pricing-faq";
import { useCurrency } from "@/components/pricing/use-currency";
import { CurrencySwitch } from "@/components/pricing/currency-switch";

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const INCLUDED: Record<Audience, string[]> = {
  freelancer: ["Lead finder", "Client pipeline and proposals", "Follow-up sequences", "Automation", "AI assistant", "Mobile app"],
  team: [
    "Shared inbox and assignments",
    "Automation and sequences",
    "Meta lead ads",
    "Chatbot and website chat",
    "CSAT surveys",
    "Admin, Manager and Employee roles",
    "Audit logs",
    "Mobile app",
  ],
};

// ── Small controls ─────────────────────────────────────────────────────────────

function Segmented<T extends string | boolean>({
  label,
  options,
  value,
  onChange,
  id,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex w-max gap-1 rounded-full border border-ink/15 bg-card/60 p-1 text-sm">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-full px-4 py-2 font-medium transition-colors ${focusInk} ${value === o.value ? "text-paper" : "text-ink-soft hover:text-ink"}`}
        >
          {value === o.value && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 38 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

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

// ── Plan card ──────────────────────────────────────────────────────────────────

function PlanCard({ plan, yearly, currency }: { plan: Plan; yearly: boolean; currency: Currency | null }) {
  const c = currency ?? "USD";
  return (
    <article data-plan className={`relative flex flex-col rounded-[1.5rem] border p-8 lg:p-9 ${plan.popular ? "border-ink bg-card" : "border-ink/10 bg-card/60"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-3xl">{plan.name}</h3>
        {plan.popular && <span className="rounded-full bg-rust/10 px-2.5 py-0.5 text-xs font-semibold text-rust">Most chosen</span>}
      </div>
      <p className="mt-2 text-sm text-ink-soft">{plan.tagline}</p>
      <div className="mt-8">
        <Price plan={plan} yearly={yearly} currency={currency} />
      </div>
      <p className="mt-4 text-sm text-ink-soft">
        {plan.users} {plan.users === 1 ? "user" : "users"}, {plan.numbers} WhatsApp {plan.numbers === 1 ? "number" : "numbers"}, {num(plan.messages, c)} messages a month
      </p>
      <ul className="mb-10 mt-8 flex flex-col gap-3 text-[15px]">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-rust" />
            <span className="text-ink-soft">{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={APP_REGISTER_URL}
        className={`group mt-auto inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-colors active:scale-[0.98] ${focusInk} ${
          plan.popular ? "bg-ink text-paper hover:bg-ink/85" : "border border-ink/20 hover:border-ink/50"
        }`}
      >
        Start free trial
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </a>
    </article>
  );
}

// ── Comparison table ───────────────────────────────────────────────────────────

type Row = { name: string; cell: (p: Plan | null) => string };

function CompareTable({ audience, yearly, currency }: { audience: Audience; yearly: boolean; currency: Currency | null }) {
  const c = currency ?? "USD";
  const plans = plansFor(audience);
  const team = audience === "team";
  // Enterprise is the last team column; null stands for it in the cell getters.
  const cols: (Plan | null)[] = team ? [...plans, null] : plans;
  const unlimited = "Unlimited";
  const n = (v: number) => num(v, c);

  const rows: Row[] = [
    {
      name: yearly ? "Price a year" : "Price a month",
      cell: (p) => (currency ? (p ? money(priceOf(p.price, c, yearly), c) : `From ${money(priceOf(ENTERPRISE.price, c, yearly), c)}`) : ""),
    },
    { name: "Users", cell: (p) => n(p ? p.users : ENTERPRISE.users) },
    { name: "WhatsApp numbers", cell: (p) => n(p ? p.numbers : ENTERPRISE.numbers) },
    { name: "Messages a month", cell: (p) => (p ? n(p.messages) : unlimited) },
    { name: "Campaigns a month", cell: (p) => (p ? n(p.campaigns) : unlimited) },
    { name: "AI credits a month", cell: (p) => n(p ? p.aiCredits : ENTERPRISE.aiCredits) },
    { name: "Message templates", cell: (p) => (p ? n(p.templates) : unlimited) },
    { name: "API calls a month", cell: (p) => (p ? n(p.apiCalls) : unlimited) },
    { name: "Shopify stores", cell: (p) => (p ? (p.shopifyStores ? n(p.shopifyStores) : "None") : "1") },
    ...(team ? [{ name: "Support", cell: (p: Plan | null) => (p ? p.support ?? "" : "Custom SLA") }] : []),
  ];

  return (
    <div className="overflow-x-auto rounded-[1.5rem] border border-ink/10 bg-card/60">
      <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
        <caption className="sr-only">{team ? "Team plans" : "Freelancer plans"} compared</caption>
        <thead>
          <tr className="border-b border-ink/10">
            <th scope="col" className="p-5 font-medium text-ink-faint lg:p-6">
              <span className="sr-only">Limit</span>
            </th>
            {cols.map((p) => (
              <th key={p?.slug ?? "enterprise"} scope="col" className={`p-5 font-display text-2xl font-normal lg:p-6 ${p?.popular ? "text-rust" : ""}`}>
                {p ? p.name : "Enterprise"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-ink/10 last:border-0">
              <th scope="row" className="p-5 font-medium lg:p-6">
                {r.name}
              </th>
              {cols.map((p) => (
                <td key={p?.slug ?? "enterprise"} className="p-5 tabular-nums text-ink-soft lg:p-6">
                  {r.cell(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── FAQ ────────────────────────────────────────────────────────────────────────

function PricingFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="flex flex-col border-t border-ink/15">
      {PRICING_FAQ.map((item, i) => {
        const isOpen = open === i;
        const id = `pricing-faq-${i}`;
        return (
          <li key={item.q} className="border-b border-ink/15">
            <h3>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? null : i)}
                className={`group flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium transition-colors hover:text-rust ${focusInk}`}
              >
                {item.q}
                <span className={`grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-300 ${isOpen ? "rotate-45 border-ink bg-ink text-paper" : "border-ink/20"}`}>
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>
            {/* Always in the DOM so answers are crawlable and match the FAQPage schema. */}
            <motion.div
              id={id}
              role="region"
              aria-hidden={!isOpen}
              inert={!isOpen}
              initial={false}
              animate={isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden"
            >
              <p className="max-w-[62ch] pb-7 text-[15px] leading-relaxed text-ink-soft">{item.a}</p>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PricingClient() {
  const [audience, setAudience] = useState<Audience>("team");
  const [yearly, setYearly] = useState(false);
  const currency = useCurrency();
  const c = currency ?? "USD";
  const root = useRef<HTMLDivElement>(null);
  const plans = plansFor(audience);
  const trial = TRIAL[audience];

  useGSAP(
    () => {
      gsap.matchMedia().add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.1 } })
          .from("[data-pp=head] > *", { y: 40, autoAlpha: 0, stagger: 0.1 })
          .from("[data-plan]", { y: 70, autoAlpha: 0, stagger: 0.1 }, 0.3);
        gsap.from("[data-pp=rise] > *", {
          y: 40,
          autoAlpha: 0,
          stagger: 0.1,
          duration: 1,
          ease: "expo.out",
          scrollTrigger: { trigger: "[data-pp=rise]", start: "top 80%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      <Navbar activePage="Pricing" />

      <main>
        {/* ── Plans ─────────────────────────────────────────────────────── */}
        <section className="px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pb-28 lg:pt-40">
          <div className="mx-auto max-w-7xl">
            <div data-pp="head" className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Pricing</p>
                <h1 className="mt-5 font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">
                  Simple pricing. <em className="text-rust">Start free.</em>
                </h1>
                <p className="mt-6 text-lg text-ink-soft">Every plan starts with a 14-day free trial. No card needed.</p>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Segmented
                  id="audience"
                  label="Who is it for"
                  value={audience}
                  onChange={setAudience}
                  options={[
                    { label: "Freelancer", value: "freelancer" },
                    { label: "Team", value: "team" },
                  ]}
                />
                <Segmented
                  id="billing"
                  label="Billing period"
                  value={yearly}
                  onChange={setYearly}
                  options={[
                    { label: "Monthly", value: false },
                    { label: "Yearly, 2 months free", value: true },
                  ]}
                />
                <CurrencySwitch currency={currency} />
              </div>
            </div>

            <div key={audience} className={`mt-14 grid gap-5 ${audience === "team" ? "lg:grid-cols-3" : "mx-auto max-w-4xl md:grid-cols-2"}`}>
              {plans.map((p) => (
                <PlanCard key={p.slug} plan={p} yearly={yearly} currency={currency} />
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-ink-soft">
              The free trial includes {trial.users} {trial.users === 1 ? "user" : "users"}
              {audience === "team" ? `, ${trial.numbers} WhatsApp numbers` : ""} and {num(trial.messages, c)} messages.
            </p>

            {audience === "team" ? (
              <div data-plan className="mt-10 flex flex-col gap-6 rounded-[1.5rem] border border-ink/10 p-8 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-display text-3xl">Enterprise</h2>
                  <p className="mt-2 max-w-[60ch] text-[15px] text-ink-soft">
                    <span className={currency ? "" : "invisible"}>From {money(ENTERPRISE.price[c], c)} a month</span> for {ENTERPRISE.users} users and {ENTERPRISE.numbers} numbers, with unlimited messages and
                    campaigns, a custom SLA and white-label options.
                  </p>
                </div>
                <Link href="/contact" className={`inline-flex shrink-0 justify-center rounded-full border border-ink/20 px-6 py-3.5 text-sm font-semibold transition-colors hover:border-ink/50 active:scale-[0.98] ${focusInk}`}>
                  Talk to sales
                </Link>
              </div>
            ) : (
              <p className="mt-10 text-center text-[15px] text-ink-soft">
                Hiring help?{" "}
                <button type="button" onClick={() => setAudience("team")} className={`rounded font-semibold text-rust underline-offset-4 hover:underline ${focusInk}`}>
                  See team plans
                </button>
              </p>
            )}
          </div>
        </section>

        {/* ── Compare ───────────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
          <div data-pp="rise" className="mx-auto max-w-7xl">
            <h2 className="font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-6xl">
              Compare <em className="text-rust">every limit.</em>
            </h2>
            <p className="mt-5 text-base text-ink-soft">
              {audience === "team" ? "Team plans" : "Freelancer plans"}, {yearly ? "billed yearly" : "billed monthly"}.
            </p>
            <div className="mt-12">
              <CompareTable audience={audience} yearly={yearly} currency={currency} />
            </div>
            <div className="mt-12">
              <h3 className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">In every {audience === "team" ? "team" : "freelancer"} plan</h3>
              <ul className="mt-6 grid gap-x-8 gap-y-3 text-[15px] sm:grid-cols-2 lg:grid-cols-4">
                {INCLUDED[audience].map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-rust" />
                    <span className="text-ink-soft">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-6xl">
                Pricing <em className="text-rust">questions.</em>
              </h2>
              <p className="mt-5 text-base text-ink-soft">
                Something else?{" "}
                <Link href="/contact" className="font-semibold text-rust underline-offset-4 hover:underline">
                  Talk to sales
                </Link>
                .
              </p>
              <p className="mt-3 text-base text-ink-soft">
                Comparing tools?{" "}
                <Link href="/compare" className="font-semibold text-rust underline-offset-4 hover:underline">
                  See Wazelo vs Wati, Interakt and AiSensy
                </Link>
                .
              </p>
            </div>
            <div className="lg:col-span-8">
              <PricingFaq />
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className="border-t border-ink/10 px-4 py-28 sm:px-6 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="font-display text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
              See it with <em className="text-rust">your own leads.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-[40ch] text-lg text-ink-soft">Free for 14 days. No credit card.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href={APP_REGISTER_URL} className={`group inline-flex items-center gap-2 rounded-full bg-ink px-8 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] ${focusInk}`}>
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link href="/contact" className={`inline-flex items-center rounded-full border border-ink/20 px-8 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}>
                Talk to sales
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer showCta={false} />
    </div>
  );
}
