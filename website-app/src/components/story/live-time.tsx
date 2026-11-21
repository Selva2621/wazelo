"use client";

import { useEffect, useState } from "react";

/** The visitor's own clock ("10:15 AM"), refreshed every 15 s. Shows `fallback` until mounted. */
export function LiveTime({ fallback = "Right now" }: { fallback?: string }) {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="tabular-nums">{now ?? fallback}</span>;
}
