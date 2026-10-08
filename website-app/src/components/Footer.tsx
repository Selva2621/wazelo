import Image from "next/image";
import Link from "next/link";
import { FooterDock } from "@/components/footer-dock";
import { Reveal } from "@/components/home/reveal";

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
      // ["API reference", "/api-reference"],
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
    <footer className="ember-rule relative overflow-hidden bg-surface px-4 pb-8 pt-16 font-sans sm:px-6 lg:px-8 lg:pt-20">
      {/* Light under the dock, so its glass has something to bend. */}
      <div aria-hidden className="glass-stage">
        <span className="bottom-[-6rem] left-1/2 h-64 w-[36rem] -translate-x-1/2 bg-primary/15" />
      </div>
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <Link href="/" className="flex w-max items-center gap-2.5">
              <Image src="/logo/logo.png" alt="" width={32} height={32} className="size-8 object-contain" />
              <span className="text-lg font-semibold tracking-tight text-on-surface">
                Waze<span className="text-primary-container">lo</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-on-surface-variant">
              The WhatsApp CRM for freelancers finding clients and teams sharing one inbox. Connect your number with a QR scan.
            </p>
          </Reveal>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:col-span-1 lg:col-span-7">
            {cols.map((col, i) => (
              <Reveal key={col.title} delay={0.08 * (i + 1)}>
                <h4 className="text-sm font-semibold text-on-surface">{col.title}</h4>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="group relative text-sm text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                      >
                        {label}
                        <span
                          aria-hidden
                          className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-primary-container transition-transform duration-300 ease-standard group-hover:scale-x-100 motion-reduce:transition-none"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="mt-16">
          <FooterDock />
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-3 text-xs text-on-surface-variant sm:flex-row">
          <p>© {new Date().getFullYear()} Wazelo CRM. All rights reserved.</p>
          <p>Made in India for businesses that sell on WhatsApp.</p>
        </div>
      </div>
    </footer>
  );
}
