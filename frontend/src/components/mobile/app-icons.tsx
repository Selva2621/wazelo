import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Home-screen style app icons for the mobile shortcut grid: a filled white glyph on a
 * gradient squircle, one per page. Glyphs are drawn on a 24×24 grid; darker details
 * use black at low opacity so they pick up the tile's colour.
 */

const SHADE = { fill: "#000", fillOpacity: 0.2 } as const;
const SHADE_STROKE = { stroke: "#000", strokeOpacity: 0.22, fill: "none", strokeLinecap: "round" } as const;

interface IconDef {
  from: string;
  to: string;
  glyph: ReactNode;
}

const person = (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5v.5H4z" />
  </>
);

const group = (
  <>
    <circle cx="16.5" cy="8.5" r="3" opacity=".6" />
    <path d="M15.6 13.6c3.6.1 6.4 2 6.4 5.4v1h-4.6v-1c0-2.2-.7-4-1.8-5.4z" opacity=".6" />
    <circle cx="9" cy="8" r="3.6" />
    <path d="M2 19.3c0-3.4 3.1-5.6 7-5.6s7 2.2 7 5.6v.7H2z" />
  </>
);

const shield = "M12 2.5 4 5.6v6c0 5 3.4 8.8 8 9.9 4.6-1.1 8-4.9 8-9.9v-6z";

const ICONS: Record<string, IconDef> = {
  "/inbox": {
    from: "#34d399",
    to: "#059669",
    glyph: (
      <>
        <path d="M12 3C6.5 3 2 6.6 2 11.1c0 2.4 1.3 4.6 3.4 6.1L4.6 21l4.3-2.2c1 .3 2 .4 3.1.4 5.5 0 10-3.6 10-8.1S17.5 3 12 3z" />
        <circle cx="7.6" cy="11.1" r="1.3" {...SHADE} />
        <circle cx="12" cy="11.1" r="1.3" {...SHADE} />
        <circle cx="16.4" cy="11.1" r="1.3" {...SHADE} />
      </>
    ),
  },
  "/contacts": { from: "#60a5fa", to: "#2563eb", glyph: group },
  "/leads/scraper": {
    from: "#a78bfa",
    to: "#7c3aed",
    glyph: (
      <>
        <circle cx="10.5" cy="10.5" r="6.3" fill="#fff" fillOpacity=".3" stroke="#fff" strokeWidth="2.6" />
        <path d="M15.3 15.3 20.6 20.6" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="10.5" cy="9" r="1.9" />
        <path d="M7.2 13.6c.5-1.5 1.8-2.3 3.3-2.3s2.8.8 3.3 2.3a4.6 4.6 0 0 1-6.6 0z" />
      </>
    ),
  },
  "/leads/pipeline": {
    from: "#818cf8",
    to: "#4f46e5",
    glyph: (
      <>
        <rect x="3" y="3.5" width="5" height="17" rx="1.8" />
        <rect x="9.5" y="3.5" width="5" height="12" rx="1.8" opacity=".85" />
        <rect x="16" y="3.5" width="5" height="7.5" rx="1.8" opacity=".65" />
      </>
    ),
  },
  "/deals": {
    from: "#fbbf24",
    to: "#d97706",
    glyph: (
      <>
        <path d="M9 7.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v1.7" fill="none" stroke="#fff" strokeWidth="2" />
        <rect x="2.5" y="7.5" width="19" height="12.5" rx="2.8" />
        <rect x="2.5" y="12" width="19" height="1.6" {...SHADE} />
        <rect x="10.4" y="10.8" width="3.2" height="4" rx=".9" />
      </>
    ),
  },
  "/proposals": {
    from: "#2dd4bf",
    to: "#0d9488",
    glyph: (
      <>
        <path d="M6.5 2.5h7.3L19.5 8v11.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z" />
        <path d="M13.8 2.5v4a1.5 1.5 0 0 0 1.5 1.5h4.2z" {...SHADE} />
        <rect x="7.5" y="11" width="9" height="1.5" rx=".75" {...SHADE} />
        <rect x="7.5" y="14" width="6" height="1.5" rx=".75" {...SHADE} />
        <path d="M7.6 18.6c.9-1.2 1.7-1.2 2.2 0s1.3 1.2 2.3 0" strokeWidth="1.3" {...SHADE_STROKE} />
      </>
    ),
  },
  "/settings/products": {
    from: "#a3e635",
    to: "#4d7c0f",
    glyph: (
      <>
        <path d="M12 2.2 21 6.6 12 11 3 6.6z" />
        <path d="M3 6.6 12 11v10.8l-9-4.4z" opacity=".72" />
        <path d="M21 6.6 12 11v10.8l9-4.4z" opacity=".88" />
      </>
    ),
  },
  "/campaigns": {
    from: "#f472b6",
    to: "#db2777",
    glyph: (
      <>
        <path d="M4 9.2h3.2L15 4.6v14.8l-7.8-4.6H4a1.5 1.5 0 0 1-1.5-1.5v-2.6A1.5 1.5 0 0 1 4 9.2z" />
        <path d="M7.4 15 8.6 19.3a1.2 1.2 0 0 0 1.2.9h.8a1 1 0 0 0 1-1.3l-1-3.4z" opacity=".8" />
        <path d="M18.2 9.3a3.8 3.8 0 0 1 0 5.4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  "/sequences": {
    from: "#38bdf8",
    to: "#0284c7",
    glyph: (
      <>
        <path
          d="M5 6h7a3 3 0 0 1 0 6H12a3 3 0 0 0 0 6h7"
          fill="none"
          stroke="#fff"
          strokeOpacity=".6"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="5" cy="6" r="2.6" />
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="19" cy="18" r="2.6" />
      </>
    ),
  },
  "/settings/templates": {
    from: "#22d3ee",
    to: "#0e7490",
    glyph: (
      <>
        <rect x="7" y="2.5" width="14" height="14" rx="2.6" opacity=".5" />
        <rect x="3" y="7" width="14" height="14.5" rx="2.6" />
        <rect x="6" y="11" width="8" height="1.5" rx=".75" {...SHADE} />
        <rect x="6" y="14.2" width="8" height="1.5" rx=".75" {...SHADE} />
        <rect x="6" y="17.4" width="5" height="1.5" rx=".75" {...SHADE} />
      </>
    ),
  },
  "/automation": {
    from: "#fb923c",
    to: "#ea580c",
    glyph: <path d="M13.6 2 4.4 13.4h6.2L9.4 22l9.2-11.6h-6.2z" />,
  },
  "/chatbot": {
    from: "#c084fc",
    to: "#9333ea",
    glyph: (
      <>
        <rect x="11.2" y="4" width="1.6" height="4" />
        <circle cx="12" cy="3.6" r="1.8" />
        <rect x="3.5" y="7.6" width="17" height="12.4" rx="4.2" />
        <circle cx="8.8" cy="13.2" r="1.7" {...SHADE} />
        <circle cx="15.2" cy="13.2" r="1.7" {...SHADE} />
        <rect x="9.5" y="16.3" width="5" height="1.4" rx=".7" {...SHADE} />
      </>
    ),
  },
  "/settings/chat-widget": {
    from: "#60a5fa",
    to: "#4338ca",
    glyph: (
      <>
        <circle cx="12" cy="12" r="9.5" />
        <ellipse cx="12" cy="12" rx="4" ry="9.5" strokeWidth="1.4" {...SHADE_STROKE} />
        <path d="M2.5 12h19M4.2 7.4h15.6M4.2 16.6h15.6" strokeWidth="1.4" {...SHADE_STROKE} />
      </>
    ),
  },
  "/csat": {
    from: "#fcd34d",
    to: "#f59e0b",
    glyph: <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" />,
  },
  "/settings/whatsapp": {
    from: "#25d366",
    to: "#128c7e",
    glyph: (
      <>
        <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5z" />
        <path
          d="M9.3 7.5c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.2 3.5 5.5 4.8 2.7 1.1 3.3.9 3.9.8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.2-.6-.4l-2.1-1c-.3-.1-.5-.2-.7.2l-.9 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6z"
          fill="#128c7e"
        />
      </>
    ),
  },
  "/settings": {
    from: "#94a3b8",
    to: "#475569",
    glyph: (
      <>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect key={deg} x="10.3" y="1.6" width="3.4" height="4.6" rx="1" transform={`rotate(${deg} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="7.2" />
        <circle cx="12" cy="12" r="2.8" {...SHADE} />
      </>
    ),
  },
  "/settings/billing": {
    from: "#34d399",
    to: "#0f766e",
    glyph: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2.8" />
        <rect x="2" y="8.4" width="20" height="2.8" {...SHADE} />
        <rect x="5" y="14.2" width="5" height="2" rx="1" {...SHADE} />
      </>
    ),
  },
  "/settings/ai-credits": {
    from: "#f0abfc",
    to: "#c026d3",
    glyph: (
      <>
        <path d="M10 2.5c.6 4 2.2 5.6 6.2 6.2-4 .6-5.6 2.2-6.2 6.2-.6-4-2.2-5.6-6.2-6.2 4-.6 5.6-2.2 6.2-6.2z" />
        <path d="M17.6 13.2c.3 2 1.1 2.8 3.1 3.1-2 .3-2.8 1.1-3.1 3.1-.3-2-1.1-2.8-3.1-3.1 2-.3 2.8-1.1 3.1-3.1z" opacity=".85" />
      </>
    ),
  },
  "/support": {
    from: "#f87171",
    to: "#dc2626",
    glyph: (
      <>
        <path
          fillRule="evenodd"
          d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19zm0 5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"
        />
        {[45, 135, 225, 315].map((deg) => (
          <rect key={deg} x="10.7" y="2.5" width="2.6" height="5" transform={`rotate(${deg} 12 12)`} {...SHADE} />
        ))}
      </>
    ),
  },
  "/tours": {
    from: "#fbbf24",
    to: "#d97706",
    glyph: (
      <>
        <circle cx="12" cy="12" r="9.5" />
        <path d="m15.8 8.2-2.4 5.2-5.2 2.4 2.4-5.2z" {...SHADE} />
        <circle cx="12" cy="12" r="1.3" />
      </>
    ),
  },
  "/admin/users": { from: "#60a5fa", to: "#1d4ed8", glyph: person },
  "/admin/teams": { from: "#818cf8", to: "#6d28d9", glyph: group },
  "/team": { from: "#818cf8", to: "#6d28d9", glyph: group },
  "/admin/whatsapp-sessions": {
    from: "#4ade80",
    to: "#15803d",
    glyph: (
      <>
        <path
          d="M3 9.5a13 13 0 0 1 18 0M6.2 13a8.5 8.5 0 0 1 11.6 0M9.4 16.4a4 4 0 0 1 5.2 0"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="12" cy="19.6" r="1.7" />
      </>
    ),
  },
  "/admin/roles-permissions": {
    from: "#f87171",
    to: "#b91c1c",
    glyph: (
      <>
        <path d={shield} />
        <circle cx="12" cy="10.4" r="2.2" {...SHADE} />
        <rect x="11" y="11.5" width="2" height="4.6" rx="1" {...SHADE} />
      </>
    ),
  },
  "/admin/audit-logs": {
    from: "#94a3b8",
    to: "#334155",
    glyph: (
      <>
        <rect x="4.5" y="4" width="15" height="17.5" rx="2.5" />
        <rect x="8.5" y="2.5" width="7" height="3.6" rx="1.2" />
        <rect x="8.5" y="2.5" width="7" height="3.6" rx="1.2" {...SHADE} />
        <rect x="7.5" y="10" width="9" height="1.5" rx=".75" {...SHADE} />
        <rect x="7.5" y="13.4" width="9" height="1.5" rx=".75" {...SHADE} />
        <rect x="7.5" y="16.8" width="5.5" height="1.5" rx=".75" {...SHADE} />
      </>
    ),
  },
  "/admin/gdpr": {
    from: "#2dd4bf",
    to: "#0f766e",
    glyph: (
      <>
        <path d={shield} />
        <path d="m8.6 12.2 2.4 2.4 4.6-4.8" strokeWidth="2" strokeLinejoin="round" {...SHADE_STROKE} />
      </>
    ),
  },
};

interface AppIconProps {
  href: string;
  /** Shown on a neutral tile when the page has no drawn icon yet */
  fallback?: ReactNode;
  className?: string;
}

/** A 52px app icon for a page; decorative (the label next to it names the page). */
export function AppIcon({ href, fallback, className }: AppIconProps) {
  const def = ICONS[href];
  const from = def?.from ?? "#94a3b8";
  const to = def?.to ?? "#475569";

  return (
    <span
      aria-hidden
      className={cn(
        "relative grid size-[52px] place-items-center overflow-hidden rounded-[15px] text-white",
        "shadow-[0_1px_2px_rgb(0_0_0/0.12),0_4px_10px_-4px_rgb(0_0_0/0.25)]",
        className,
      )}
      style={{ backgroundImage: `linear-gradient(150deg, ${from}, ${to})` }}
    >
      {/* Soft top highlight, like a real home-screen icon */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      {def ? (
        <svg viewBox="0 0 24 24" fill="#fff" className="relative size-[30px] drop-shadow-[0_1px_1px_rgb(0_0_0/0.15)]">
          {def.glyph}
        </svg>
      ) : (
        <span className="relative [&_svg]:size-6">{fallback}</span>
      )}
    </span>
  );
}
