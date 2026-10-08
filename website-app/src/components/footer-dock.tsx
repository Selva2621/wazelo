"use client";

// Glass dock at the foot of the page: back to top, theme, email, docs, contact.
// Items magnify toward the pointer like a desktop dock, a glass highlight
// slides between them, and a label springs up above the hovered one.
// Reduced motion keeps the dock static.

import { useContext, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ArrowUp, BookOpen, Mail, MessageCircle } from "lucide-react";
import { LenisContext } from "@/app/lenis-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { springs } from "@/components/mocks/motion";

const BASE = 40;
const PEAK = 56;
// How far from an item's centre the pointer still enlarges it.
const REACH = 120;

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";
const itemClass = `grid size-full place-items-center rounded-full text-on-surface-variant transition-colors hover:text-on-surface ${focusRing}`;

function DockItem({
  id,
  label,
  mouseX,
  hovered,
  setHovered,
  children,
}: {
  id: string;
  label: string;
  mouseX: MotionValue<number>;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();

  const distance = useTransform(mouseX, (x) => {
    const box = ref.current?.getBoundingClientRect();
    return box ? x - (box.left + box.width / 2) : Infinity;
  });
  const target = useTransform(distance, [-REACH, 0, REACH], [BASE, PEAK, BASE]);
  const size = useSpring(target, { stiffness: 380, damping: 28, mass: 0.6 });
  const iconScale = useTransform(size, [BASE, PEAK], [1, 1.25]);

  const active = hovered === id;
  return (
    <motion.li
      ref={ref}
      style={reduce ? { width: BASE, height: BASE } : { width: size, height: size }}
      className="relative flex items-end justify-center"
      onPointerEnter={() => setHovered(id)}
      onFocus={() => setHovered(id)}
      onBlur={() => setHovered(null)}
    >
      {active && (
        <motion.span
          layoutId="dock-highlight"
          transition={springs.layout}
          aria-hidden
          className="lg-glass-pill absolute inset-0 rounded-full !border-primary/30"
        />
      )}
      <AnimatePresence>
        {active && (
          <motion.span
            key="label"
            role="presentation"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={springs.snappy}
            className="lg-glass pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium text-on-surface"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      <motion.span style={reduce ? undefined : { scale: iconScale }} className="relative size-full">
        {children}
      </motion.span>
    </motion.li>
  );
}

export function FooterDock() {
  const lenis = useContext(LenisContext);
  const reduce = useReducedMotion();
  const mouseX = useMotionValue(Infinity);
  const [hovered, setHovered] = useState<string | null>(null);

  const toTop = () => {
    if (lenis.current) lenis.current.scrollTo(0, { duration: 1.2 });
    else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  const item = { mouseX, hovered, setHovered };
  return (
    <motion.nav
      aria-label="Quick links"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={springs.gentle}
      className="flex justify-center"
    >
      <ul
        onPointerMove={(e) => mouseX.set(e.clientX)}
        onPointerLeave={() => {
          mouseX.set(Infinity);
          setHovered(null);
        }}
        className="lg-glass flex h-16 items-end gap-2 rounded-full px-3 pb-3"
      >
        <DockItem id="top" label="Back to top" {...item}>
          <button type="button" onClick={toTop} aria-label="Back to top" className={itemClass}>
            <ArrowUp className="h-[18px] w-[18px]" />
          </button>
        </DockItem>
        <DockItem id="theme" label="Theme" {...item}>
          <ThemeToggle className="!size-full hover:!bg-transparent" />
        </DockItem>
        <li aria-hidden className="mx-1 mb-2.5 h-5 w-px self-end bg-ink/10" />
        <DockItem id="mail" label="noreply@wazelo.in" {...item}>
          <a href="mailto:noreply@wazelo.in" aria-label="Email noreply@wazelo.in" className={itemClass}>
            <Mail className="h-[18px] w-[18px]" />
          </a>
        </DockItem>
        <DockItem id="docs" label="Documentation" {...item}>
          <Link href="/docs" aria-label="Documentation" className={itemClass}>
            <BookOpen className="h-[18px] w-[18px]" />
          </Link>
        </DockItem>
        <DockItem id="contact" label="Talk to us" {...item}>
          <Link href="/contact" aria-label="Contact" className={itemClass}>
            <MessageCircle className="h-[18px] w-[18px]" />
          </Link>
        </DockItem>
      </ul>
    </motion.nav>
  );
}
