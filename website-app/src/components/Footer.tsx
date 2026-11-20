import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// Same value as APP_REGISTER_URL in lib/wazelo. That module is "use client", so a server
// component (e.g. not-found) importing a constant from it would get a client reference.
const APP_REGISTER_URL = "https://app.wazelo.in/auth/register";

const cols = [
  {
    title: "Product",
    links: [
      ["How it works", "/#story"],
      ["Shared inbox", "/features/shared-inbox"],
      ["Campaigns", "/features/campaigns"],
      ["Automation", "/features/automation"],
      ["Chatbot builder", "/features/chatbot"],
      ["Sequences", "/features/sequences"],
      ["Lead ads", "/features/lead-ads"],
      ["Lead finder", "/features/lead-finder"],
      ["AI assistant", "/features/ai-assistant"],
      ["Website chat", "/features/website-chat"],
      ["Proposals", "/features/proposals"],
      ["Mobile app", "/features/mobile-app"],
      ["Pricing", "/#pricing"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Documentation", "/docs"],
      ["API reference", "/api-reference"],
      ["API and MCP server", "/features/developer-api"],
      ["Use cases", "/use-cases"],
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

export default function Footer() {
  return (
    // The paper/10 top rule separates it from an ink section above; on paper the colour change does the work.
    <footer className="border-t border-paper/10 bg-ink px-4 pb-10 pt-20 font-sans text-paper sm:px-6 lg:px-8 lg:pt-28">
      <div className="mx-auto max-w-7xl">
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

        <div className="grid gap-12 pt-14 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className={`flex w-max items-center gap-2.5 rounded-md ${focusPaper}`}>
              <Image src="/logo/logo.png" alt="" width={32} height={32} className="size-8 object-contain" />
              <span className="text-lg font-semibold tracking-tight">Wazelo</span>
            </Link>
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-paper/60">
              The lead follow-up platform. Catch every lead, reply fast, follow up until they buy.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-1 lg:col-span-7">
            {cols.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-medium uppercase tracking-[0.22em] text-paper/40">{col.title}</h4>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className={`rounded-sm text-sm text-paper/70 transition-colors hover:text-paper ${focusPaper}`}>
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
      </div>
    </footer>
  );
}
