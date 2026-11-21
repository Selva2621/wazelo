"use client";
import FeatureDetailPage, { type FeatureDetailData } from "@/components/FeatureDetailPage";

const data: FeatureDetailData = {
  slug: "mobile-app",
  tag: "Mobile app",
  heroTitle: "Your leads,<br /><span style=\"color:#ffb77d\">in your pocket.</span>",
  heroSubtitle: "Install Wazelo on your iPhone or Android phone. It opens like a native app.",
  heroScreen: "/media/features/mobile-app.jpg",
  overviewTitle: "Reply from anywhere.",
  overviewDesc: "Add Wazelo to your home screen from the browser. No app store needed.",
  capabilities: [
    { icon: "install_mobile", title: "Install from the browser", desc: "Add it to your home screen on iPhone or Android." },
    { icon: "tab", title: "Built for phones", desc: "A bottom tab bar and large titles, like the apps you already use." },
    { icon: "notifications_active", title: "Push notifications", desc: "Get notified when a lead is assigned to you or a visitor asks for a person." },
    { icon: "forum", title: "Full inbox", desc: "Read and reply to every chat from your phone." },
    { icon: "wifi_off", title: "Offline banner", desc: "A banner shows when you're offline." },
    { icon: "desktop_windows", title: "Same account", desc: "Everything stays in sync with Wazelo on your computer." },
  ],
  howItWorks: [
    { step: "01", title: "Open Wazelo on your phone", desc: "Sign in from Safari or Chrome." },
    { step: "02", title: "Install it", desc: "Tap Install, or Share → Add to Home Screen on iPhone." },
    { step: "03", title: "Turn on notifications", desc: "Allow push notifications when asked." },
    { step: "04", title: "Reply on the go", desc: "Tap a notification to open the lead or chat." },
  ],
  relatedFeatures: [
    { label: "Shared inbox", href: "/features/shared-inbox", icon: "forum" },
    { label: "Website chat", href: "/features/website-chat", icon: "chat_bubble" },
    { label: "Lead ads", href: "/features/lead-ads", icon: "ads_click" },
    { label: "Contacts", href: "/features/contacts", icon: "group" },
  ],
};

export default function MobileAppClient() {
  return <FeatureDetailPage data={data} />;
}
