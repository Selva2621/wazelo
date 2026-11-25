"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { APP_REGISTER_URL, APP_LOGIN_URL } from "@/lib/wazelo";
import { useLenis } from "@/app/lenis-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { FEATURE_GROUPS } from "@/components/features/feature-groups";

interface NavbarProps {
  activePage?: string;
}

// "Features" is rendered as a menu (see the Features menu below); the rest are plain links.
const FEATURES = "Features";
const navLinks: [string, string][] = [
  ["How it works", "/#story"],
  [FEATURES, "/features"],
  ["Pricing", "/pricing"],
  ["Use Cases", "/use-cases"],
  ["Docs", "/docs"],
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

export default function Navbar({ activePage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileFeatures, setMobileFeatures] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const megaButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const lenis = useLenis();
  const { scrollY } = useScroll();

  const [pastHero, setPastHero] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 20);
    setPastHero(y > window.innerHeight - 64);
  });
  // Paper pages get an ink-on-paper bar; the homepage keeps the light-on-dark bar
  // only while it sits over the dark hero film (and the Features menu is closed).
  const light = pathname !== "/" || pastHero || megaOpen;
  const solid = scrolled || menuOpen || megaOpen;

  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  // Escape closes the Features menu and returns focus to its button.
  useEffect(() => {
    if (!megaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMegaOpen(false);
        megaButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [megaOpen]);

  const openMega = () => {
    window.clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  // A short delay so moving the pointer from the button down into the panel doesn't close it.
  const closeMegaSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMegaOpen(false), 150);
  };

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const hashMatch = href.match(/^\/(#.+)$/);
    if (!hashMatch) return; // normal routes go through <Link>
    e.preventDefault();
    setMenuOpen(false);
    const hash = hashMatch[1];
    if (pathname === "/") {
      const target = document.querySelector(hash);
      if (target && lenis) lenis.scrollTo(target as HTMLElement, { offset: -72 });
      else target?.scrollIntoView();
    } else {
      router.push(href);
    }
  }

  const linkTone = (active: boolean) =>
    active ? (light ? "text-rust" : "text-primary-container") : light ? "text-ink-soft hover:text-ink" : "text-on-surface-variant hover:text-on-surface";

  return (
    <nav
      onMouseLeave={closeMegaSoon}
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${light ? "" : "tone-fixed"} ${
        !solid ? "border-transparent bg-transparent" : light ? "border-ink/10 bg-paper/95 backdrop-blur-xl" : "border-outline-variant bg-surface/85 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
          <Image src="/logo/wazelo-mark.svg" alt="" width={32} height={32} priority className="size-8" />
          <span className={`text-lg font-semibold tracking-tight ${light ? "text-ink" : "text-on-surface"}`}>
            Waze<span className={light ? "text-rust" : "text-primary-container"}>lo</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navLinks.map(([label, href]) =>
            label === FEATURES ? (
              <button
                key={label}
                ref={megaButton}
                type="button"
                aria-expanded={megaOpen}
                aria-controls="features-menu"
                onClick={() => (megaOpen ? setMegaOpen(false) : openMega())}
                onMouseEnter={openMega}
                className={`inline-flex items-center gap-1 rounded text-sm transition-colors ${focusRing} ${linkTone(label === activePage)}`}
              >
                {label}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`} />
              </button>
            ) : (
              <Link
                key={label}
                href={href}
                onClick={(e) => handleNavClick(e, href)}
                onMouseEnter={closeMegaSoon}
                aria-current={label === activePage ? "page" : undefined}
                className={`rounded text-sm transition-colors ${focusRing} ${linkTone(label === activePage)}`}
              >
                {label}
              </Link>
            ),
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle className={light ? "text-ink-soft hover:bg-ink/5 hover:text-ink" : "text-on-surface-variant hover:bg-card/10 hover:text-on-surface"} />
          <a href={APP_LOGIN_URL} className={`hidden rounded-full px-4 py-2 text-sm font-medium transition-colors sm:inline-flex ${focusRing} ${light ? "text-ink-soft hover:text-ink" : "text-on-surface-variant hover:text-on-surface"}`}>
            Sign in
          </a>
          <a
            href={APP_REGISTER_URL}
            className={`hidden rounded-full px-5 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98] sm:inline-flex ${focusRing} ${
              light ? "bg-ink text-paper hover:bg-ink/85" : "bg-paper text-ink hover:bg-white"
            }`}
          >
            Start free trial
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={`grid size-10 place-items-center rounded-full lg:hidden ${focusRing} ${light ? "text-ink" : "text-on-surface"}`}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Desktop Features menu ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {megaOpen && (
          <motion.div
            id="features-menu"
            onMouseEnter={openMega}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
            className="absolute inset-x-0 top-full hidden border-b border-ink/10 bg-paper text-ink shadow-[0_24px_48px_-24px_rgba(23,19,15,0.25)] lg:block"
          >
            <div className="mx-auto grid max-w-7xl grid-cols-4 gap-8 px-8 pb-8 pt-7">
              {FEATURE_GROUPS.map((g, i) => (
                <div key={g.key} className="min-w-0">
                  <p className="flex items-baseline gap-2 border-b border-ink/10 pb-3">
                    <span className="font-mono text-xs text-ink-faint">0{i + 1}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">{g.name}</span>
                  </p>
                  <ul className="mt-2 flex flex-col">
                    {g.items.map((it) => (
                      <li key={it.href}>
                        <Link href={it.href} className={`flex items-center gap-2 rounded py-1.5 text-sm text-ink transition-colors hover:text-rust ${focusRing}`}>
                          {it.label}
                          {it.isNew && <span className="rounded-full bg-rust/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-rust">New</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-ink/10">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4 text-sm">
                <p className="text-ink-soft">Catch, reply, follow up and close, in one place.</p>
                <Link href="/features" className={`group inline-flex items-center gap-1.5 rounded font-semibold text-rust ${focusRing}`}>
                  All features
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile menu ───────────────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            className={`max-h-[calc(100dvh-4rem)] overflow-y-auto border-t lg:hidden ${light ? "border-ink/10" : "border-outline-variant"}`}
          >
            <div className="flex flex-col px-4 pb-6 pt-2 sm:px-6">
              {navLinks.map(([label, href]) =>
                label === FEATURES ? (
                  <div key={label} className={`border-b ${light ? "border-ink/10" : "border-outline-variant/60"}`}>
                    <button
                      type="button"
                      aria-expanded={mobileFeatures}
                      aria-controls="mobile-features"
                      onClick={() => setMobileFeatures((o) => !o)}
                      className={`flex w-full items-center justify-between py-3.5 text-left text-base ${light ? "text-ink" : "text-on-surface"}`}
                    >
                      {label}
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileFeatures ? "rotate-180" : ""}`} />
                    </button>
                    {mobileFeatures && (
                      <div id="mobile-features" className="flex flex-col gap-5 pb-5 pl-1">
                        {FEATURE_GROUPS.map((g) => (
                          <div key={g.key}>
                            <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${light ? "text-ink-faint" : "text-on-surface-variant"}`}>{g.name}</p>
                            <ul className="mt-1 flex flex-col">
                              {g.items.map((it) => (
                                <li key={it.href}>
                                  <Link href={it.href} className={`block py-2 text-[15px] ${light ? "text-ink-soft" : "text-on-surface-variant"}`}>
                                    {it.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <Link href="/features" className={`inline-flex items-center gap-1.5 text-sm font-semibold ${light ? "text-rust" : "text-primary-container"}`}>
                          All features
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={label}
                    href={href}
                    onClick={(e) => handleNavClick(e, href)}
                    className={`border-b py-3.5 text-base ${light ? "border-ink/10" : "border-outline-variant/60"} ${
                      label === activePage ? (light ? "text-rust" : "text-primary-container") : light ? "text-ink" : "text-on-surface"
                    }`}
                  >
                    {label}
                  </Link>
                ),
              )}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <a href={APP_LOGIN_URL} className={`rounded-full border py-3 text-center text-sm font-medium ${light ? "border-ink/20 text-ink" : "border-outline-variant text-on-surface"}`}>
                  Sign in
                </a>
                <a href={APP_REGISTER_URL} className={`rounded-full py-3 text-center text-sm font-semibold ${light ? "bg-ink text-paper" : "bg-paper text-ink"}`}>
                  Start free trial
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
