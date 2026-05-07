import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Wazelo CRM Privacy Policy. How we collect, use, and protect your personal data. GDPR and Indian IT Act compliant data handling practices.",
  alternates: {
    canonical: "https://wazelo.in/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
