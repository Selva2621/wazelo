import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reconnect WhatsApp",
  // Token links must never be indexed
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function WhatsAppLinkLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center bg-surface px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <img src="/logo/logo.png" alt="" className="size-8 object-contain" />
        <span className="text-title-sm font-semibold text-on-surface">Wazelo</span>
      </div>
      {children}
    </main>
  );
}
