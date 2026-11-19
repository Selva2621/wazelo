"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/errors/error-screen";

/** 500 boundary for routes outside the app shell (auth, public pages). */
export default function RootError({
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
      code="500"
      title="Something broke on our side."
      message="Your data is safe. Give it another try in a moment."
      primary={{ label: "Try again", onClick: unstable_retry }}
      secondary={{ label: "Go to dashboard", href: "/dashboard" }}
      digest={error.digest}
    />
  );
}
