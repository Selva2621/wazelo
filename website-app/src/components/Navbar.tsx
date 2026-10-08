"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  ChevronDown,
  Code2,
  Contact,
  Inbox,
  Megaphone,
  Menu,
  Repeat,
  Star,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { APP_REGISTER_URL, APP_LOGIN_URL } from "@/lib/wazelo";
import { useLenis } from "@/app/lenis-provider";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavbarProps {
  activePage?: string;
}

type NavItem = { label: string; href: string };

const LINKS_BEFORE: NavItem[] = [
  { label: "Freelancers", href: "/#freelancers" },
  { label: "Teams", href: "/#teams" },
];
const LINKS_AFTER: NavItem[] = [
  { label: "Pricing", href: "/#pricing" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "About", href: "/about" },
];

// Every feature page, grouped for the Features menu.
const FEATURE_GROUPS: { title: string; items: { icon: LucideIcon; name: string; text: string; href: string }[] }[] = [
  {
    title: "Conversations",
    items: [
      { icon: Inbox, name: "Shared inbox", text: "Assign, label, and reply as a team", href: "/features/shared-inbox" },
      { icon: Bot, name: "Chatbot builder", text: "AI or no-code flows", href: "/features/chatbot" },
      { icon: Star, name: "CSAT surveys", text: "1 to 5 ratings, sent from a chat", href: "/features/csat" },
    ],
  },
  {
    title: "Growth",
    items: [
      { icon: Megaphone, name: "Campaigns", text: "Broadcasts with per-recipient status", href: "/features/campaigns" },
      { icon: Repeat, name: "Sequences", text: "Follow-ups that stop on reply", href: "/features/sequences" },
      { icon: Workflow, name: "Automation", text: "Trigger and action rules", href: "/features/automation" },
    ],
  },
  {
    title: "Data and dev",
    items: [
      { icon: Contact, name: "Contacts", text: "Tags, custom fields, CSV import", href: "/features/contacts" },
      { icon: BarChart3, name: "Analytics", text: "Team and campaign reports", href: "/features/analytics" },
      { icon: Code2, name: "Developer API", text: "API keys and webhooks", href: "/features/developer-api" },
    ],
  },
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";
const CLOSE_DELAY_MS = 160;

export default function Navbar({ activePage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileFeaturesOpen, setMobileFeaturesOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const lenis = useLenis();
  const { scrollY } = useScroll();

  const featuresBtn = useRef<HTMLButtonElement>(null);
  const featuresWrap = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 20));

  useEffect(() => {
    setMenuOpen(false);
    setFeaturesOpen(false);
    setMobileFeaturesOpen(false);
  }, [pathname]);

  // Close the Features menu on outside click or Esc (focus returns to the button).
  useEffect(() => {
    if (!featuresOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!featuresWrap.current?.contains(e.target as Node)) setFeaturesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFeaturesOpen(false);
        featuresBtn.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [featuresOpen]);

  // Hover opens; leaving closes after a short delay so the pointer can reach the panel.
  const openSoon = () => {
    clearTimeout(closeTimer.current);
    setFeaturesOpen(true);
  };
  const closeSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setFeaturesOpen(false), CLOSE_DELAY_MS);
  };

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    setFeaturesOpen(false);
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

  const linkClass = (label: string) =>
    `rounded text-sm transition-colors ${focusRing} ${label === activePage ? "text-primary-container" : "text-on-surface-variant hover:text-on-surface"}`;

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || menuOpen || featuresOpen ? "border-outline-variant bg-surface/85 backdrop-blur-xl" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
          <Image src="/logo/logo.png" alt="" width={32} height={32} priority className="size-8 object-contain" />
          <span className="text-lg font-semibold tracking-tight text-on-surface">
            Waze<span className="text-primary-container">lo</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {LINKS_BEFORE.map(({ label, href }) => (
            <Link key={label} href={href} onClick={(e) => handleNavClick(e, href)} aria-current={label === activePage ? "page" : undefined} className={linkClass(label)}>
              {label}
            </Link>
          ))}

          {/* Features menu */}
          <div ref={featuresWrap} className="relative" onPointerEnter={(e) => e.pointerType === "mouse" && openSoon()} onPointerLeave={(e) => e.pointerType === "mouse" && closeSoon()}>
            <button
              ref={featuresBtn}
              type="button"
              aria-expanded={featuresOpen}
              aria-controls="features-menu"
              onClick={() => setFeaturesOpen((o) => !o)}
              className={`flex items-center gap-1 ${linkClass("Features")} ${featuresOpen ? "text-on-surface" : ""}`}
            >
              Features
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${featuresOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {featuresOpen && (
                <motion.div
                  id="features-menu"
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="absolute left-1/2 top-full w-[min(48rem,calc(100vw-4rem))] origin-top -translate-x-1/2 pt-4"
                >
                  <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-[0_24px_60px_-20px_rgb(var(--fx-shadow)/0.35)]">
                    <div className="grid grid-cols-3 gap-2 p-4">
                      {FEATURE_GROUPS.map((group) => (
                        <div key={group.title}>
                          <p className="px-3 pb-2 pt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{group.title}</p>
                          <ul className="flex flex-col gap-0.5">
                            {group.items.map(({ icon: Icon, name, text, href }) => (
                              <li key={href}>
                                <Link
                                  href={href}
                                  onClick={() => setFeaturesOpen(false)}
                                  aria-current={pathname === href ? "page" : undefined}
                                  className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-ink/5 ${focusRing} ${pathname === href ? "bg-primary/10" : ""}`}
                                >
                                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-container transition-colors group-hover:bg-primary/15">
                                    <Icon className="h-4 w-4" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-medium text-on-surface">{name}</span>
                                    <span className="block text-xs leading-snug text-on-surface-variant">{text}</span>
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 border-t border-ink/10 bg-ink/[0.03] px-5 py-3 text-sm">
                      <Link href="/#freelancers" onClick={(e) => handleNavClick(e, "/#freelancers")} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-on-surface-variant transition-colors hover:text-on-surface ${focusRing}`}>
                        <Briefcase className="h-4 w-4 text-primary-container" /> For freelancers
                      </Link>
                      <Link href="/#teams" onClick={(e) => handleNavClick(e, "/#teams")} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-on-surface-variant transition-colors hover:text-on-surface ${focusRing}`}>
                        <Building2 className="h-4 w-4 text-primary-container" /> For teams
                      </Link>
                      <Link
                        href="/#features"
                        onClick={(e) => handleNavClick(e, "/#features")}
                        className={`group ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium text-primary-container ${focusRing}`}
                      >
                        See all features <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {LINKS_AFTER.map(({ label, href }) => (
            <Link key={label} href={href} onClick={(e) => handleNavClick(e, href)} aria-current={label === activePage ? "page" : undefined} className={linkClass(label)}>
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href={APP_LOGIN_URL} className={`hidden rounded-full px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface sm:inline-flex ${focusRing}`}>
            Sign in
          </a>
          <a
            href={APP_REGISTER_URL}
            className={`hidden rounded-full bg-primary-container px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary active:scale-[0.98] sm:inline-flex ${focusRing}`}
          >
            Start free trial
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className={`grid size-10 place-items-center rounded-full text-on-surface lg:hidden ${focusRing}`}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-outline-variant lg:hidden"
          >
            <div className="flex flex-col px-4 pb-6 pt-2 sm:px-6">
              {LINKS_BEFORE.map(({ label, href }) => (
                <Link key={label} href={href} onClick={(e) => handleNavClick(e, href)} className={`border-b border-outline-variant/60 py-3.5 text-base ${label === activePage ? "text-primary-container" : "text-on-surface"}`}>
                  {label}
                </Link>
              ))}

              {/* Features, expandable */}
              <div className="border-b border-outline-variant/60">
                <button
                  type="button"
                  aria-expanded={mobileFeaturesOpen}
                  aria-controls="mobile-features"
                  onClick={() => setMobileFeaturesOpen((o) => !o)}
                  className={`flex w-full items-center justify-between py-3.5 text-left text-base ${activePage === "Features" ? "text-primary-container" : "text-on-surface"}`}
                >
                  Features
                  <ChevronDown className={`h-5 w-5 text-on-surface-variant transition-transform duration-200 ${mobileFeaturesOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence initial={false}>
                  {mobileFeaturesOpen && (
                    <motion.div
                      id="mobile-features"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-4 pb-4">
                        {FEATURE_GROUPS.map((group) => (
                          <div key={group.title}>
                            <p className="pb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-on-surface-variant">{group.title}</p>
                            <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                              {group.items.map(({ icon: Icon, name, href }) => (
                                <li key={href}>
                                  <Link href={href} className="flex items-center gap-3 rounded-lg py-2 text-sm text-on-surface">
                                    <Icon className="h-4 w-4 text-primary-container" />
                                    {name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {LINKS_AFTER.map(({ label, href }) => (
                <Link key={label} href={href} onClick={(e) => handleNavClick(e, href)} className={`border-b border-outline-variant/60 py-3.5 text-base ${label === activePage ? "text-primary-container" : "text-on-surface"}`}>
                  {label}
                </Link>
              ))}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <a href={APP_LOGIN_URL} className="rounded-full border border-outline-variant py-3 text-center text-sm font-medium text-on-surface">
                  Sign in
                </a>
                <a href={APP_REGISTER_URL} className="rounded-full bg-primary-container py-3 text-center text-sm font-semibold text-on-primary">
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
