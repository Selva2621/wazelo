"use client";

import { cn } from "@/lib/utils";
import { COUNTRIES, countryFlag } from "@/lib/constants/countries";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  /** Show "+91" after the name */
  showDialCode?: boolean;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Country picker with flags; value is an ISO code ("IN") */
export function CountrySelect({ value, onChange, showDialCode, className, ...rest }: CountrySelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full h-10 rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 text-body-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {countryFlag(c.code)} {c.name}
          {showDialCode ? ` (+${c.dialCode})` : ""}
        </option>
      ))}
    </select>
  );
}
