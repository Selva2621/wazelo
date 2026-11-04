"use client";

import { COUNTRIES, countryFlag } from "@/lib/constants/countries";
import { Select } from "@/components/ui/select";

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
    <Select
      value={value}
      onValueChange={onChange}
      searchable
      className={className}
      {...rest}
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {countryFlag(c.code)} {c.name}
          {showDialCode ? ` (+${c.dialCode})` : ""}
        </option>
      ))}
    </Select>
  );
}
