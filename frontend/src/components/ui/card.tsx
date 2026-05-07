import { cn } from "@/lib/utils";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface-container-lowest p-8",
        "shadow-[0_0_0_1px_var(--outline-variant)/8%,0_20px_48px_-12px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: CardProps) {
  return <div className={cn("space-y-1.5", className)}>{children}</div>;
}

export function CardTitle({ className, children }: CardProps) {
  return (
    <h2
      className={cn(
        "text-2xl font-semibold tracking-tight text-on-surface",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function CardDescription({ className, children }: CardProps) {
  return (
    <p className={cn("text-[14px] text-on-surface-variant", className)}>
      {children}
    </p>
  );
}

export function CardContent({ className, children }: CardProps) {
  return <div className={cn("mt-6", className)}>{children}</div>;
}

export function CardFooter({ className, children }: CardProps) {
  return (
    <div className={cn("mt-6 flex items-center justify-center", className)}>
      {children}
    </div>
  );
}
