"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  ClipboardList,
  Inbox,
  KeyRound,
  Megaphone,
  MessageCircle,
  Phone,
  Repeat,
  Sparkles,
  Star,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/home/reveal";
import { useLoopActive } from "@/components/home/use-loop";
import { springs } from "@/components/mocks/motion";
import { LaptopFrame } from "@/components/mocks/laptop-frame";
import { TeamScreen } from "@/components/mocks/app-screens";
import { gsap, useGSAP, MQ_FULL } from "@/lib/gsap";
import { Illustration } from "@/components/illustration";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/* ─── Routing visual ─────────────────────────────────────────────────────────
   Chats arrive on the business number, pass through Wazelo and go round-robin
   to agents. SVG paths share one command structure; packets follow them via
   getPointAtLength, driven by motion values (no re-render per frame). */

const VB = { w: 1000, h: 300 };
const SOURCE = { x: 120, y: 150 };
const HUB = { x: 500, y: 150 };
const AGENTS = [
  { name: "Meera Joshi", role: "Sales", initials: "MJ", y: 58, start: 3 },
  { name: "Arjun Iyer", role: "Support", initials: "AI", y: 150, start: 5 },
  { name: "Sana Khan", role: "Sales", initials: "SK", y: 242, start: 4 },
];
const AGENT_X = 880;
const CUSTOMERS = ["Kunal Deshpande", "Sneha Patil", "Rohit Kulkarni", "Anjali Rao", "Vikram Shah", "Pooja Nair"];
const ARRIVE_EVERY_MS = 1700;
const TRAVEL_S = 2.2;

const routeFor = (y: number) =>
  `M${SOURCE.x} ${SOURCE.y} C ${SOURCE.x + 150} ${SOURCE.y}, ${HUB.x - 150} ${HUB.y}, ${HUB.x} ${HUB.y} C ${HUB.x + 160} ${HUB.y}, ${AGENT_X - 200} ${y}, ${AGENT_X} ${y}`;

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

interface PacketData {
  id: number;
  agent: number;
}

// HTML dot (not an SVG circle) so it stays round when the SVG stretches.
function Packet({ path, onDone }: { path: SVGPathElement | null; onDone: () => void }) {
  const left = useMotionValue(pct(SOURCE.x, VB.w));
  const top = useMotionValue(pct(SOURCE.y, VB.h));
  const opacity = useMotionValue(0);

  useEffect(() => {
    if (!path) return;
    const len = path.getTotalLength();
    const controls = animate(0, 1, {
      duration: TRAVEL_S,
      ease: [0.45, 0, 0.25, 1],
      onUpdate: (p) => {
        const pt = path.getPointAtLength(p * len);
        left.set(pct(pt.x, VB.w));
        top.set(pct(pt.y, VB.h));
        opacity.set(p < 0.06 ? p / 0.06 : p > 0.94 ? (1 - p) / 0.06 : 1);
      },
      onComplete: onDone,
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <motion.span
      aria-hidden
      style={{ left, top, opacity }}
      className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-container shadow-[0_0_0_6px_rgb(245_158_11/0.18),0_0_18px_rgb(245_158_11/0.6)]"
    />
  );
}

function Node({ x, y, children, className = "" }: { x: number; y: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={`absolute -translate-x-1/2 -translate-y-1/2 ${className}`} style={{ left: pct(x, VB.w), top: pct(y, VB.h) }}>
      {children}
    </div>
  );
}

function RoutingPanel() {
  const { ref, active } = useLoopActive();
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const [packets, setPackets] = useState<PacketData[]>([]);
  const [counts, setCounts] = useState(AGENTS.map((a) => a.start));
  const [last, setLast] = useState<{ customer: string; agent: number } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!active) return;
    const spawn = () => {
      const id = seq.current++;
      setPackets((p) => [...p, { id, agent: id % AGENTS.length }]);
    };
    spawn();
    const t = setInterval(spawn, ARRIVE_EVERY_MS);
    return () => clearInterval(t);
  }, [active]);

  const arrive = (p: PacketData) => {
    setPackets((list) => list.filter((x) => x.id !== p.id));
    setCounts((c) => c.map((n, i) => (i === p.agent ? n + 1 : n)));
    setLast({ customer: CUSTOMERS[p.id % CUSTOMERS.length], agent: p.agent });
  };

  return (
    <div ref={ref} className="lg-glass overflow-hidden rounded-3xl">
      <div className="relative aspect-[10/5] w-full sm:aspect-[10/3.4] lg:aspect-[10/2.7]">
        <svg viewBox={`0 0 ${VB.w} ${VB.h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {AGENTS.map((a, i) => (
            <path
              key={a.name}
              ref={(el) => {
                paths.current[i] = el;
              }}
              d={routeFor(a.y)}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="4 6"
              vectorEffect="non-scaling-stroke"
              className="stroke-white/15"
            />
          ))}
        </svg>
        {packets.map((p) => (
          <Packet key={p.id} path={paths.current[p.agent]} onDone={() => arrive(p)} />
        ))}

        <Node x={SOURCE.x} y={SOURCE.y}>
          <div className="lg-glass flex items-center gap-2.5 rounded-2xl p-2 sm:pr-4">
            <span className="grid size-9 place-items-center rounded-xl bg-[#24403b] text-[#8fd1bf]">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium text-on-surface">Your number</span>
              <span className="block text-xs text-on-surface-variant">+91 20 4718 2290</span>
            </span>
          </div>
        </Node>

        <Node x={HUB.x} y={HUB.y}>
          <div className="lg-glass flex flex-col items-center gap-1 rounded-2xl px-3 py-2.5 sm:px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/logo.png" alt="" className="size-7 object-contain" />
            <span className="hidden text-xs font-medium text-on-surface sm:block">Round robin</span>
          </div>
        </Node>

        {AGENTS.map((a, i) => (
          <Node key={a.name} x={AGENT_X} y={a.y} className="translate-x-[-30%] sm:-translate-x-1/4">
            <div className="lg-glass flex items-center gap-2.5 rounded-2xl p-1.5 sm:p-2 sm:pr-3">
              <span className="relative grid size-8 place-items-center rounded-xl bg-surface-container-high text-xs font-semibold text-on-surface sm:size-9">
                {a.initials}
                <motion.span
                  key={counts[i]}
                  initial={{ scale: 1.6 }}
                  animate={{ scale: 1 }}
                  transition={springs.snappy}
                  className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary-container px-1 text-[10px] font-bold text-on-primary tabular-nums"
                >
                  {counts[i]}
                </motion.span>
              </span>
              <span className="hidden leading-tight md:block">
                <span className="block text-sm font-medium text-on-surface">{a.name}</span>
                <span className="block text-xs text-on-surface-variant">{a.role}</span>
              </span>
            </div>
          </Node>
        ))}
      </div>

      <div className="flex min-h-12 items-center gap-2 border-t border-white/[0.06] px-5 text-sm text-on-surface-variant">
        <Workflow className="h-4 w-4 shrink-0 text-primary-container" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={last ? `${last.customer}-${counts.join()}` : "idle"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="truncate"
          >
            {last ? (
              <>
                <span className="text-on-surface">{last.customer}</span> assigned to {AGENTS[last.agent].name}
              </>
            ) : (
              "New chats are shared out evenly across the team"
            )}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Laptop that opens on scroll ────────────────────────────────────────────
   The lid rotates up from the hinge as the section scrolls in (scrubbed), then
   status toasts pop around it in sequence. */

const TOASTS = [
  { icon: UsersRound, title: "Kunal assigned to Meera", text: "Automation, 2 seconds after the first message", pos: "-left-32 top-[34%]" },
  { icon: Star, title: "CSAT 5 out of 5", text: "Site visit at Baner Heights", pos: "-right-28 top-[4%]" },
  { icon: Megaphone, title: "Weekend open-house campaign", text: "Sent to the Baner buyers segment", pos: "-right-24 bottom-[12%]" },
];

function TeamLaptop() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_FULL, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top 85%", end: "top 25%", scrub: 1 } })
          .from("[data-laptop-lid]", { rotationX: -88, ease: "none" })
          .from("[data-team=screen-glow]", { autoAlpha: 0, ease: "none" }, "<0.4");
        gsap.from("[data-toast]", {
          y: 24,
          scale: 0.9,
          autoAlpha: 0,
          stagger: 0.25,
          duration: 0.6,
          ease: "back.out(1.8)",
          scrollTrigger: { trigger: root.current, start: "top 30%", toggleActions: "play none none reverse" },
        });
      });
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.from(root.current, { y: 40, autoAlpha: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 85%" } });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="relative mx-auto max-w-4xl">
      <div data-team="screen-glow" aria-hidden className="device-glow" />
      <LaptopFrame>
        <TeamScreen beat={4} revealed={3} />
      </LaptopFrame>
      {TOASTS.map(({ icon: Icon, title, text, pos }) => (
        <div key={title} data-toast className={`lg-glass absolute hidden w-max max-w-[17rem] items-center gap-3 rounded-2xl py-2.5 pl-2.5 pr-4 xl:flex ${pos}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary-container">
            <Icon className="h-4 w-4" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-medium text-on-surface">{title}</span>
            <span className="block text-xs text-on-surface-variant">{text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Capability tabs ────────────────────────────────────────────────────── */

const GROUPS: { title: string; items: { icon: LucideIcon; name: string; text: string; href?: string }[] }[] = [
  {
    title: "Share one inbox",
    items: [
      { icon: Inbox, name: "Shared inbox", text: "Every agent works the same WhatsApp number, with no shared phone.", href: "/features/shared-inbox" },
      { icon: UsersRound, name: "Assignments and My Team", text: "Route chats to the right person. Managers see their team's queue.", href: "/features/shared-inbox" },
      { icon: Sparkles, name: "AI replies and summaries", text: "Draft answers and catch up on long threads in a click." },
    ],
  },
  {
    title: "Reach people at scale",
    items: [
      { icon: Megaphone, name: "Campaigns", text: "Broadcast approved templates and track delivery live.", href: "/features/campaigns" },
      { icon: Workflow, name: "Automation", text: "Auto-replies, routing rules and drip flows that run 24/7.", href: "/features/automation" },
      { icon: Bot, name: "Chatbot and chat widget", text: "Answer FAQs on WhatsApp and capture visitors from your site.", href: "/features/chatbot" },
      { icon: Repeat, name: "Sequences", text: "Timed follow-ups that stop as soon as a lead replies.", href: "/features/sequences" },
    ],
  },
  {
    title: "Stay in control",
    items: [
      { icon: KeyRound, name: "Roles and permissions", text: "Admin, Manager and Employee access, set per person." },
      { icon: Phone, name: "Multiple WhatsApp numbers", text: "Connect a number per branch, brand or team." },
      { icon: Star, name: "CSAT surveys", text: "Ask for a rating after every resolved chat.", href: "/features/csat" },
      { icon: ClipboardList, name: "Audit logs and GDPR tools", text: "See who changed what, and handle data requests." },
    ],
  },
];

function CapabilityTabs() {
  const [tab, setTab] = useState(0);
  const group = GROUPS[tab];

  return (
    <div>
      <div role="tablist" aria-label="Team capabilities" className="lg-glass-pill flex w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] sm:w-max [&::-webkit-scrollbar]:hidden">
        {GROUPS.map((g, i) => (
          <button
            key={g.title}
            type="button"
            role="tab"
            id={`cap-tab-${i}`}
            aria-selected={i === tab}
            aria-controls="cap-panel"
            onClick={() => setTab(i)}
            className={`relative shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-[background-color] ${focusRing} ${
              i === tab ? "text-on-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {i === tab && <motion.span layoutId="cap-tab" transition={springs.layout} className="absolute inset-0 rounded-full bg-primary-container" />}
            <span className="relative">{g.title}</span>
          </button>
        ))}
      </div>

      <div id="cap-panel" role="tabpanel" aria-labelledby={`cap-tab-${tab}`} className="mt-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={group.title}
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{ show: { transition: { staggerChildren: 0.06 } }, hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } } }}
            className={`grid gap-4 sm:grid-cols-2 ${group.items.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
          >
            {group.items.map(({ icon: Icon, name, text, href }) => {
              const body = (
                <>
                  <span className="lg-glass-pill grid size-10 place-items-center rounded-xl">
                    <Icon className="h-5 w-5 text-primary-container" />
                  </span>
                  <p className="mt-5 flex items-center gap-1 font-medium text-on-surface">
                    {name}
                    {href && (
                      <ArrowUpRight className="h-4 w-4 text-on-surface-variant transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary-container" />
                    )}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{text}</p>
                </>
              );
              return (
                <motion.li
                  key={name}
                  variants={{ hidden: { opacity: 0, y: 14, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: springs.gentle } }}
                >
                  {href ? (
                    <Link href={href} className={`lg-glass group block h-full rounded-2xl p-6 transition-colors hover:border-primary/40 ${focusRing}`}>
                      {body}
                    </Link>
                  ) : (
                    <div className="lg-glass h-full rounded-2xl p-6">{body}</div>
                  )}
                </motion.li>
              );
            })}
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */

export function Teams() {
  return (
    <section id="teams" className="relative scroll-mt-16 overflow-hidden border-t border-outline-variant/70 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div aria-hidden className="glass-stage">
        <span className="left-1/4 top-56 h-80 w-[36rem] bg-primary/20" />
        <span className="-right-24 top-24 h-72 w-72 bg-chart-2/10" />
        <span className="bottom-10 left-0 h-64 w-96 bg-primary-container/10" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <Reveal>
          <h2 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface md:text-5xl">
            Built for teams that share one number.
          </h2>
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-on-surface-variant">
            Sales and support work the same chats, with clear owners and a record of every reply. Team plans start at ₹499 a month for 5 users.
          </p>
        </Reveal>

        <div className="mt-16">
          <TeamLaptop />
        </div>

        <Reveal className="mt-20 flex items-end justify-between gap-8">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-on-surface">Every chat gets an owner.</h3>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-on-surface-variant">New conversations are shared out evenly, so nobody is buried and nobody is idle.</p>
          </div>
          <Illustration name="team" label="A team working together on shared conversations" className="hidden h-36 w-56 shrink-0 md:block" />
        </Reveal>
        <Reveal delay={0.05} className="mt-8">
          <RoutingPanel />
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <CapabilityTabs />
        </Reveal>
      </div>
    </section>
  );
}
