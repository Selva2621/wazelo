import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { splashScreens } from "@/lib/pwa/splash-screens";
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
  applicationName: "Wazelo CRM",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/apple-touch-icon.png",
  },
  // Installed iOS app: full screen, content under the status bar (safe areas handle it),
  // launch screen per device size
  appleWebApp: {
    capable: true,
    title: "Wazelo",
    statusBarStyle: "black-translucent",
    startupImage: splashScreens,
  },
  // Stop iOS turning numbers in chats and tables into blue phone links
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Draw under the notch/home bar; mobile layouts pad with env(safe-area-inset-*)
  viewportFit: "cover",
  // Android: the keyboard resizes the page so chat inputs stay visible
  interactiveWidget: "resizes-content",
  // Default theme's page colour; PwaProvider follows the active theme
  themeColor: "#eef1f6",
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
            <PwaProvider />
            <OfflineBanner />
            <Toaster
              position="bottom-right"
              // Clears the mobile tab bar; the var is unset on desktop, so this stays 24px there
              offset={{ bottom: "calc(var(--mobile-tabbar-h, 0px) + var(--safe-bottom, 0px) + 24px)" }}
              mobileOffset={{ bottom: "calc(var(--mobile-tabbar-h, 0px) + var(--safe-bottom, 0px) + 12px)" }}
              richColors
              closeButton
              duration={3000}
              toastOptions={{ classNames: { toast: "font-sans text-body" } }}
            />
          </ThemeProvider>
        </QueryProvider>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-2VQB0F8PX3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-2VQB0F8PX3');
          `}
        </Script>
      </body>
    </html>
  );
}
