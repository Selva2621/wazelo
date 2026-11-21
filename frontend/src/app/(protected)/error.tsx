"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/errors/error-screen";

/** Catches a crashing page inside the app shell so the sidebar and header stay usable. */
export default function ProtectedError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      inline
      code="500"
      title="This page hit an error."
      message="Your data is safe. Try again, or head back to the dashboard."
      primary={{ label: "Try again", onClick: unstable_retry }}
      secondary={{ label: "Go to dashboard", href: "/dashboard" }}
      digest={error.digest}
    />
  );
}
