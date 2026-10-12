"use client";

import "./globals.css";

/** Last-resort boundary for errors in the root layout itself (replaces <html>). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" data-theme="daylight">
      <body className="font-sans antialiased">
        <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 text-center">
          <h1 className="text-title font-semibold text-on-surface mb-2">Wazelo couldn&apos;t load</h1>
          <p className="text-body-lg text-on-surface-variant max-w-[400px] leading-relaxed">
            Something went wrong while starting the app. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-body font-medium text-on-primary transition-colors hover:bg-primary-container"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
