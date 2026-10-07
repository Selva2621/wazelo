import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit Log — Super Admin" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
