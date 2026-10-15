import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-6 py-16 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-7" />
      </div>
      <p className="text-label font-semibold text-primary mb-1">404</p>
      <h1 className="text-title font-semibold text-on-surface mb-2">Page not found</h1>
      <p className="text-body-lg text-on-surface-variant max-w-[400px] leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or was moved.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-body font-medium text-on-primary transition-colors hover:bg-primary-container"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
