import MobileAppClient from "./client";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const seo = {
  path: "/features/mobile-app",
  title: "WhatsApp CRM Mobile App for iPhone & Android",
  description: "Install Wazelo on iPhone or Android. Reply to leads from your phone and get a push notification the moment a lead needs you, wherever you are.",
};

export const metadata = pageMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Mobile app", path: seo.path }])]} />
      <MobileAppClient />
    </>
  );
}
