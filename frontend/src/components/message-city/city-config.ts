import type { LiveChannelKey, LiveChannelStat } from "@/lib/types/analytics";

/**
 * Message City: a miniature town square on an 11×11 tile diorama.
 * Inbox HQ in the plaza, a ring road around it, one shop per channel just
 * outside the ring, houses and trees around the edge. 1 unit = 1 road tile.
 * Models: Kenney city/car/nature kits (CC0), in /public/models/town.
 */

export type Vec2 = [x: number, z: number];

export const model = (kit: "commercial" | "roads" | "suburban" | "cars" | "nature", name: string) =>
  `/models/town/${kit}/${name}.glb`;

export interface CityChannel {
  key: LiveChannelKey;
  label: string;
  /** CSS variable holding the colour (design tokens, follows the theme) */
  colorVar: `--chart-${1 | 2 | 3 | 4 | 5}`;
  position: Vec2;
  /** Y rotation so the shop front faces the plaza (models face +z) */
  facing: number;
  /** Delivery route from the shop front to the HQ door */
  route: Vec2[];
}

const PI = Math.PI;

export const CITY_CHANNELS: CityChannel[] = [
  {
    key: "WHATSAPP",
    label: "WhatsApp",
    colorVar: "--chart-3",
    position: [0, 3.2],
    facing: PI,
    route: [[0, 2.45], [0, 2], [0, 1.3], [0, 0.9]],
  },
  {
    key: "WEBSITE",
    label: "Website chat",
    colorVar: "--chart-5",
    position: [3.2, 0],
    facing: -PI / 2,
    route: [[2.45, 0], [2, 0], [1.3, 0], [0.9, 0]],
  },
  {
    key: "FACEBOOK_MESSENGER",
    label: "Messenger",
    colorVar: "--chart-2",
    position: [0, -3.2],
    facing: 0,
    route: [[0, -2.45], [0, -2], [0, -1.3], [0, -0.9]],
  },
  {
    key: "INSTAGRAM",
    label: "Instagram",
    colorVar: "--chart-4",
    position: [-3.2, 0],
    facing: PI / 2,
    route: [[-2.45, 0], [-2, 0], [-1.3, 0], [-0.9, 0]],
  },
  {
    key: "EMAIL",
    label: "Email",
    colorVar: "--chart-1",
    position: [-3.35, -3.35],
    facing: PI / 4,
    route: [[-2.6, -2.6], [-2, -2], [-1.25, -1.25], [-0.8, -0.8]],
  },
];

export const channelConfig = (key: LiveChannelKey) => CITY_CHANNELS.find((c) => c.key === key)!;

/** Leads arrive at a loading dock on the front-right corner; a truck drives in off the ring road */
export const LEADS_DOCK = {
  position: [3.25, 3.25] as Vec2,
  /** Faces the ring-road corner */
  facing: -(3 * PI) / 4,
  route: [[2, 0.4], [2, 1.55], [2.4, 2.4], [2.85, 2.85]] as Vec2[],
};

/** Reply speed: always shown with a word (never colour alone) */
export type ReplyLevel = "fast" | "ok" | "slow" | "none";

export function replyLevel(minutes: number | null | undefined): ReplyLevel {
  if (minutes === null || minutes === undefined) return "none";
  if (minutes < 5) return "fast";
  if (minutes < 30) return "ok";
  return "slow";
}

export const REPLY_WORD: Record<ReplyLevel, string> = {
  fast: "Fast",
  ok: "OK",
  slow: "Slow",
  none: "No replies yet",
};

/** "4 min", "1 h 20 min" */
export function formatMinutes(m: number) {
  if (m < 1) return "under 1 min";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const rest = Math.round(m % 60);
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

/** "9 am", "12 pm" */
export const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "am" : "pm"}`;

/** Everything you can click in town: a channel shop or the leads dock */
export type CityPlace = LiveChannelKey | "LEADS";

export const totalOf = (s: Pick<LiveChannelStat, "inbound" | "outbound">) => s.inbound + s.outbound;

/** More messages today → a bigger building (each tier is a real model with more floors) */
export const SHOP_TIERS = [
  { min: 0, model: model("commercial", "building-c"), height: 0.89 },
  { min: 1, model: model("commercial", "building-a"), height: 1.29 },
  { min: 25, model: model("commercial", "building-g"), height: 1.69 },
  { min: 100, model: model("commercial", "building-l"), height: 2.27 },
  { min: 500, model: model("commercial", "building-m"), height: 3.15 },
] as const;

export function shopTier(total: number) {
  let tier: (typeof SHOP_TIERS)[number] = SHOP_TIERS[0];
  for (const t of SHOP_TIERS) if (total >= t.min) tier = t;
  return tier;
}

/** The Inbox: always the tallest building in town */
export const HQ_MODEL = model("commercial", "building-skyscraper-d");
/** Shown at 80%: still taller than the biggest shop (3.15) without towering over the board */
export const HQ_SCALE = 0.8;
export const HQ_HEIGHT = 5.47 * HQ_SCALE;

/** Half-size of the diorama base */
export const BASE_HALF = 5.6;
/** Ring road: tiles where max(|x|,|z|) = RING */
export const RING = 2;

export const VEHICLE_SCALE = 0.23;

export const ALL_MODELS = [
  ...SHOP_TIERS.map((t) => t.model),
  HQ_MODEL,
  model("commercial", "detail-parasol-a"),
  model("commercial", "detail-parasol-b"),
  model("roads", "road-straight"),
  model("roads", "road-bend"),
  model("roads", "tile-low"),
  model("roads", "light-curved"),
  model("suburban", "building-type-a"),
  model("suburban", "building-type-c"),
  model("suburban", "building-type-h"),
  model("suburban", "building-type-m"),
  model("suburban", "building-type-q"),
  model("suburban", "tree-large"),
  model("suburban", "tree-small"),
  model("suburban", "planter"),
  model("suburban", "fence-1x3"),
  model("cars", "van"),
  model("cars", "delivery"),
  model("cars", "sedan"),
  model("cars", "taxi"),
  model("nature", "tree_oak"),
  model("nature", "tree_default"),
  model("nature", "tree_detailed"),
  model("nature", "plant_bushDetailed"),
  model("nature", "flower_redA"),
  model("nature", "flower_yellowA"),
];
