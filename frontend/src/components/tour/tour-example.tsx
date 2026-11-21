import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourExample as Example } from "@/lib/tours/types";

/** {{name}} variables shown as chips, the way the template editor shows them */
function WithVariables({ text }: { text: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\{\{[^}]+\}\}$/.test(p) ? (
          <span key={i} className="rounded bg-primary/15 px-1 font-mono text-caption text-primary">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** A worked example inside a tour step: what this feature looks like with sample data. */
export function TourExample({ example }: { example: Example }) {
  const box = "mt-3 rounded-xl border border-outline-variant bg-surface-container-low p-3 text-body";

  switch (example.kind) {
    case "chat":
      return (
        <figure className={cn(box, "space-y-1.5")} aria-label="Example conversation">
          {example.messages.map((m, i) => (
            <p
              key={i}
              className={cn(
                "w-fit max-w-[85%] rounded-2xl px-3 py-1.5 leading-snug",
                m.from === "customer"
                  ? "rounded-bl-md bg-surface-container-high text-on-surface"
                  : "ml-auto rounded-br-md bg-primary text-on-primary",
              )}
            >
              <span className="sr-only">{m.from === "customer" ? "Customer: " : m.from === "bot" ? "Bot: " : "You: "}</span>
              {m.from === "bot" && (
                <span aria-hidden className="mr-1 text-caption font-semibold opacity-80">
                  Bot ·
                </span>
              )}
              {m.text}
            </p>
          ))}
        </figure>
      );

    case "template":
      return (
        <figure className={cn(box, "space-y-2")} aria-label="Example template">
          {example.name && <p className="font-mono text-caption text-on-surface-variant">{example.name}</p>}
          <p className="leading-snug text-on-surface">
            <WithVariables text={example.body} />
          </p>
          <div className="flex items-start gap-2 border-t border-outline-variant pt-2">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-surface-variant" aria-hidden />
            <p className="leading-snug text-on-surface-variant">
              <span className="sr-only">The customer sees: </span>
              {example.preview}
            </p>
          </div>
        </figure>
      );

    case "steps":
      return (
        <ol className={cn(box, "space-y-1.5")} aria-label="How to">
          {example.items.map((item, i) => (
            <li key={i} className="flex gap-2 leading-snug text-on-surface">
              <span
                aria-hidden
                className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-caption font-semibold text-primary"
              >
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );

    case "fields":
      return (
        <dl className={cn(box, "grid grid-cols-[auto_1fr] gap-x-3 gap-y-1")} aria-label="Example">
          {example.rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-on-surface-variant">{label}</dt>
              <dd className="min-w-0 break-words text-on-surface">{value}</dd>
            </div>
          ))}
        </dl>
      );

    case "flow":
      return (
        <ol className={cn(box, "flex flex-wrap items-center gap-1.5")} aria-label="Example flow">
          {example.nodes.map((node, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="rounded-lg border border-outline-variant bg-surface px-2 py-1 text-caption text-on-surface">
                {node}
              </span>
              {i < example.nodes.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden />
              )}
            </li>
          ))}
        </ol>
      );

    case "chips":
      return (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Example">
          {example.items.map((item) => (
            <li
              key={item}
              className="rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-1 text-caption text-on-surface"
            >
              {item}
            </li>
          ))}
        </ul>
      );

    case "tip":
      return (
        <p className={cn(box, "flex gap-2 leading-snug text-on-surface")}>
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <span>
            <span className="sr-only">Tip: </span>
            {example.text}
          </span>
        </p>
      );
  }
}
