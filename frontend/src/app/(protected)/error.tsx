"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Catches a crashing page inside the app shell so the sidebar and header stay usable. */
export default function ProtectedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height))] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-error-container text-error">
        <AlertTriangle className="size-7" />
      </div>
      <h2 className="text-title font-semibold text-on-surface mb-2">Something went wrong</h2>
      <p className="text-body-lg text-on-surface-variant max-w-[400px] leading-relaxed">
        This page hit an unexpected error. Your data is safe — try again, or head back to the dashboard.
      </p>
      {error.digest && (
        <p className="mt-3 text-caption font-mono text-on-surface-variant">Ref: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-lg border border-outline-variant px-4 text-body font-medium text-on-surface transition-colors hover:bg-surface-container"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
