"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "right",
  className,
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    switch (side) {
      case "right":
        setPos({ top: rect.top + rect.height / 2, left: rect.right + 8 });
        break;
      case "left":
        setPos({ top: rect.top + rect.height / 2, left: rect.left - 8 });
        break;
      case "top":
        setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
        break;
      case "bottom":
        setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
        break;
    }
  }, [show, side]);

  const transformMap = {
    right: "-translate-y-1/2",
    left: "-translate-y-1/2 -translate-x-full",
    top: "-translate-x-1/2 -translate-y-full",
    bottom: "-translate-x-1/2",
  };

  return (
    <div
      ref={triggerRef}
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          role="tooltip"
          className={cn(
            "fixed z-[9999] whitespace-nowrap rounded-lg bg-surface-container-high px-2.5 py-1.5 text-[12px] text-on-surface shadow-lg pointer-events-none",
            transformMap[side],
          )}
          style={{ top: pos.top, left: pos.left }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
