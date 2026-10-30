"use client";

import { useSyncExternalStore } from "react";

/**
 * Which phone look the mobile UI uses (below 1024px only; desktop ignores it).
 * Android phones get Material 3, everything else gets iOS.
 *
 * `?platform=android` or `?platform=ios` in any URL overrides the guess and is
 * remembered, so either look can be checked from a desktop browser.
 * `?platform=auto` clears the override.
 */
export type Platform = "ios" | "android";

const STORAGE_KEY = "wz-platform";

/**
 * Runs before first paint (inline script in the root layout) so the page never
 * flashes the wrong look. Keep it self-contained: it is serialised as a string.
 */
export const PLATFORM_SCRIPT = `try{var k="${STORAGE_KEY}",q=new URLSearchParams(location.search).get("platform");if(q==="ios"||q==="android")localStorage.setItem(k,q);else if(q==="auto")localStorage.removeItem(k);var s=localStorage.getItem(k),p=s==="ios"||s==="android"?s:/Android/i.test(navigator.userAgent)?"android":"ios";document.documentElement.setAttribute("data-platform",p)}catch(e){document.documentElement.setAttribute("data-platform","ios")}`;

function read(): Platform {
  return document.documentElement.getAttribute("data-platform") === "android" ? "android" : "ios";
}

// The attribute is set once before hydration and never changes during a visit
const subscribe = () => () => undefined;

/** The current phone look. On the server (and the first client render) this is "ios". */
export function usePlatform(): Platform {
  return useSyncExternalStore(subscribe, read, () => "ios");
}
