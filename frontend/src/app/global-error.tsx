"use client";

import { Inter } from "next/font/google";
import { ErrorScreen } from "@/components/errors/error-screen";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/** Last-resort boundary for errors in the root layout itself (replaces <html>). */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" data-theme="daylight" className={`${inter.variable} antialiased`}>
      <body className="font-sans">
        <title>Something went wrong | Wazelo CRM</title>
        <ErrorScreen
          code="500"
          title="Wazelo couldn't load."
          message="Something went wrong while starting the app. Please try again."
          primary={{ label: "Try again", onClick: unstable_retry }}
          secondary={{ label: "Reload home", href: "/" }}
          digest={error.digest}
        />
      </body>
    </html>
  );
}
