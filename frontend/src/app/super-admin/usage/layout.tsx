import type { Metadata } from "next";

export const metadata: Metadata = { title: "Usage — Super Admin" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
