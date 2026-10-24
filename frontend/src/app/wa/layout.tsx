import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reconnect WhatsApp",
  // Token links must never be indexed
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function WhatsAppLinkLayout({ children }: { children: React.ReactNode }) {
  return (
    // Phones/tablets: clear the notch and home indicator
    <main className="flex min-h-dvh flex-1 flex-col items-center bg-surface px-4 py-10 max-lg:pt-[calc(32px+var(--safe-top))] max-lg:pb-[calc(24px+var(--safe-bottom))] max-lg:pl-[max(16px,var(--safe-left))] max-lg:pr-[max(16px,var(--safe-right))]">
      <div className="mb-8 flex items-center gap-2 max-lg:mb-6">
        <img src="/logo/logo.png" alt="" className="size-8 object-contain" />
        <span className="text-title-sm font-semibold text-on-surface">Wazelo</span>
      </div>
      {children}
    </main>
  );
}
