import { JsonLd } from "@/components/json-ld";
import { IconFont } from "@/components/icon-font";
import { TUTORIAL_VIDEOS } from "@/components/tutorial-videos";
import { breadcrumbJsonLd, pageMetadata, videoJsonLd, webPageJsonLd } from "@/lib/seo";

// page.tsx is a client component, so its metadata lives here.
const seo = {
  path: "/docs",
  title: "Wazelo Documentation & Setup Guides",
  description: "Setup guides and how-to articles for Wazelo: connect WhatsApp numbers, import contacts, run campaigns, build automations and use the developer API.",
};

export const metadata = pageMetadata(seo);

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IconFont />
      <JsonLd
        data={[
          webPageJsonLd(seo),
          breadcrumbJsonLd([{ name: "Docs", path: seo.path }]),
          // The full demo and the 12 narrated tutorials, each with its chapters as key moments.
          ...TUTORIAL_VIDEOS.map((v) => videoJsonLd(v, seo.path)),
        ]}
      />
      {children}
    </>
  );
}
