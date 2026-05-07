import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Wazelo CRM Terms of Service. Read the terms and conditions governing your use of the Wazelo CRM WhatsApp CRM platform.",
  alternates: {
    canonical: "https://wazelo.in/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
