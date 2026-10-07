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
  sm: "h-8 w-8 text-caption",
  md: "h-10 w-10 text-body",
  lg: "h-16 w-16 text-title",
};

// Identity palette (design-tokens.json `identity`): desaturated so avatars
// never compete with the primary accent. Initials render dark on all of them.
const colors = [
  "bg-[#7fa7e8]",
  "bg-[#6cc4a4]",
  "bg-[#e48a8a]",
  "bg-[#b59be6]",
  "bg-[#e6a6c8]",
  "bg-[#6ec3d1]",
  "bg-[#c9b26b]",
  "bg-[#a0a8b8]",
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
        "shrink-0 rounded-full flex items-center justify-center font-semibold text-[#0f1117]",
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
