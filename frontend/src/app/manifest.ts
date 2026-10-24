import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Wazelo CRM",
    short_name: "Wazelo",
    description: "WhatsApp CRM for Growing Teams — Leads, Inbox, Campaigns & Automation",
    start_url: "/inbox?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0f1117",
    theme_color: "#0f1117",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Inbox", url: "/inbox", icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }] },
      { name: "Contacts", url: "/contacts", icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }] },
      { name: "Campaigns", url: "/campaigns", icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }] },
      { name: "Dashboard", url: "/dashboard", icons: [{ src: "/icons/icon-96.png", sizes: "96x96" }] },
    ],
  };
}
