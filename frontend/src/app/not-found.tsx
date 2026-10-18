import type { Metadata } from "next";
import { ErrorScreen } from "@/components/errors/error-screen";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="We couldn't find that page."
      message="The link may be old or mistyped, or the page was moved."
      primary={{ label: "Take me to the dashboard", href: "/dashboard" }}
    />
  );
}
