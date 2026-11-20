import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteNavbar from "@/components/Navbar";
import SiteFooter from "@/components/Footer";

export const metadata: Metadata = {
  title: "Page Not Found",
  description: "The page you are looking for does not exist. Explore Wazelo, the lead follow-up platform.",
  robots: { index: false, follow: true },
};

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const LINKS = [
  { label: "Shared inbox", href: "/features/shared-inbox" },
  { label: "Lead ads", href: "/features/lead-ads" },
  { label: "Sequences", href: "/features/sequences" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Contact", href: "/contact" },
];

// The root layout supplies <html>/<body>; this renders inside it.
export default function NotFound() {
  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <SiteNavbar />

      <main className="px-4 pb-28 pt-36 sm:px-6 lg:px-8 lg:pb-40 lg:pt-48">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-xs text-ink-faint">Error 404</p>
          <h1 className="mt-6 font-display text-[clamp(5.5rem,18vw,15rem)] leading-[0.85] tracking-[-0.03em]">
            Lost<em className="text-rust">?</em>
          </h1>
          <div className="mt-12 grid gap-10 border-t border-ink/15 pt-10 lg:grid-cols-12">
            <p className="max-w-[40ch] text-lg leading-relaxed text-ink-soft lg:col-span-5">
              This page doesn&apos;t exist, or it moved. Start again from home, or look at what Wazelo does.
            </p>
            <div className="lg:col-span-6 lg:col-start-7">
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/"
                  className={`group inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 text-sm font-semibold text-paper transition-colors hover:bg-black active:scale-[0.98] ${focusInk}`}
                >
                  Back to home
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/#features"
                  className={`inline-flex items-center rounded-full border border-ink/20 px-7 py-4 text-sm font-semibold transition-colors hover:border-ink/50 ${focusInk}`}
                >
                  See all features
                </Link>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {LINKS.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={`rounded-sm text-ink-soft underline decoration-ink/20 underline-offset-4 transition-colors hover:text-rust hover:decoration-rust ${focusInk}`}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
