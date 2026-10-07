import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Wazelo CRM",
    template: "%s | Wazelo CRM",
  },
  description: "WhatsApp CRM for Growing Teams — Leads, Inbox, Campaigns & Automation",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="daylight" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              duration={3000}
              toastOptions={{ classNames: { toast: "font-sans text-body" } }}
            />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
