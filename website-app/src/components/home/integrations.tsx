"use client";

// Strip directly under the hero: only what Wazelo really connects to (see
// reference/website-product-facts.md). Lead sources on the left, connections on
// the right. Marks from Simple Icons, tinted to the muted text colour so no brand
// colour competes with the accent; LinkedIn and Truelancer have no mark there.

import { Briefcase } from "lucide-react";
import { Reveal } from "@/components/home/reveal";

type Item = { name: string; slug?: string };

const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Finds leads on",
    items: [
      { name: "Google Maps", slug: "googlemaps" },
      { name: "Upwork", slug: "upwork" },
      { name: "Freelancer.in", slug: "freelancer" },
      { name: "Truelancer" },
      { name: "LinkedIn Jobs" },
    ],
  },
  {
    label: "Connects with",
    items: [
      { name: "WhatsApp", slug: "whatsapp" },
      { name: "Meta lead ads", slug: "meta" },
      { name: "Shopify", slug: "shopify" },
    ],
  },
];

export function Integrations() {
  return (
    <section aria-label="Lead sources and connections" className="ember-rule ember-rule--bottom border-t border-outline-variant/70 py-9">
      <Reveal className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.6fr_1fr] lg:gap-14 lg:px-8">
        {GROUPS.map((g) => (
          <div key={g.label} className="flex flex-col gap-4">
            <p className="text-sm text-on-surface-variant">{g.label}</p>
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {g.items.map((it) => (
                <li key={it.name} className="flex items-center gap-2.5 text-sm font-medium text-on-surface">
                  {it.slug ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`https://cdn.simpleicons.org/${it.slug}/8a91a5`} alt="" width={22} height={22} loading="lazy" className="size-[22px]" />
                  ) : (
                    <Briefcase className="size-[22px] text-placeholder" strokeWidth={1.75} />
                  )}
                  <span className="whitespace-nowrap">{it.name}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Reveal>
    </section>
  );
}
