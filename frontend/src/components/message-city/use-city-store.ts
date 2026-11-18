"use client";

import { create } from "zustand";
import type { CityPlace } from "./city-config";

export interface CityPacket {
  id: number;
  /** A channel shop, or "LEADS" for a new lead heading to the dock */
  channel: CityPlace;
  /** in = toward the Inbox HQ (or the dock), out = a reply leaving the HQ */
  direction: "in" | "out";
}

/** One line in the live feed */
export interface CityEvent {
  id: number;
  text: string;
  /** CSS colour for the dot (a channel token or the brand colour) */
  color: string;
  at: number;
}

interface CityState {
  selected: CityPlace | null;
  hovered: CityPlace | null;
  /** Timeline bar under the pointer (0–23), shown in the HUD */
  hoveredHour: number | null;
  /** Packets waiting to be picked up by the scene (it drains them each frame) */
  pending: CityPacket[];
  /** Newest first */
  events: CityEvent[];
  select: (key: CityPlace | null) => void;
  hover: (key: CityPlace | null) => void;
  hoverHour: (hour: number | null) => void;
  pushPacket: (channel: CityPlace, direction: "in" | "out") => void;
  pushEvent: (text: string, color: string) => void;
  drainPackets: () => CityPacket[];
}

let nextId = 1;
/** Bursts (a campaign going out) would flood the streets: keep the queue short */
const MAX_PENDING = 24;
const MAX_EVENTS = 6;

export const useCityStore = create<CityState>()((set, get) => ({
  selected: null,
  hovered: null,
  hoveredHour: null,
  pending: [],
  events: [],
  select: (selected) => set({ selected }),
  hover: (hovered) => set({ hovered }),
  hoverHour: (hoveredHour) => set({ hoveredHour }),
  pushEvent: (text, color) =>
    set((s) => ({ events: [{ id: nextId++, text, color, at: Date.now() }, ...s.events].slice(0, MAX_EVENTS) })),
  pushPacket: (channel, direction) =>
    set((s) => ({
      pending: [...s.pending, { id: nextId++, channel, direction }].slice(-MAX_PENDING),
    })),
  drainPackets: () => {
    const out = get().pending;
    if (out.length) set({ pending: [] });
    return out;
  },
}));

// Dev only: send test traffic from the console, e.g.
// __messageCity.getState().pushPacket("WHATSAPP", "in")  or  pushPacket("LEADS", "in")
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as unknown as { __messageCity: typeof useCityStore }).__messageCity = useCityStore;
}
