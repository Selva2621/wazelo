"use client";

import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_MOTION } from "@/lib/gsap";
import SiteFooter from "@/components/Footer";
import SiteNavbar from "@/components/Navbar";

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const fieldCls =
  "w-full rounded-xl border border-ink/15 bg-card/70 px-4 py-3.5 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-[border-color,box-shadow] focus:border-rust focus:ring-2 focus:ring-rust/25";
const labelCls = "mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-ink-soft";

// ─── Contact form with controlled state ───────────────────────────────────────
function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "general", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const subjects = [
    { value: "general", label: "General enquiry" },
    { value: "sales", label: "Sales & pricing" },
    { value: "support", label: "Technical support" },
    { value: "security", label: "Security / compliance" },
    { value: "partnership", label: "Partnership" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    // Mailto fallback — open email client with pre-filled body
    const body = encodeURIComponent(
      `Name: ${form.name}\nCompany: ${form.company}\nSubject: ${form.subject}\n\n${form.message}`
    );
    window.location.href = `mailto:hello@wazelo.in?subject=${encodeURIComponent(form.subject + " — " + form.name)}&body=${body}`;
    setStatus("sent");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className={labelCls}>Your name *</label>
          <input id="c-name" required className={fieldCls} placeholder="Ravi Kumar" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="c-email" className={labelCls}>Work email *</label>
          <input id="c-email" required type="email" className={fieldCls} placeholder="ravi@company.in" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
      </div>
      <div>
        <label htmlFor="c-company" className={labelCls}>Company name</label>
        <input id="c-company" className={fieldCls} placeholder="Acme Pvt Ltd" value={form.company}
          onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
      </div>
      <div>
        <label htmlFor="c-subject" className={labelCls}>Subject</label>
        <select id="c-subject" className={`${fieldCls} cursor-pointer`} value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
          {subjects.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="c-message" className={labelCls}>Message *</label>
        <textarea id="c-message" required rows={5} className={`${fieldCls} resize-y`} placeholder="Tell us how we can help..."
          value={form.message}
          onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className={`group inline-flex items-center gap-2 self-start rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-ink/85 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 ${focusInk}`}
      >
        {status === "sending" ? "Opening email..." : status === "sent" ? "Message ready ✓" : "Send message"}
        {status === "idle" && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
      </button>
      {status === "sent" && (
        <p role="status" className="text-sm leading-relaxed text-ink-soft">
          Your email client should have opened. If not, email us directly at{" "}
          <a href="mailto:hello@wazelo.in" className="text-rust underline underline-offset-4">hello@wazelo.in</a>
        </p>
      )}
    </form>
  );
}

export default function ContactPage() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.1 } })
          .from("[data-ct=kicker]", { y: 12, autoAlpha: 0, duration: 0.7 })
          .from("[data-ct=title]", { y: 50, autoAlpha: 0 }, 0.1)
          .from("[data-ct=sub]", { y: 24, autoAlpha: 0 }, 0.3)
          .from("[data-ct=channel]", { y: 30, autoAlpha: 0, stagger: 0.08 }, 0.4);
        gsap.from("[data-ct=col]", {
          y: 50, autoAlpha: 0, stagger: 0.12, duration: 1, ease: "expo.out",
          scrollTrigger: { trigger: "[data-ct=form]", start: "top 80%", once: true },
        });
      });
    },
    { scope: root },
  );

  const channels = [
    { title: "Email us", value: "hello@wazelo.in", href: "mailto:hello@wazelo.in", desc: "General enquiries & sales" },
    { title: "Support", value: "support@wazelo.in", href: "mailto:support@wazelo.in", desc: "Technical help & account issues" },
    { title: "Partnerships", value: "partners@wazelo.in", href: "mailto:partners@wazelo.in", desc: "Integrations & reseller enquiries" },
  ];

  const responseTimes = [
    { type: "Sales enquiries", time: "< 4 hours" },
    { type: "Technical support", time: "< 8 hours" },
    { type: "Security / compliance", time: "< 24 hours" },
    { type: "Partnerships", time: "2–3 business days" },
  ];

  return (
    <div ref={root} className="min-h-dvh bg-paper font-sans text-ink">
      <SiteNavbar />

      {/* ── Hero + channels ──────────────────────────────────────────────── */}
      <section className="px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-28 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <p data-ct="kicker" className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Get in touch</p>
          <h1 data-ct="title" className="mt-6 max-w-4xl font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">
            Talk to <em className="text-rust">a person.</em>
          </h1>
          <p data-ct="sub" className="mt-8 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            Sales, support, security or partnerships. Write to us and we&apos;ll reply within one business day.
          </p>

          <div className="mt-16 grid gap-x-10 sm:grid-cols-3 lg:mt-20">
            {channels.map((c, i) => (
              <a
                key={c.title}
                data-ct="channel"
                href={c.href}
                className={`group block border-t border-ink/15 py-7 transition-colors hover:border-rust ${focusInk}`}
              >
                <div className="flex items-center justify-between">
                  <span className="shrink-0 font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                  <ArrowUpRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-rust" />
                </div>
                <h2 className="mt-5 font-display text-3xl leading-tight">{c.title}</h2>
                <p className="mt-2 text-[15px] text-rust">{c.value}</p>
                <p className="mt-1 text-sm text-ink-soft">{c.desc}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form + info ──────────────────────────────────────────────────── */}
      <section className="border-t border-ink/10 bg-paper-deep/60 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div data-ct="form" className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-12 lg:gap-12">
          <div data-ct="col" className="lg:col-span-7">
            <h2 className="mb-10 font-display text-4xl leading-none tracking-[-0.01em] md:text-5xl">Send us a message</h2>
            <ContactForm />
          </div>

          <aside data-ct="col" className="lg:col-span-4 lg:col-start-9 lg:pt-2">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Typical response times</p>
            <dl className="mt-6">
              {responseTimes.map(r => (
                <div key={r.type} className="flex items-baseline justify-between gap-4 border-t border-ink/15 py-4">
                  <dt className="text-[15px] text-ink-soft">{r.type}</dt>
                  <dd className="font-mono text-sm">{r.time}</dd>
                </div>
              ))}
            </dl>

            <div className="tone-fixed mt-12 rounded-[1.25rem] bg-ink p-8 text-paper">
              <h3 className="font-display text-3xl leading-tight">Rather try it yourself?</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-paper/70">
                Start a free trial and look around Wazelo in a few minutes.
              </p>
              <a
                href={APP_REGISTER_URL}
                className="group mt-7 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
              >
                Start free trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter showCta={false} />
    </div>
  );
}
