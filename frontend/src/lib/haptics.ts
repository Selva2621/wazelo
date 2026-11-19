/**
 * Light tap feedback on phones that support it (Android). iOS Safari has no
 * vibration API, so this is silently skipped there.
 */
export function haptic(kind: "light" | "medium" | "success" | "warning" = "light") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  const pattern = { light: 8, medium: 16, success: [10, 40, 10], warning: [20, 60, 20] }[kind];
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignored: some browsers throw without a user gesture */
  }
}
