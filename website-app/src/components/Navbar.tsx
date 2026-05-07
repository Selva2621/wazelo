"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBreakpoint, APP_REGISTER_URL, APP_LOGIN_URL } from "@/lib/wazelo";
import { useLenis } from "@/app/lenis-provider";

interface NavbarProps {
  activePage?: string;
}

const navLinks: [string, string][] = [
  ["Features", "/#features"],
  ["Use Cases", "/use-cases"],
  ["Pricing", "/#pricing"],
  ["About", "/about"],
];

export default function Navbar({ activePage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mobile } = useBreakpoint();
  const pathname = usePathname();
  const router = useRouter();
  const lenis = useLenis();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    h();
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const hashMatch = href.match(/^\/(#.+)$/);
    if (!hashMatch) return; // let <Link> handle normal routes

    e.preventDefault();
    const hash = hashMatch[1]; // "#features" or "#pricing"

    if (pathname === "/") {
      const target = document.querySelector(hash);
      if (target && lenis) {
        lenis.scrollTo(target as HTMLElement, { offset: -72 });
      }
    } else {
      router.push(href);
    }
  }

  return (
    <nav style={{
      position: "fixed", top: 0, width: "100%", zIndex: 50,
      background: scrolled ? "rgba(13,13,13,0.96)" : "rgba(13,13,13,0.7)",
      backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(255,183,125,0.08)",
      transition: "background 0.3s ease",
    }}>
      <div style={{
        maxWidth: 1440, margin: "0 auto",
        padding: mobile ? "0 20px" : "0 48px",
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <Image
            src="/logo/logo.jpeg"
            alt="Wazelo CRM"
            width={36}
            height={36}
            style={{ height: 36, width: 36, objectFit: "contain", mixBlendMode: "screen" }}
          />
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em", color: "#e5e2e1", fontFamily: "'Inter', sans-serif" }}>
            Wazelo <span style={{ color: "#ffb77d" }}>CRM</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        {!mobile && (
          <div style={{ display: "flex", gap: 36, alignItems: "center" }}>
            {navLinks.map(([label, href]) => {
              const isActive = label === activePage;
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={(e) => handleNavClick(e, href)}
                  style={{
                    fontSize: 13, fontWeight: 500, letterSpacing: "0.02em",
                    textDecoration: "none",
                    color: isActive ? "#ffb77d" : "rgba(219,194,176,0.75)",
                    fontFamily: "'Inter', sans-serif", transition: "color 0.2s",
                  }}
                  onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = "#e5e2e1")}
                  onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = isActive ? "#ffb77d" : "rgba(219,194,176,0.75)")}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Desktop CTA + Mobile hamburger */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {!mobile && (
            <a href={APP_LOGIN_URL} style={{ fontSize: 13, fontWeight: 500, color: "#dbc2b0", textDecoration: "none", fontFamily: "'Inter', sans-serif" }}>
              Sign In
            </a>
          )}
          {!mobile && (
            <a href={APP_REGISTER_URL} style={{
              fontSize: 13, fontWeight: 700, padding: "10px 22px", borderRadius: 100,
              background: "#fff", color: "#131313", textDecoration: "none", display: "inline-block",
              fontFamily: "'Inter', sans-serif",
            }}>
              Get Started Free
            </a>
          )}
          {mobile && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", gap: 5 }}
            >
              <span style={{
                display: "block", width: 22, height: 2,
                background: menuOpen ? "#ffb77d" : "#e5e2e1",
                transition: "all 0.3s ease",
                transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none",
              }} />
              <span style={{
                display: "block", width: 22, height: 2,
                background: menuOpen ? "#ffb77d" : "#e5e2e1",
                transition: "all 0.3s ease",
                opacity: menuOpen ? 0 : 1,
              }} />
              <span style={{
                display: "block", width: 22, height: 2,
                background: menuOpen ? "#ffb77d" : "#e5e2e1",
                transition: "all 0.3s ease",
                transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none",
              }} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobile && (
        <div style={{
          maxHeight: menuOpen ? 400 : 0,
          overflow: "hidden",
          transition: "max-height 0.35s ease",
          background: "rgba(13,13,13,0.98)",
          borderTop: menuOpen ? "1px solid rgba(255,183,125,0.08)" : "none",
        }}>
          <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 0 }}>
            {navLinks.map(([label, href]) => {
              const isActive = label === activePage;
              return (
                <Link
                  key={label}
                  href={href}
                  onClick={(e) => {
                    handleNavClick(e, href);
                    setMenuOpen(false);
                  }}
                  style={{
                    padding: "14px 0", fontSize: 16, fontWeight: 500,
                    color: isActive ? "#ffb77d" : "rgba(219,194,176,0.8)",
                    textDecoration: "none", fontFamily: "'Inter', sans-serif",
                    borderBottom: "1px solid rgba(255,183,125,0.06)",
                  }}
                >
                  {label}
                </Link>
              );
            })}
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <a href={APP_LOGIN_URL} style={{
                flex: 1, fontSize: 14, fontWeight: 500, padding: "12px",
                borderRadius: 8, border: "1px solid rgba(255,183,125,0.2)",
                color: "#dbc2b0", textDecoration: "none", textAlign: "center",
                fontFamily: "'Inter', sans-serif",
              }}>Sign In</a>
              <a href={APP_REGISTER_URL} style={{
                flex: 1, fontSize: 14, fontWeight: 700, padding: "12px",
                borderRadius: 8, background: "#fff", color: "#131313",
                textDecoration: "none", textAlign: "center",
                fontFamily: "'Inter', sans-serif",
              }}>Get Started</a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
