/**
 * Product tour definitions. A tour belongs to one screen; each step points at a
 * real element (by `data-tour` name or CSS selector) or shows as a centred card.
 */

export type TourRole = "ADMIN" | "MANAGER" | "EMPLOYEE";

/** Which layout a step is for. Mobile = below 1024px (phones and tablets). */
export type TourSurface = "desktop" | "mobile";

/** A small worked example drawn inside the step card. */
export type TourExample =
  /** A short WhatsApp-style exchange */
  | { kind: "chat"; messages: { from: "customer" | "you" | "bot"; text: string }[] }
  /** A message template: raw text with {{variables}}, and how a customer sees it */
  | { kind: "template"; name?: string; body: string; preview: string }
  /** Numbered how-to */
  | { kind: "steps"; items: string[] }
  /** A sample record, e.g. a contact */
  | { kind: "fields"; rows: [label: string, value: string][] }
  /** A chain, e.g. trigger → condition → action */
  | { kind: "flow"; nodes: string[] }
  /** Small labelled chips, e.g. statuses */
  | { kind: "chips"; items: string[] }
  /** One line of advice */
  | { kind: "tip"; text: string };

export interface TourStep {
  /**
   * Element to highlight: one or more `data-tour` names (or CSS selectors), tried in
   * order; the first visible one wins. Leave out for a centred card.
   */
  target?: string | string[];
  title: string;
  body: string;
  example?: TourExample;
  /** Only show on this layout */
  only?: TourSurface;
  /** If set, the step is shown only to these roles */
  roles?: TourRole[];
  /** Card side on desktop. Default: below, else above, right, left. */
  placement?: "top" | "bottom" | "left" | "right";
  /**
   * When the element isn't on screen (empty account, nothing selected): skip the step
   * (default) or still explain it in a centred card.
   */
  ifMissing?: "skip" | "center";
}

export interface TourDef {
  id: string;
  /** Raise when the steps change in a way people should see again */
  version: number;
  title: string;
  /** One line for the Tours page */
  summary: string;
  /** Group on the Tours page */
  section: string;
  /** Where "Start" goes. Detail tours point at their list page and start on the detail screen. */
  startHref: string;
  /** Detail tours: what to open before the tour can run, e.g. "Open any contact" */
  startHint?: string;
  /** The screens this tour runs on */
  match: (pathname: string, search: URLSearchParams) => boolean;
  /** Shown only if the user can see this nav item (role, plan, org type). Omit = everyone. */
  navHref?: string;
  /** Extra role filter for tours without a nav item */
  roles?: TourRole[];
  /** Only for this org type */
  orgType?: "FREELANCER" | "TEAM";
  /** Start by itself the first time the screen opens (default true) */
  auto?: boolean;
  steps: TourStep[];
}

export interface TourProgressEntry {
  tourId: string;
  version: number;
  status: "completed" | "skipped";
  updatedAt: string;
}
