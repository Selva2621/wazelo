"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { LeadFilters, ScrapeSource, WebsiteIssue } from "@/lib/types/lead-scraper";
import { SuggestMulti } from "./business-type-input";
import { KEYWORD_ALIASES, KEYWORD_SUGGESTIONS, SKILL_SUGGESTIONS } from "@/lib/constants/scraper-suggestions";

/** Number of filters the user has set (empty lists and false toggles don't count) */
export function countActiveFilters(f: LeadFilters) {
  return Object.values(f).filter((v) => (Array.isArray(v) ? v.length > 0 : v != null && v !== false && v !== "")).length;
}

/** New runs skip leads the org already has — users can still untick */
export const DEFAULT_LEAD_FILTERS: LeadFilters = { newOnly: true, skipExistingContacts: true };

/** Filters inside "More filters" — the duplicate checks sit outside it */
function countMoreFilters(f: LeadFilters) {
  return countActiveFilters({ ...f, newOnly: undefined, skipExistingContacts: undefined });
}

const inputClass =
  "rounded-lg border border-outline-variant bg-surface-container px-2 py-1.5 text-label text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary";

const WEBSITE_ISSUES: { value: WebsiteIssue; label: string }[] = [
  { value: "noSsl", label: "No SSL (http)" },
  { value: "notMobile", label: "Not mobile-friendly" },
  { value: "noPixel", label: "No Facebook Pixel" },
  { value: "noAnalytics", label: "No Google Analytics" },
];

function Check({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-label text-on-surface cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary w-4 h-4" />
      {label}
      {hint && <span className="text-caption text-on-surface-variant">{hint}</span>}
    </label>
  );
}

function Field({ label, children, asDiv }: {
  label: string; children: React.ReactNode;
  /** For controls with buttons inside — a <label> would forward clicks on its text to the first button */
  asDiv?: boolean;
}) {
  const Tag = asDiv ? "div" : "label";
  return (
    <Tag className="flex items-center gap-2 text-label text-on-surface-variant flex-wrap">
      <span className="shrink-0">{label}</span>
      {children}
    </Tag>
  );
}

function split(text: string) {
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Comma-separated text ↔ string[]; keeps the raw text so typing "gym, " isn't rewritten mid-edit */
function ListInput({ value, onChange, placeholder }: {
  value: string[] | undefined; onChange: (v: string[] | undefined) => void; placeholder: string;
}) {
  const [text, setText] = useState((value ?? []).join(", "));
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    if ((value ?? []).join(",") !== split(text).join(",")) setText((value ?? []).join(", "));
  }
  return (
    <input
      type="text"
      value={text}
      placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        const items = split(e.target.value);
        onChange(items.length ? items : undefined);
      }}
      className={`${inputClass} flex-1 min-w-[180px]`}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-caption font-semibold uppercase tracking-wide text-on-surface-variant">{title}</p>
      {children}
    </div>
  );
}

export function ScrapeFilters({ source, value, onChange, hasLocation }: {
  source: ScrapeSource;
  value: LeadFilters;
  onChange: (f: LeadFilters) => void;
  /** Radius needs a location to centre on */
  hasLocation: boolean;
}) {
  const active = countMoreFilters(value);
  const [open, setOpen] = useState(active > 0);
  // Duplicating a run fills filters in from outside — show them
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active > 0) setOpen(true);
  }

  const set = (patch: Partial<LeadFilters>) => onChange({ ...value, ...patch });
  const num = (v: string) => (v === "" ? undefined : Math.max(0, Number(v)));
  const flag = (v: boolean) => v || undefined;
  const isMaps = source === "GOOGLE_MAPS";

  const togglePrice = (level: number) => {
    const levels = new Set(value.priceLevels ?? []);
    if (levels.has(level)) levels.delete(level);
    else levels.add(level);
    set({ priceLevels: levels.size ? [...levels].sort() : undefined });
  };
  const toggleIssue = (issue: WebsiteIssue) => {
    const issues = new Set(value.websiteIssues ?? []);
    if (issues.has(issue)) issues.delete(issue);
    else issues.add(issue);
    set({ websiteIssues: issues.size ? [...issues] : undefined });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <Check label="New leads only" hint="skip ones found in earlier runs" checked={!!value.newOnly} onChange={(v) => set({ newOnly: flag(v) })} />
        <Check label="Skip numbers already in contacts" checked={!!value.skipExistingContacts} onChange={(v) => set({ skipExistingContacts: flag(v) })} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-label font-medium text-on-surface-variant hover:text-on-surface"
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} />
        More filters
        {active > 0 && (
          <span className="bg-primary text-on-primary text-caption font-semibold px-1.5 rounded-full">{active}</span>
        )}
      </button>

      {open && (
        <div className="rounded-xl border border-outline-variant bg-surface-container/40 p-4 space-y-5">
          {isMaps ? (
            <>
              <Section title="Location">
                <Field label="Areas / pincodes">
                  <ListInput value={value.areas} onChange={(areas) => set({ areas })} placeholder="600017, T Nagar, Adyar" />
                </Field>
                <Field label="Within">
                  <input type="number" min={0.5} max={50} step={0.5} placeholder="km" value={value.radiusKm ?? ""}
                    disabled={!hasLocation || !!value.areas?.length}
                    onChange={(e) => set({ radiusKm: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className={`${inputClass} w-20 disabled:opacity-50`} />
                  <span className="text-caption">
                    {value.areas?.length ? "areas replace radius" : hasLocation ? "km of location" : "enter a location to use radius"}
                  </span>
                </Field>
              </Section>

              <Section title="Quality">
                <div className="flex items-center gap-4 flex-wrap">
                  <Field label="Min rating">
                    <select value={value.minRating ?? ""} onChange={(e) => set({ minRating: e.target.value ? Number(e.target.value) : undefined })} className={inputClass}>
                      <option value="">Any</option>
                      {[3, 3.5, 4, 4.5].map((r) => <option key={r} value={r}>{r.toFixed(1)}+</option>)}
                    </select>
                  </Field>
                  <Field label="Reviews">
                    <input type="number" min={0} placeholder="min" value={value.minReviews ?? ""} onChange={(e) => set({ minReviews: num(e.target.value) })} className={`${inputClass} w-20`} />
                    –
                    <input type="number" min={0} placeholder="max" value={value.maxReviews ?? ""} onChange={(e) => set({ maxReviews: num(e.target.value) })} className={`${inputClass} w-20`} />
                  </Field>
                  <Field label="Max photos">
                    <input type="number" min={0} placeholder="any" value={value.maxPhotos ?? ""} onChange={(e) => set({ maxPhotos: num(e.target.value) })} className={`${inputClass} w-20`} />
                  </Field>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <Field label="Price">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => {
                        const on = value.priceLevels?.includes(level);
                        return (
                          <button key={level} type="button" onClick={() => togglePrice(level)} aria-pressed={on}
                            className={`text-caption px-2 py-1 rounded-full border ${on ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-on-surface-variant hover:border-primary/50"}`}>
                            {"₹".repeat(level)}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="Last review within">
                    <select value={value.activeWithinMonths ?? ""} onChange={(e) => set({ activeWithinMonths: e.target.value ? Number(e.target.value) : undefined })} className={inputClass}>
                      <option value="">Any time</option>
                      {[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}
                    </select>
                    {value.activeWithinMonths != null && <span className="text-caption">slower</span>}
                  </Field>
                </div>
              </Section>

              <Section title="Contact">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Check label="Has phone" checked={!!value.hasPhone} onChange={(v) => set({ hasPhone: flag(v) })} />
                  <Check label="Mobile numbers only" hint="no landlines" checked={!!value.mobileOnly} onChange={(v) => set({ mobileOnly: flag(v) })} />
                  <Check label="Find emails from website" hint="slower" checked={!!value.findEmails} onChange={(v) => set({ findEmails: flag(v) })} />
                  <Field label="Social profiles">
                    <select value={value.social ?? ""} onChange={(e) => set({ social: (e.target.value || undefined) as LeadFilters["social"] })} className={inputClass}>
                      <option value="">Any</option>
                      <option value="has">Has Instagram/Facebook</option>
                      <option value="none">No social profiles</option>
                    </select>
                  </Field>
                </div>
              </Section>

              <Section title="Business">
                <Field label="Category is" asDiv>
                  <SuggestMulti groups={KEYWORD_SUGGESTIONS.GOOGLE_MAPS} aliases={KEYWORD_ALIASES.GOOGLE_MAPS} value={value.includeCategories} onChange={(includeCategories) => set({ includeCategories })} placeholder="Type or pick — Gym, Fitness centre" />
                </Field>
                <Field label="Category is not" asDiv>
                  <SuggestMulti groups={KEYWORD_SUGGESTIONS.GOOGLE_MAPS} aliases={KEYWORD_ALIASES.GOOGLE_MAPS} value={value.excludeCategories} onChange={(excludeCategories) => set({ excludeCategories })} placeholder="Type or pick — Yoga studio" />
                </Field>
                <Field label="Skip names with">
                  <ListInput value={value.excludeWords} onChange={(excludeWords) => set({ excludeWords })} placeholder="Gold's, Cult, Anytime" />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Check label="Unclaimed listings only" checked={!!value.unclaimedOnly} onChange={(v) => set({ unclaimedOnly: flag(v) })} />
                  <Check label="Skip closed" checked={!!value.skipClosed} onChange={(v) => set({ skipClosed: flag(v) })} />
                  <Check label="Open 24 hours" checked={!!value.open24h} onChange={(v) => set({ open24h: flag(v) })} />
                  <Check label="Open on weekends" checked={!!value.openWeekends} onChange={(v) => set({ openWeekends: flag(v) })} />
                </div>
              </Section>

              <Section title="Website">
                <Check label="No website only" checked={!!value.noWebsite} onChange={(v) => set({ noWebsite: flag(v) })} />
                <p className="text-caption text-on-surface-variant">Has a website with any of these issues (checks each site — slower):</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WEBSITE_ISSUES.map((i) => (
                    <Check key={i.value} label={i.label} checked={!!value.websiteIssues?.includes(i.value)} onChange={() => toggleIssue(i.value)} />
                  ))}
                </div>
              </Section>
            </>
          ) : (
            <>
              <Section title="Budget">
                <div className="flex items-center gap-4 flex-wrap">
                  <Field label="Budget">
                    <input type="number" min={0} placeholder="min" value={value.minBudget ?? ""} onChange={(e) => set({ minBudget: num(e.target.value) })} className={`${inputClass} w-24`} />
                    –
                    <input type="number" min={0} placeholder="max" value={value.maxBudget ?? ""} onChange={(e) => set({ maxBudget: num(e.target.value) })} className={`${inputClass} w-24`} />
                  </Field>
                  <Field label="Type">
                    <select value={value.budgetType ?? ""} onChange={(e) => set({ budgetType: (e.target.value || undefined) as LeadFilters["budgetType"] })} className={inputClass}>
                      <option value="">Any</option>
                      <option value="fixed">Fixed price</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </Field>
                </div>
              </Section>

              <Section title="Job">
                <Field label="Posted within">
                  <select value={value.postedWithinDays ?? ""} onChange={(e) => set({ postedWithinDays: e.target.value ? Number(e.target.value) : undefined })} className={inputClass}>
                    <option value="">Any time</option>
                    {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d === 1 ? "24 hours" : `${d} days`}</option>)}
                  </select>
                </Field>
                <Field label="Skills include" asDiv>
                  <SuggestMulti groups={SKILL_SUGGESTIONS[source] ?? []} value={value.includeSkills} onChange={(includeSkills) => set({ includeSkills })} placeholder="Type or pick — React, WordPress" />
                </Field>
                <Field label="Skills exclude" asDiv>
                  <SuggestMulti groups={SKILL_SUGGESTIONS[source] ?? []} value={value.excludeSkills} onChange={(excludeSkills) => set({ excludeSkills })} placeholder="Type or pick — PHP" />
                </Field>
              </Section>

              <Section title="Client">
                <div className="flex items-center gap-4 flex-wrap">
                  <Check label="Payment verified" checked={!!value.paymentVerified} onChange={(v) => set({ paymentVerified: flag(v) })} />
                  <Field label="Max proposals">
                    <input type="number" min={0} placeholder="any" value={value.maxProposals ?? ""} onChange={(e) => set({ maxProposals: num(e.target.value) })} className={`${inputClass} w-20`} />
                  </Field>
                  <Field label="Country">
                    <input type="text" placeholder="India" value={value.clientCountry ?? ""} onChange={(e) => set({ clientCountry: e.target.value || undefined })} className={`${inputClass} w-32`} />
                  </Field>
                </div>
              </Section>
            </>
          )}

          <p className="text-caption text-on-surface-variant/70">
            Leads missing a detail (e.g. no photo count shown) aren&apos;t dropped by that filter.
          </p>
        </div>
      )}
    </div>
  );
}
