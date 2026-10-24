import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Proposal",
  // Token links must never be indexed or leak through Referer
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** The client's proposal page: no app chrome, always light (it's a document), prints clean. */
export default function PublicProposalLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh bg-[#f3f4f6] text-[#1f2328] [color-scheme:light] print:bg-white">{children}</main>;
}
