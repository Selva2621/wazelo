import type { TourDef } from "./types";
import { coreTours } from "./content/core";
import { messagingTours } from "./content/messaging";
import { salesTours } from "./content/sales";
import { marketingTours } from "./content/marketing";
import { automationTours } from "./content/automation";
import { settingsTours } from "./content/settings";
import { adminTours } from "./content/admin";

/** Every product tour, in Tours-page order */
export const TOURS: TourDef[] = [
  ...coreTours,
  ...messagingTours,
  ...salesTours,
  ...marketingTours,
  ...automationTours,
  ...settingsTours,
  ...adminTours,
];

export const WELCOME_TOUR_ID = "welcome";

export function getTour(id: string | null | undefined): TourDef | undefined {
  return id ? TOURS.find((t) => t.id === id) : undefined;
}

/** The screen tour for this route (never the app-wide welcome tour) */
export function tourForRoute(tours: TourDef[], pathname: string, search: URLSearchParams) {
  return tours.find((t) => t.id !== WELCOME_TOUR_ID && t.match(pathname, search));
}
