import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FooterWordmark from "@/components/FooterWordmark";
import { USE_CASES } from "@/components/use-cases/use-cases";
import { COMPETITORS } from "@/components/compare/competitors";

// Same value as APP_REGISTER_URL in lib/wazelo. That module is "use client", so a server
// component (e.g. not-found) importing a constant from it would get a client reference.
const APP_REGISTER_URL = "https://app.wazelo.in/auth/register";

// Use-case and comparison links come from their data files, so a new page shows up here too.
const cols: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["All features", "/features"],
      ["Lead ads", "/features/lead-ads"],
      ["Website chat", "/features/website-chat"],
      ["AI assistant", "/features/ai-assistant"],
      ["Shared inbox", "/features/shared-inbox"],
      ["Sequences", "/features/sequences"],
      ["Campaigns", "/features/campaigns"],
      ["Proposals", "/features/proposals"],
      ["Mobile app", "/features/mobile-app"],
      ["Pricing", "/pricing"],
    ],
  },
  {
    title: "Use cases",
    links: [...USE_CASES.map((u): [string, string] => [u.name, `/use-cases/${u.slug}`]), ["All use cases", "/use-cases"]],
  },
  {
    title: "Compare & resources",
    links: [
      ...COMPETITORS.map((c): [string, string] => [`Wazelo vs ${c.name}`, `/compare/${c.slug}`]),
      ["Blog", "/blog"],
      ["Documentation", "/docs"],
      ["API and MCP server", "/features/developer-api"],
      ["API reference", "/api-reference"],
      ["Security", "/security"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Privacy policy", "/privacy"],
      ["Terms of service", "/terms"],
    ],
  },
];

const focusPaper = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper";

export default function Footer({ showCta = true }: { showCta?: boolean }) {
  return (
    // The paper/10 top rule separates it from an ink section above; on paper the colour change does the work.
    <footer className="tone-fixed border-t border-paper/10 bg-ink px-4 pt-20 font-sans text-paper sm:px-6 lg:px-8 lg:pt-28">
      <div className="mx-auto max-w-7xl">
        {showCta && (
        <div className="flex flex-col gap-10 border-b border-paper/10 pb-16 lg:flex-row lg:items-end lg:justify-between lg:pb-20">
          <p className="max-w-3xl font-display text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
            Every lead, <em className="text-[#f0b483]">followed up.</em>
          </p>
          <a
            href={APP_REGISTER_URL}
            className={`group inline-flex w-max shrink-0 items-center gap-2 rounded-full bg-paper px-7 py-4 text-sm font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] ${focusPaper}`}
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
        )}

        <div className={`grid gap-12 lg:grid-cols-12 ${showCta ? "pt-14" : ""}`}>
          <div className="lg:col-span-4">
            <Link href="/" className={`flex w-max items-center gap-2.5 rounded-md ${focusPaper}`}>
              <Image src="/logo/wazelo-mark.svg" alt="" width={32} height={32} className="size-8" />
              <span className="text-lg font-semibold tracking-tight">Wazelo</span>
            </Link>
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-paper/60">
              The lead follow-up platform. Catch every lead, reply fast, follow up until they buy.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:col-span-8">
            {cols.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-medium uppercase tracking-[0.22em] text-paper/40">{col.title}</h4>
                <ul className="mt-3 flex flex-col lg:mt-5 lg:gap-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className={`block rounded-sm py-2.5 text-sm text-paper/70 transition-colors hover:text-paper lg:inline lg:py-0 ${focusPaper}`}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-3 border-t border-paper/10 pt-6 font-mono text-xs text-paper/45 sm:flex-row">
          <p>© {new Date().getFullYear()} Wazelo. All rights reserved.</p>
          <p>Made in India.</p>
        </div>

        <FooterWordmark />
      </div>
    </footer>
  );
}
