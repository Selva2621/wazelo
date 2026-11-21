"use client";

import { useMediaQuery } from "./use-media-query";

/**
 * True below the desktop breakpoint (Tailwind `lg`, 1024px): phones and tablets
 * get the iOS-style mobile UI, desktop stays as it is.
 */
export const MOBILE_QUERY = "(max-width: 1023.98px)";

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}
