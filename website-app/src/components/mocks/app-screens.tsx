"use client";

// Mini Wazelo app screens for the laptop mock, laid out on a fixed 960x600
// canvas (see LaptopFrame). They mirror the real app's structure: icon rail,
// freelancer dashboard with pipeline, and the team shared inbox.

import { useEffect, useId, useState, type ComponentType } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  MapPin,
  Megaphone,
  Paperclip,
  Repeat,
  ScanSearch,
  Search,
  SendHorizontal,
  Settings,
  Sparkles,
  Star,
  Users,
  Workflow,
  UserCheck,
} from "lucide-react";
import { springs } from "@/components/mocks/motion";
import { ListingIllustration } from "@/components/mocks/illustrations";
import { freelancerStory, teamStory, visibleItems } from "@/components/home/stories";

type IconType = ComponentType<{ className?: string }>;

/* ─── Shared chrome ──────────────────────────────────────────────────────── */

function Rail({ items, active }: { items: IconType[]; active: number }) {
  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1.5 border-r border-outline-variant bg-surface-container-lowest py-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/logo.png" alt="" className="mb-3 size-7 object-contain" />
      {items.map((Icon, i) => (
        <span
          key={i}
          className={`grid size-9 place-items-center rounded-lg ${
            i === active ? "bg-primary/15 text-primary-container" : "text-on-surface-variant"
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
      ))}
      <span className="mt-auto grid size-9 place-items-center rounded-lg text-on-surface-variant">
        <Settings className="h-[18px] w-[18px]" />
      </span>
    </aside>
  );
}

function TopBar({ title, initials }: { title: string; initials: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-4 border-b border-outline-variant px-5">
      <p className="text-[15px] font-semibold text-on-surface">{title}</p>
      <div className="ml-6 flex h-8 w-64 items-center gap-2 rounded-lg bg-surface-container-low px-3 text-[12px] text-placeholder">
        <Search className="h-3.5 w-3.5" />
        Search
      </div>
      <Bell className="ml-auto h-4 w-4 text-on-surface-variant" />
      <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">{initials}</span>
    </header>
  );
}

/** Flips to true `delay` ms after `when` turns true; resets when it turns false. */
function useDelayedFlag(when: boolean, delay: number) {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (!when) {
      setFlag(false);
      return;
    }
    const t = setTimeout(() => setFlag(true), delay);
    return () => clearTimeout(t);
  }, [when, delay]);
  return flag;
}

/* ─── Freelancer dashboard ───────────────────────────────────────────────── */

const COLUMNS = ["New", "Contacted", "Interested", "Converted", "Closed"] as const;
const STATIC_CARDS: Record<(typeof COLUMNS)[number], { name: string; meta: string }[]> = {
  New: [{ name: "Kaapi Corner", meta: "Café · Google Maps" }],
  Contacted: [{ name: "Thread & Loom", meta: "Boutique · CSV import" }],
  Interested: [{ name: "Mehta Dental", meta: "Clinic · Referral" }],
  Converted: [{ name: "FitNest Studio", meta: "Gym · Upwork" }],
  Closed: [{ name: "Nila Organics", meta: "Website · Closed" }],
};
/** One entry per story beat; beat N also moves Bloom Bakery to COLUMNS[N]. */
const ACTIVITY = [
  "Bloom Bakery imported from Google Maps",
  "Intro template sent to Arjun",
  "Call booked, moved to Interested",
  "Arjun replied, sequence stopped. Moved to Converted",
  "Site delivered. Moved to Closed",
];

export function FreelancerScreen({ beat, revealed }: { beat: number; revealed: number }) {
  // Beat 0 has no chat: the lead is added from the scraper shortly after it starts.
  // Namespaces the card's layoutId: several screens can be on the page at once.
  const groupId = useId();
  const added = useDelayedFlag(beat === 0, 900) || beat > 0;
  const column = added ? COLUMNS[beat] : null;
  const activity = ACTIVITY.slice(0, added ? beat + 1 : 0).reverse();
  const items = visibleItems(freelancerStory, beat, revealed);

  const kpis = [
    { label: "Total leads", value: added ? 39 : 38 },
    { label: "Open conversations", value: items.length > 0 ? 7 : 6 },
    { label: "Proposals sent", value: beat >= 2 ? 14 : 13 },
    { label: "Closed this month", value: beat >= 4 ? 4 : 3 },
  ];

  return (
    <div className="flex h-full bg-surface font-sans text-on-surface">
      <Rail items={[LayoutDashboard, Inbox, Users, ScanSearch, KanbanSquare, Megaphone, Repeat]} active={0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title="Good morning, Riya" initials="RK" />
        <div className="grid grid-cols-4 gap-3 px-5 pt-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
              <p className="text-[11px] text-on-surface-variant">{k.label}</p>
              <motion.p key={k.value} initial={{ opacity: 0.3, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-1 text-[22px] font-semibold tabular-nums">
                {k.value}
              </motion.p>
            </div>
          ))}
        </div>

        <div className="flex min-h-0 flex-1 gap-3 px-5 py-4">
          {/* pipeline */}
          <LayoutGroup id={groupId}>
            <div className="grid min-w-0 flex-1 grid-cols-5 gap-2">
              {COLUMNS.map((col) => (
                <div key={col} className="flex flex-col gap-2 rounded-xl bg-surface-container-lowest p-2">
                  <p className="px-1 text-[11px] font-medium text-on-surface-variant">{col}</p>
                  {column === col && (
                    <motion.div
                      layoutId="bloom-card"
                      transition={springs.layout}
                      className="rounded-lg border border-primary/50 bg-primary/12 p-2"
                    >
                      <p className="text-[12px] font-semibold">Bloom Bakery</p>
                      <p className="mt-0.5 text-[10px] text-on-surface-variant">Bakery · Google Maps</p>
                      {beat >= 2 && <p className="mt-1.5 text-[10px] font-medium text-primary-container">Website project</p>}
                    </motion.div>
                  )}
                  {STATIC_CARDS[col].map((c) => (
                    <div key={c.name} className="rounded-lg bg-surface-container-low p-2">
                      <p className="text-[12px] font-medium">{c.name}</p>
                      <p className="mt-0.5 text-[10px] text-on-surface-variant">{c.meta}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </LayoutGroup>

          {/* scraper + activity */}
          <div className="flex w-[250px] shrink-0 flex-col gap-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
              <div className="flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-primary-container" />
                <p className="text-[12px] font-semibold">Lead Scraper</p>
                <span className="ml-auto rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] text-on-surface-variant">Google Maps</span>
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-on-surface-variant">
                <MapPin className="h-3 w-3" /> Bakeries in Chennai
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {[
                  { name: "Bloom Bakery", rating: "4.7", live: true },
                  { name: "Crumbs & Co.", rating: "4.5", live: false },
                  { name: "Kaapi Corner", rating: "4.4", live: false, done: true },
                ].map((r) => {
                  const isAdded = r.done || (r.live && added);
                  return (
                    <div key={r.name} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${r.live && beat === 0 ? "bg-primary/10" : "bg-surface-container-low"}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium">{r.name}</p>
                        <p className="flex items-center gap-0.5 text-[10px] text-on-surface-variant">
                          <Star className="h-2.5 w-2.5 fill-current" /> {r.rating}
                        </p>
                      </div>
                      <span
                        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium ${
                          isAdded ? "bg-success/15 text-success" : "bg-primary text-on-primary"
                        }`}
                      >
                        {isAdded ? <><Check className="h-3 w-3" /> Added</> : "Add"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
              <p className="text-[12px] font-semibold">Activity</p>
              <div className="mt-2 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {activity.map((a) => (
                    <motion.p
                      key={a}
                      layout
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={springs.gentle}
                      className="flex items-start gap-2 text-[11px] leading-snug text-on-surface-variant"
                    >
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary-container" />
                      {a}
                    </motion.p>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Team shared inbox ──────────────────────────────────────────────────── */

const OTHER_CHATS = [
  { name: "Sneha Patil", text: "Is covered parking included?", time: "19:40", owner: "AV" },
  { name: "Rohit Kulkarni", text: "Sent the documents", time: "19:12", owner: "MJ" },
  { name: "Anjali Rao", text: "Thanks, will confirm by Monday", time: "18:55", owner: "SK" },
  { name: "Vikram Shah", text: "Can we discuss the price?", time: "18:31", owner: "AV" },
  { name: "Pooja Nair", text: "Is there a clubhouse?", time: "17:50", owner: "SK" },
];

function initialsOf(name: string) {
  return name.split(" ").map((p) => p[0]).join("");
}

export function TeamScreen({ beat, revealed }: { beat: number; revealed: number }) {
  const items = visibleItems(teamStory, beat, revealed);
  const notes = items.flatMap(({ item }) => (item.kind === "note" ? [item.text] : []));
  const has = (start: string) => notes.some((n) => n.startsWith(start));
  const assigned = has("Auto-assigned");
  const interested = has("Lead status");
  const resolved = has("CSAT");
  const last = items[items.length - 1]?.item;
  const drafting = last?.kind === "typing";
  const messages = items.filter(({ item }) => item.kind !== "press" && item.kind !== "typing");
  const lastText = [...messages].reverse().find(({ item }) => "text" in item && item.kind !== "note")?.item;
  const arrived = messages.length > 0;

  return (
    <div className="flex h-full bg-surface font-sans text-on-surface">
      <Rail items={[Inbox, Users, KanbanSquare, Megaphone, Repeat, Workflow]} active={0} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title="Inbox" initials="MJ" />
        <div className="flex min-h-0 flex-1">
          {/* conversation list */}
          <div className="flex w-[250px] shrink-0 flex-col border-r border-outline-variant">
            <div className="flex gap-1 px-3 py-2.5 text-[11px]">
              {[["All", arrived ? 24 : 23], ["Unread", arrived && !assigned ? 3 : 2], ["Mine", assigned ? 7 : 6]].map(([label, n], i) => (
                <span key={label} className={`rounded-md px-2 py-1 ${i === 0 ? "bg-primary/15 text-primary-container" : "text-on-surface-variant"}`}>
                  {label} <span className="tabular-nums opacity-70">{n}</span>
                </span>
              ))}
            </div>
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {arrived && (
                  <motion.div
                    key="kunal"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={springs.gentle}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 border-l-2 border-primary-container bg-surface-container-low px-3 py-2.5">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-chart-2/25 text-[11px] font-semibold text-chart-2">KD</span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center justify-between text-[12px] font-semibold">
                          Kunal Deshpande <span className="text-[10px] font-normal text-on-surface-variant">{lastText && "time" in lastText ? lastText.time : ""}</span>
                        </p>
                        <p className="truncate text-[11px] text-on-surface-variant">{lastText && "text" in lastText ? lastText.text : ""}</p>
                      </div>
                      {!assigned && <span className="grid size-4 place-items-center rounded-full bg-primary-container text-[9px] font-bold text-on-primary">1</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {OTHER_CHATS.map((c) => (
                <div key={c.name} className="flex items-center gap-2.5 px-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-container-high text-[11px] font-semibold text-on-surface-variant">
                    {initialsOf(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center justify-between text-[12px] font-medium">
                      {c.name} <span className="text-[10px] font-normal text-on-surface-variant">{c.time}</span>
                    </p>
                    <p className="truncate text-[11px] text-on-surface-variant">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* thread */}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-outline-variant px-4">
              <span className="grid size-8 place-items-center rounded-full bg-chart-2/25 text-[11px] font-semibold text-chart-2">KD</span>
              <div className="leading-tight">
                <p className="text-[12px] font-semibold">Kunal Deshpande</p>
                <p className="text-[10px] text-on-surface-variant">via property ad</p>
              </div>
              <motion.span
                key={assigned ? "meera" : "none"}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springs.snappy}
                className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  assigned ? "bg-primary/15 text-primary-container" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <UserCheck className="h-3 w-3" />
                {assigned ? "Meera J." : "Unassigned"}
              </motion.span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${resolved ? "bg-success/15 text-success" : "bg-surface-container-high text-on-surface-variant"}`}>
                {resolved ? "Closed" : "Open"}
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden px-4 py-3">
              {!arrived && <p className="self-center text-[12px] text-on-surface-variant">No conversation selected</p>}
              <AnimatePresence mode="popLayout" initial={false}>
                {messages.map(({ key, item }) => {
                  if (item.kind === "note") {
                    return (
                      <motion.p key={key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-center rounded-full bg-surface-container-low px-3 py-1 text-[10px] text-on-surface-variant">
                        {item.text}
                      </motion.p>
                    );
                  }
                  if (item.kind === "customer") {
                    return (
                      <motion.div key={key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springs.gentle} className="max-w-[70%] self-start rounded-xl rounded-tl-sm bg-surface-container-high px-3 py-2 text-[12px]">
                        {item.text}
                        <span className="ml-2 text-[10px] text-on-surface-variant">{item.time}</span>
                      </motion.div>
                    );
                  }
                  if (item.kind === "biz" || item.kind === "rich") {
                    return (
                      <motion.div key={key} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={springs.gentle} className="max-w-[70%] self-end overflow-hidden rounded-xl rounded-tr-sm bg-bubble-out text-[12px] text-on-bubble-out">
                        {item.kind === "rich" && <ListingIllustration className="aspect-[3/1] w-full" />}
                        <p className="px-3 py-2">
                          {item.text}
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] opacity-70">
                            {item.time} <CheckCheck className="h-3 w-3" />
                          </span>
                        </p>
                        {item.kind === "rich" && (
                          <p className="flex items-center gap-1 border-t border-ink/10 px-3 py-1.5 text-[10px] opacity-80">
                            <Paperclip className="h-3 w-3" /> Baner-Heights-2BHK.pdf
                          </p>
                        )}
                      </motion.div>
                    );
                  }
                  return null;
                })}
              </AnimatePresence>
            </div>

            {/* AI draft, then composer */}
            <AnimatePresence initial={false}>
              {drafting && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mx-4 mb-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2"
                >
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold text-primary-container">
                    <Sparkles className="h-3 w-3" /> AI suggested reply
                  </p>
                  <p className="mt-1 text-[11px] text-on-surface">Yes, it&apos;s available! 2BHK, 1,050 sq ft, ₹78 L. Want to visit this weekend?</p>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mx-4 mb-3 flex h-10 items-center gap-2 rounded-xl bg-surface-container-low px-3 text-[12px] text-placeholder">
              <Paperclip className="h-4 w-4" />
              <span className="flex-1">Type a message…</span>
              <SendHorizontal className="h-4 w-4 text-primary-container" />
            </div>
          </div>

          {/* contact panel */}
          <div className="flex w-[210px] shrink-0 flex-col gap-4 border-l border-outline-variant px-4 py-4">
            <div className="flex flex-col items-center gap-1.5">
              <span className="grid size-12 place-items-center rounded-full bg-chart-2/25 text-[14px] font-semibold text-chart-2">KD</span>
              <p className="text-[13px] font-semibold">Kunal Deshpande</p>
              <motion.span
                key={interested ? "interested" : assigned ? "contacted" : "new"}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={springs.snappy}
                className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-medium text-primary-container"
              >
                {interested ? "Interested" : assigned ? "Contacted" : "New"}
              </motion.span>
            </div>
            <dl className="flex flex-col gap-2.5 text-[11px]">
              {[
                ["Source", "Property ad"],
                ["Assigned to", assigned ? "Meera Joshi" : "None"],
                ["Notes", "Wants a 2BHK in Baner"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-on-surface-variant">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p className="text-[11px] text-on-surface-variant">Tags</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {["Baner", "2BHK", ...(interested ? ["Site visit"] : [])].map((t) => (
                  <span key={t} className="rounded-md bg-surface-container-high px-1.5 py-0.5 text-[10px] text-on-surface-variant">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] text-on-surface-variant">CSAT</p>
              <div className="mt-1 flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${resolved ? "fill-primary-container text-primary-container" : "text-outline"}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
