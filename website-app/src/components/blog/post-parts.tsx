import Link from "next/link";

// Building blocks for blog post bodies, so every post shares one type scale and spacing.

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 pt-6 font-display text-3xl leading-tight tracking-[-0.01em] md:text-4xl">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-2 text-xl font-semibold leading-snug">{children}</h3>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[17px] leading-[1.75] text-ink-soft">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-6 text-[17px] leading-[1.7] text-ink-soft marker:text-rust">{children}</ul>;
}

export function OL({ children }: { children: React.ReactNode }) {
  return <ol className="flex list-decimal flex-col gap-2 pl-6 text-[17px] leading-[1.7] text-ink-soft marker:font-semibold marker:text-rust">{children}</ol>;
}

export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  const cls = "font-semibold text-rust underline underline-offset-4 decoration-rust/40 hover:decoration-rust";
  return external ? (
    <a href={href} target="_blank" rel="noopener" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Stands in for a real product screenshot (or other missing content) until one is added. */
export function ScreenshotPlaceholder({ caption, label = "Screenshot coming soon" }: { caption: string; label?: string }) {
  return (
    <figure className="flex flex-col items-center gap-2 rounded-[1.25rem] border-2 border-dashed border-ink/20 bg-paper-deep/50 px-6 py-12 text-center">
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-ink-faint">{label}</span>
      <figcaption className="max-w-[46ch] text-[15px] text-ink-soft">{caption}</figcaption>
    </figure>
  );
}

/** A WhatsApp message template people can copy. */
export function Template({ title, category, children }: { title: string; category: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-ink/10 bg-card/70 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] font-semibold">{title}</p>
        <span className="rounded-full bg-rust/10 px-2.5 py-0.5 text-xs font-semibold text-rust">{category}</span>
      </div>
      <p className="mt-4 whitespace-pre-line rounded-xl bg-[#e7f6e4] px-4 py-3 font-mono text-[14px] leading-relaxed text-[#1f2d1c]">{children}</p>
    </div>
  );
}

export type StepKind = "Free-form" | "Utility" | "Marketing" | "Call" | "Stop";

/** A day-by-day follow-up plan: when, what, and how it can be sent on WhatsApp. */
export function Schedule({ title, steps }: { title: string; steps: { when: string; what: string; kind: StepKind }[] }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-ink/10 bg-card/70">
      <p className="border-b border-ink/10 px-6 py-4 text-[15px] font-semibold">{title}</p>
      <ol>
        {steps.map((s, i) => (
          <li key={`${s.when}-${i}`} className="grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-1 border-b border-ink/10 px-6 py-4 last:border-0 sm:grid-cols-[6rem_1fr_auto] sm:items-baseline">
            <span className="font-mono text-sm tabular-nums text-rust">{s.when}</span>
            <span className="text-[15px] leading-relaxed text-ink-soft">{s.what}</span>
            <span className="col-start-2 w-max rounded-full bg-ink/[0.06] px-2.5 py-0.5 text-xs font-semibold text-ink-soft sm:col-start-3">{s.kind}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A short yes/no decision chart, read top to bottom. */
export function Flow({ steps }: { steps: { q: string; yes: string; no: string }[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <li key={s.q} className="rounded-[1.25rem] border border-ink/10 bg-card/70 p-5">
          <p className="flex gap-3 text-[16px] font-semibold">
            <span className="font-mono text-sm text-rust">{i + 1}</span>
            {s.q}
          </p>
          <div className="mt-3 grid gap-2 pl-7 text-[15px] sm:grid-cols-2">
            <p className="rounded-xl bg-[#e7f6e4] px-3 py-2 text-[#1f2d1c]">
              <strong>Yes:</strong> {s.yes}
            </p>
            <p className="rounded-xl bg-ink/[0.05] px-3 py-2 text-ink-soft">
              <strong className="text-ink">No:</strong> {s.no}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A list of terms and their definitions. */
export function Glossary({ items }: { items: { term: string; def: React.ReactNode }[] }) {
  return (
    <dl className="flex flex-col divide-y divide-ink/10 border-y border-ink/10">
      {items.map((it) => (
        <div key={it.term} className="grid gap-1 py-4 sm:grid-cols-[13rem_1fr] sm:gap-6">
          <dt className="text-[16px] font-semibold">{it.term}</dt>
          <dd className="text-[16px] leading-relaxed text-ink-soft">{it.def}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[1.25rem] border-l-4 border-rust bg-rust/[0.06] px-6 py-5 text-[16px] leading-relaxed">{children}</div>;
}
