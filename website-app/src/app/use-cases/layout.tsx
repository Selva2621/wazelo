import { HUB_SEO } from "@/components/use-cases/use-cases";
import { pageMetadata } from "@/lib/seo";

// page.tsx is a client component, so the hub's metadata lives here. Child pages
// (/use-cases/[slug]) set their own metadata and JSON-LD; the hub's JSON-LD is
// rendered by the hub page itself so it doesn't leak onto them.
// A layout's plain string title would stop the root "%s | Wazelo" template reaching
// child pages, so the template is restated here.
export const metadata = {
  ...pageMetadata(HUB_SEO),
  title: { default: HUB_SEO.title, template: "%s | Wazelo" },
};

export default function UseCasesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
