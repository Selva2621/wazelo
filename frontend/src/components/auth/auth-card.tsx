import { cn } from "@/lib/utils";

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Content wrapper for auth pages. The glass panel itself comes from
 * app/auth/layout.tsx, so this adds no surface of its own (no card in a card).
 */
export function AuthCard({ children, className }: AuthCardProps) {
  return <div className={cn("w-full [&_h2]:text-headline", className)}>{children}</div>;
}
