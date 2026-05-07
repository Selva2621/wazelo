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
  title: "Wazelo CRM",
  description: "WhatsApp CRM for Growing Teams — Leads, Inbox, Campaigns & Automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="bottom-right"
              richColors
              closeButton
              duration={3000}
              toastOptions={{ classNames: { toast: "font-sans text-[13px]" } }}
            />
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
