"use client";

import { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CheckCheck, FileText, Repeat, ScanSearch, UserPlus } from "lucide-react";
import { ThemeCycleButton } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

// Client-only animated phone (motion + viewer clock); a same-size frame holds its place while it loads.
const PhoneChatShowcase = dynamic(
  () => import("@/components/auth/phone-chat-showcase").then((m) => m.PhoneChatShowcase),
  { ssr: false, loading: () => <div className="h-[31.625rem] w-[16.625rem] rounded-[2.6rem] bg-surface-container-high/40" /> },
);

/** SSR-safe media query (false on the server, live on the client). */
function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const CAPABILITIES = [
  { icon: ScanSearch, title: "Lead finder" },
  { icon: FileText, title: "Proposals" },
  { icon: Repeat, title: "Follow-ups" },
];

// Legal and help pages live on the marketing site.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wazelo.in";
const FOOTER_LINKS = [
  { label: "Terms", path: "/terms" },
  { label: "Privacy", path: "/privacy" },
  { label: "Help", path: "/contact" },
];

function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex w-max items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      <img src="/logo/logo.png" alt="" className="size-9 object-contain" />
      <span className="text-title font-semibold tracking-tight">
        Waze<span className="text-primary-container">lo</span>
      </span>
    </Link>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // The phone needs room in both directions; skip downloading and animating it otherwise.
  const showPhone = useMediaQuery("(min-width: 1280px) and (min-height: 720px)");

  return (
    <div className="min-h-dvh bg-surface text-on-surface lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* Brand panel: desktop only, the form leads on small screens */}
      <aside className="hidden p-3 lg:block">
        <div className="sticky top-3 flex h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[1.75rem] px-10 py-8 xl:px-12">
          <div aria-hidden className="auth-backdrop" />

          <Logo className="relative z-10" />

          <div className="relative z-10 flex min-h-0 flex-1 items-center gap-12">
            <div className="min-w-0 flex-1">
              <h2 className="text-hero font-semibold text-on-surface">
                Win clients <span className="block text-primary-container">on WhatsApp.</span>
              </h2>
              <p className="mt-4 max-w-[34ch] text-body-lg text-on-surface-variant">
                Find leads, send proposals and follow up automatically, all from one inbox.
              </p>
              <ul className="mt-8 flex flex-wrap gap-2">
                {CAPABILITIES.map(({ icon: Icon, title }) => (
                  <li
                    key={title}
                    className="glass-pill flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 text-label font-medium text-on-surface"
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-primary/12 text-primary-container">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {title}
                  </li>
                ))}
              </ul>
            </div>

            {showPhone && (
              // Upright and fully visible; the chips sit over the status bar and composer, never the chat.
              <div className="relative mr-6 shrink-0">
                <div aria-hidden className="auth-glow" />
                <PhoneChatShowcase />
                {/* Proposal status, over the composer on the left */}
                <div className="glass-panel absolute -bottom-6 -left-36 flex w-max items-center gap-2.5 rounded-xl py-2 pl-2 pr-3.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary-container">
                    <CheckCheck className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-label font-semibold text-on-surface">Proposal viewed</p>
                    <p className="text-caption font-normal text-on-surface-variant">2 min ago</p>
                  </div>
                </div>
                {/* New lead, over the status bar on the right like a notification */}
                <div className="glass-panel absolute -right-14 -top-12 flex w-max items-center gap-2.5 rounded-xl py-2 pl-2 pr-3.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary-container">
                    <UserPlus className="h-4 w-4" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-label font-semibold text-on-surface">New lead found</p>
                    <p className="text-caption font-normal text-on-surface-variant">Bloom Bakery · Chennai</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Form side: plain surface, no card */}
      <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between gap-4">
          <Logo className="lg:hidden" />
          <ThemeCycleButton className="ml-auto" />
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>
        <footer className="flex flex-col items-center justify-between gap-2 border-t border-outline-variant pt-4 text-caption font-normal text-on-surface-variant sm:flex-row">
          <span>© {new Date().getFullYear()} Wazelo</span>
          <nav aria-label="Legal" className="flex items-center gap-4">
            {FOOTER_LINKS.map(({ label, path }) => (
              <a
                key={path}
                href={`${SITE_URL}${path}`}
                className="rounded outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
              >
                {label}
              </a>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
