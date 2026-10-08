"use client";

// Hero story, shared by a laptop and a phone: Riya links her WhatsApp to Wazelo
// by scanning a QR (the real connect flow, Settings > Linked Devices), finds
// Bloom Bakery with the Lead Scraper, sends a template, and the reply moves the
// lead along the pipeline. Copy mirrors the app (frontend settings/whatsapp,
// leads/scraper, leads/pipeline).

import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  Check,
  CheckCheck,
  Kanban,
  LayoutDashboard,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  MonitorSmartphone,
  MoreVertical,
  ScanLine,
  ScanSearch,
  Search,
  Settings,
  Star,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { springs } from "@/components/mocks/motion";
import { Incoming, Outgoing, PhoneShell, Time, TypingBubble, bubbleEnter } from "@/components/mocks/phone-frame";

/* ─── Clock ──────────────────────────────────────────────────────────────────
   0 QR on screen · 1 phone scans · 2 connected · 3 lead found · 4 template sent ·
   5 client typing · 6 client replies, lead moves to Interested. */
const STEP_MS = [2200, 1800, 1900, 2400, 2000, 1300, 3800];
export const FINAL_STEP = STEP_MS.length - 1;

/** Advances the story while `active`; parks on the last beat when motion is reduced. */
export function useScanStory(active: boolean, reduce: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % STEP_MS.length), STEP_MS[step]);
    return () => clearTimeout(t);
  }, [step, active]);
  return reduce ? FINAL_STEP : step;
}

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
} as const;

/* ─── QR code ────────────────────────────────────────────────────────────────
   A fixed 25x25 pattern with the three finder squares, drawn as one path. */
const QR_SIZE = 25;
const QR_PATH = (() => {
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= QR_SIZE - 8 && y < 8) || (x < 8 && y >= QR_SIZE - 8);
  let d = "";
  for (let y = 0; y < QR_SIZE; y++)
    for (let x = 0; x < QR_SIZE; x++) if (!inFinder(x, y) && rand() > 0.52) d += `M${x} ${y}h1v1h-1z`;
  for (const [fx, fy] of [[0, 0], [QR_SIZE - 7, 0], [0, QR_SIZE - 7]])
    d += `M${fx} ${fy}h7v7h-7zM${fx + 1} ${fy + 1}v5h5v-5zM${fx + 2} ${fy + 2}h3v3h-3z`;
  return d;
})();

function QrCode({ className }: { className?: string }) {
  return (
    <svg viewBox={`-1 -1 ${QR_SIZE + 2} ${QR_SIZE + 2}`} className={className} shapeRendering="crispEdges">
      <rect x={-1} y={-1} width={QR_SIZE + 2} height={QR_SIZE + 2} fill="#fff" />
      <path d={QR_PATH} fill="#111318" fillRule="evenodd" />
    </svg>
  );
}

/* ─── Laptop: app chrome ─────────────────────────────────────────────────── */

const RAIL = [LayoutDashboard, MessageSquare, Users, ScanSearch, Kanban, Megaphone, Workflow, Zap, Bot];
type Screen = "connect" | "scraper" | "pipeline";
const RAIL_ACTIVE: Record<Screen, number> = { connect: -1, scraper: 3, pipeline: 4 };
const TITLES: Record<Screen, string> = { connect: "WhatsApp", scraper: "Lead Scraper", pipeline: "Lead Pipeline" };

export function ScanStoryLaptopScreen({ step }: { step: number }) {
  const screen: Screen = step <= 2 ? "connect" : step === 3 ? "scraper" : "pipeline";
  return (
    <div className="flex h-full bg-surface font-sans text-on-surface">
      <aside className="flex w-14 shrink-0 flex-col items-center gap-1.5 border-r border-outline-variant bg-surface-container-lowest py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/logo.png" alt="" className="mb-3 size-7 object-contain" />
        {RAIL.map((Icon, i) => (
          <span key={i} className={`grid size-9 place-items-center rounded-lg transition-colors ${i === RAIL_ACTIVE[screen] ? "bg-primary/15 text-primary-container" : "text-on-surface-variant"}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ))}
        <span className={`mt-auto grid size-9 place-items-center rounded-lg transition-colors ${screen === "connect" ? "bg-primary/15 text-primary-container" : "text-on-surface-variant"}`}>
          <Settings className="h-[18px] w-[18px]" />
        </span>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-outline-variant px-5">
          <p className="w-32 text-[15px] font-semibold">{TITLES[screen]}</p>
          <div className="flex h-8 w-72 items-center gap-2 rounded-lg bg-surface-container-low px-3 text-[12px] text-placeholder">
            <Search className="h-3.5 w-3.5" />
            Search contacts, chats, campaigns
          </div>
          <Bell className="ml-auto h-4 w-4 text-on-surface-variant" />
          <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">RK</span>
        </header>

        <div className="relative min-h-0 flex-1">
          {/* Crossfade (screens stacked), never wait-for-exit: if frames are
              throttled the next screen still shows instead of a blank one. */}
          <AnimatePresence initial={false}>
            <motion.div key={screen} {...fade} className="absolute inset-0">
              {screen === "connect" && <ConnectScreen step={step} />}
              {screen === "scraper" && <ScraperScreen />}
              {screen === "pipeline" && <PipelineScreen step={step} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* Settings > WhatsApp: the QR card, then "WhatsApp Connected". */
function ConnectScreen({ step }: { step: number }) {
  const connected = step >= 2;
  return (
    <div className="grid h-full place-items-start justify-center pt-8">
      <div className="w-[34rem] rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[#25D366]/15 text-[#1f9d55]">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold">WhatsApp Connection</p>
            <p className="text-[12px] text-on-surface-variant">Link your WhatsApp account to send and receive messages</p>
          </div>
        </div>

        {connected ? (
            <motion.div key="ok" initial={fade.initial} animate={fade.animate} transition={fade.transition} className="mt-8 flex flex-col items-center pb-6 text-center">
              <motion.span
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={springs.snappy}
                className="grid size-14 place-items-center rounded-full bg-success/15 text-success"
              >
                <Check className="h-7 w-7" strokeWidth={2.5} />
              </motion.span>
              <p className="mt-4 text-[17px] font-semibold">WhatsApp Connected</p>
              <p className="mt-1 text-[13px] tabular-nums text-on-surface-variant">+91 98400 31267</p>
              <span className="mt-3 rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">Connected</span>
              <span className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary-container px-4 py-2 text-[12px] font-semibold text-on-primary">
                Go to Inbox <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </motion.div>
          ) : (
            <motion.div key="qr" initial={false} className="mt-6 flex items-center gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className="relative rounded-xl border border-outline-variant bg-white p-3">
                  <QrCode className={`size-40 transition-opacity duration-300 ${step === 1 ? "opacity-40" : ""}`} />
                  {step === 1 && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-3 py-1.5 text-[11px] font-medium text-on-surface shadow">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-container" /> Linking device
                      </span>
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                  <svg viewBox="0 0 20 20" className="size-4 -rotate-90">
                    <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" className="stroke-outline-variant" />
                    <motion.circle
                      cx="10"
                      cy="10"
                      r="8"
                      fill="none"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="stroke-primary-container"
                      pathLength={1}
                      initial={{ pathLength: 1 }}
                      animate={{ pathLength: 0.62 }}
                      transition={{ duration: 3.8, ease: "linear" }}
                    />
                  </svg>
                  Expires in <span className="font-semibold tabular-nums text-on-surface">16s</span>
                </p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">How to connect</p>
                <ol className="mt-3 flex flex-col gap-3 text-[12px]">
                  {["Open WhatsApp on your phone", "Go to Settings, Linked Devices", "Tap “Link a Device” and scan the QR code"].map((t, i) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary-container">{i + 1}</span>
                      <span className="pt-0.5 leading-snug">{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </motion.div>
          )}
      </div>
    </div>
  );
}

const SOURCES = ["Google Maps", "Upwork Jobs", "Freelancer.in", "Truelancer", "LinkedIn Jobs"];
const RESULTS = [
  { name: "Bloom Bakery", area: "Anna Nagar", rating: "4.7", live: true },
  { name: "Crumbs & Co.", area: "Adyar", rating: "4.5", live: false },
  { name: "Kaapi Corner", area: "T. Nagar", rating: "4.4", live: false, done: true },
  { name: "Sugar Loaf Cakes", area: "Velachery", rating: "4.3", live: false },
];

/* Leads > Lead Scraper: a Google Maps run, Bloom Bakery gets added. */
function ScraperScreen() {
  return (
    <div className="flex h-full flex-col gap-4 px-6 py-5 pr-40">
      <div className="flex gap-1.5">
        {SOURCES.map((s, i) => (
          <span key={s} className={`rounded-full px-3 py-1 text-[11px] ${i === 0 ? "bg-primary/15 font-medium text-primary-container" : "bg-surface-container-low text-on-surface-variant"}`}>
            {s}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-[12px]">
        <MapPin className="h-4 w-4 text-primary-container" />
        Bakeries in Chennai
        <span className="ml-auto text-[11px] text-on-surface-variant">38 results</span>
      </div>
      <div className="flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {RESULTS.map((r, i) => (
          <div key={r.name} className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-outline-variant" : ""} ${r.live ? "bg-primary/[0.06]" : ""}`}>
            <span className="grid size-8 place-items-center rounded-lg bg-surface-container-high text-[11px] font-semibold text-on-surface-variant">
              {r.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[12px] font-medium">{r.name}</p>
              <p className="text-[11px] text-on-surface-variant">{r.area}</p>
            </div>
            <span className="flex items-center gap-1 text-[11px] text-on-surface-variant">
              <Star className="h-3 w-3 fill-current" /> {r.rating}
            </span>
            {r.live ? (
              <AddButton />
            ) : (
              <span className={`w-16 rounded-md py-1 text-center text-[11px] font-medium ${r.done ? "bg-success/15 text-success" : "bg-surface-container-high text-on-surface-variant"}`}>
                {r.done ? "Added" : "Add"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddButton() {
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAdded(true), 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.span
      key={added ? "added" : "add"}
      initial={{ scale: 0.85, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={springs.snappy}
      className={`flex w-16 items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium ${added ? "bg-success/15 text-success" : "bg-primary text-on-primary"}`}
    >
      {added ? <><Check className="h-3 w-3" /> Added</> : "Add"}
    </motion.span>
  );
}

const COLUMNS = ["New", "Contacted", "Interested", "Converted", "Closed"] as const;
const PIPE_CARDS: Record<(typeof COLUMNS)[number], { name: string; meta: string }[]> = {
  New: [{ name: "Crumbs & Co.", meta: "Google Maps" }],
  Contacted: [{ name: "Thread & Loom", meta: "Instagram ad" }],
  Interested: [{ name: "Mehta Dental", meta: "Referral" }],
  Converted: [{ name: "FitNest Studio", meta: "Upwork Jobs" }],
  Closed: [{ name: "Nila Organics", meta: "Truelancer" }],
};

/* Leads > Lead Pipeline: Bloom Bakery moves Contacted, then Interested. */
function PipelineScreen({ step }: { step: number }) {
  const column = step >= 6 ? "Interested" : "Contacted";
  const toast = step >= 6 ? "Arjun replied, moved to Interested" : "Template sent to Bloom Bakery";
  return (
    <div className="relative flex h-full flex-col px-5 py-4">
      <p className="text-[11px] text-on-surface-variant">Drag cards to update status</p>
      <LayoutGroup id="scan-story-pipeline">
        <div className="mt-3 grid min-h-0 flex-1 grid-cols-5 gap-2.5">
          {COLUMNS.map((col) => (
            <div key={col} className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-2">
              <p className="px-1 text-[11px] font-medium text-on-surface-variant">{col}</p>
              {column === col && (
                <motion.div layoutId="bloom" transition={springs.layout} className="rounded-lg border border-primary/50 bg-primary/12 p-2.5">
                  <p className="text-[12px] font-semibold">Bloom Bakery</p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant">Google Maps</p>
                </motion.div>
              )}
              {PIPE_CARDS[col].map((c) => (
                <div key={c.name} className="rounded-lg bg-surface-container-low p-2.5">
                  <p className="text-[12px] font-medium">{c.name}</p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant">{c.meta}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </LayoutGroup>
      <motion.p
        key={toast}
        initial={fade.initial}
        animate={fade.animate}
        transition={fade.transition}
        className="absolute bottom-5 left-5 flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-[12px] shadow-modal"
      >
        <CheckCheck className="h-4 w-4 text-success" /> {toast}
      </motion.p>
    </div>
  );
}

/* ─── Phone: WhatsApp's side ─────────────────────────────────────────────── */

export function ScanStoryPhone({ step }: { step: number }) {
  const screen = step === 1 ? "scan" : step <= 3 ? "devices" : "chat";
  return (
    <PhoneShell>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence initial={false}>
          <motion.div key={screen} {...fade} className="absolute inset-0 flex flex-col">
            {screen === "devices" && <LinkedDevices linked={step >= 2} />}
            {screen === "scan" && <Scanner />}
            {screen === "chat" && <Chat step={step} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PhoneShell>
  );
}

function PhoneHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 bg-[var(--wa-header)] px-2 text-[var(--wa-on-header)]">
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-label font-semibold">{title}</p>
        {sub && <p className="truncate text-caption font-normal opacity-75">{sub}</p>}
      </div>
      <MoreVertical className="h-4 w-4 shrink-0" />
    </div>
  );
}

/* WhatsApp > Settings > Linked devices. */
function LinkedDevices({ linked }: { linked: boolean }) {
  return (
    <>
      <PhoneHeader title="Linked devices" />
      <div className="flex flex-1 flex-col bg-[var(--wa-bg)] px-4 pt-6 text-[var(--wa-text)]">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--wa-in)] text-[var(--wa-accent)] shadow-sm">
          <MonitorSmartphone className="h-8 w-8" />
        </span>
        <p className="mt-3 text-center text-label font-medium">Use WhatsApp on other devices</p>
        <span className={`mt-4 rounded-full py-2 text-center text-label font-semibold text-white transition-transform ${linked ? "bg-[var(--wa-accent)]/60" : "scale-[0.97] bg-[var(--wa-accent)]"}`}>
          Link a device
        </span>
        <p className="mt-6 text-caption uppercase tracking-wide text-[var(--wa-meta)]">Device status</p>
        <AnimatePresence initial={false}>
          {linked ? (
            <motion.div key="wazelo" {...bubbleEnter} className="mt-2 flex items-center gap-3 rounded-lg bg-[var(--wa-in)] p-2.5 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo/logo.png" alt="" className="size-8 rounded-full bg-surface-container-lowest object-contain p-1" />
              <div className="leading-tight">
                <p className="text-label font-semibold">Wazelo</p>
                <p className="text-caption text-[var(--wa-label)]">Active now</p>
              </div>
            </motion.div>
          ) : (
            <motion.p key="none" exit={{ opacity: 0 }} className="mt-2 text-caption text-[var(--wa-meta)]">
              No linked devices yet
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* The camera view while scanning the laptop's QR. */
function Scanner() {
  return (
    <div className="relative flex flex-1 flex-col items-center bg-[#0b0d10] text-white">
      <div className="flex h-12 w-full items-center gap-2 px-3">
        <ArrowLeft className="h-4 w-4" />
        <p className="text-label font-semibold">Scan QR code</p>
      </div>
      <div className="relative mt-10 size-44">
        <QrCode className="size-full rounded-sm opacity-90" />
        {/* viewfinder corners */}
        {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
          <span key={c} className={`absolute -m-2 size-7 rounded-sm border-[var(--wa-accent)] ${c}`} />
        ))}
        <motion.span
          className="absolute inset-x-0 h-0.5 bg-[var(--wa-accent)] shadow-[0_0_12px_2px_var(--wa-accent)]"
          initial={{ top: "0%" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
        />
      </div>
      <p className="mt-8 flex items-center gap-1.5 px-6 text-center text-caption text-white/70">
        <ScanLine className="h-3.5 w-3.5 shrink-0" /> Point your phone at the QR on your computer
      </p>
    </div>
  );
}

/* The chat as it appears on Riya's phone: Wazelo sends from her number. */
function Chat({ step }: { step: number }) {
  return (
    <>
      <PhoneHeader title="Bloom Bakery" sub={step === 5 ? "typing…" : "Arjun Mehta"} />
      <div className="wa-wallpaper flex flex-1 flex-col justify-end gap-1.5 overflow-hidden px-2.5 py-3">
        <span className="mb-1 self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption font-normal uppercase text-[var(--wa-meta)] shadow-sm">Today</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key="t" layout {...bubbleEnter} className="flex flex-col">
            <Outgoing>
              Hi Arjun, I&apos;m Riya, a web designer in Chennai. Saw Bloom Bakery on Google Maps. Can I share a few website ideas?
              <Time read={step >= 5}>10:42</Time>
            </Outgoing>
          </motion.div>
          {step === 5 && (
            <motion.div key="typing" layout {...bubbleEnter} className="flex flex-col">
              <TypingBubble />
            </motion.div>
          )}
          {step >= 6 && (
            <motion.div key="r" layout {...bubbleEnter} className="flex flex-col">
              <Incoming>
                Yes please! We need online orders too.
                <Time>10:44</Time>
              </Incoming>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex h-12 shrink-0 items-center bg-[var(--wa-bg)] px-2">
        <div className="flex h-9 flex-1 items-center rounded-full bg-[var(--wa-input)] px-3 text-label text-[var(--wa-meta)] shadow-sm">Message</div>
      </div>
    </>
  );
}
