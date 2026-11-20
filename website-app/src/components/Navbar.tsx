"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { APP_REGISTER_URL, APP_LOGIN_URL } from "@/lib/wazelo";
import { useLenis } from "@/app/lenis-provider";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavbarProps {
  activePage?: string;
}

const navLinks: [string, string][] = [
  ["How it works", "/#story"],
  ["Features", "/#features"],
  ["Pricing", "/#pricing"],
  ["Use Cases", "/use-cases"],
  ["About", "/about"],
];

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

export default function Navbar({ activePage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
  // only while it sits over the dark hero film.
  const light = pathname !== "/" || pastHero;
  const solid = scrolled || menuOpen;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${light ? "" : "tone-fixed"} ${
        !solid ? "border-transparent bg-transparent" : light ? "border-ink/10 bg-paper/85 backdrop-blur-xl" : "border-outline-variant bg-surface/85 backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className={`flex items-center gap-2.5 rounded-lg ${focusRing}`}>
          <Image src="/logo/logo.png" alt="" width={32} height={32} priority className="size-8 object-contain" />
          <span className={`text-lg font-semibold tracking-tight ${light ? "text-ink" : "text-on-surface"}`}>
            Waze<span className={light ? "text-rust" : "text-primary-container"}>lo</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              onClick={(e) => handleNavClick(e, href)}
              aria-current={label === activePage ? "page" : undefined}
              className={`rounded text-sm transition-colors ${focusRing} ${
                label === activePage
                  ? light ? "text-rust" : "text-primary-container"
                  : light ? "text-ink-soft hover:text-ink" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {label}
            </Link>
          ))}
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

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            className={`overflow-hidden border-t lg:hidden ${light ? "border-ink/10" : "border-outline-variant"}`}
          >
            <div className="flex flex-col px-4 pb-6 pt-2 sm:px-6">
              {navLinks.map(([label, href]) => (
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
              ))}
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
