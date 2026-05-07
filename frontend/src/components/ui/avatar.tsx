"use client";

import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-[13px]",
  lg: "h-16 w-16 text-[18px]",
};

const colors = [
  "bg-[#6366f1]",
  "bg-[#f59e0b]",
  "bg-[#10b981]",
  "bg-[#ef4444]",
  "bg-[#8b5cf6]",
  "bg-[#ec4899]",
  "bg-[#14b8a6]",
  "bg-[#f97316]",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizeStyles[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-full flex items-center justify-center font-medium text-white",
        sizeStyles[size],
        getColor(name),
        className,
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
