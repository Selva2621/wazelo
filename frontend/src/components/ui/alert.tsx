import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

type AlertVariant = "success" | "error" | "warning" | "info";

interface AlertProps {
  variant: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<AlertVariant, string> = {
  success: "bg-success-container text-success",
  error: "bg-error-container text-error",
  warning: "bg-warning-container text-warning",
  info: "bg-surface-container text-on-surface-variant",
};

const icons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />,
  error: <AlertCircle className="h-4.5 w-4.5 shrink-0" />,
  warning: <AlertTriangle className="h-4.5 w-4.5 shrink-0" />,
  info: <Info className="h-4.5 w-4.5 shrink-0" />,
};

export function Alert({ variant, children, className }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-xl px-4 py-3 text-[13px] leading-relaxed",
        styles[variant],
        className,
      )}
    >
      {icons[variant]}
      <div>{children}</div>
    </div>
  );
}
