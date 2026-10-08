import Image from "next/image";
import Link from "next/link";

const cols = [
  {
    title: "Product",
    links: [
      ["For freelancers", "/#freelancers"],
      ["For teams", "/#teams"],
      ["Shared inbox", "/features/shared-inbox"],
      ["Campaigns", "/features/campaigns"],
      ["Automation", "/features/automation"],
      ["Chatbot builder", "/features/chatbot"],
      ["Sequences", "/features/sequences"],
      ["Pricing", "/#pricing"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Documentation", "/docs"],
      ["API reference", "/api-reference"],
      ["Use cases", "/use-cases"],
      ["Security", "/security"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Privacy policy", "/privacy"],
      ["Terms of service", "/terms"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-surface px-4 pb-10 pt-16 font-sans sm:px-6 lg:px-8 lg:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="flex w-max items-center gap-2.5">
              <Image src="/logo/logo.png" alt="" width={32} height={32} className="size-8 object-contain" />
              <span className="text-lg font-semibold tracking-tight text-on-surface">
                Waze<span className="text-primary-container">lo</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-on-surface-variant">
              The WhatsApp CRM for freelancers finding clients and teams sharing one inbox. Connect your number with a QR scan.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-1 lg:col-span-7">
            {cols.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-on-surface">{col.title}</h4>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="text-sm text-on-surface-variant transition-colors hover:text-on-surface">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-outline-variant pt-6 text-xs text-on-surface-variant sm:flex-row">
          <p>© {new Date().getFullYear()} Wazelo CRM. All rights reserved.</p>
          <p>Made in India for businesses that sell on WhatsApp.</p>
        </div>
      </div>
    </footer>
  );
}
