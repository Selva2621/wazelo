import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/json-ld";
import { formatDate, postsByDate } from "@/components/blog/posts";
import { absoluteUrl, breadcrumbJsonLd, pageMetadata, webPageJsonLd } from "@/lib/seo";

const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

const seo = {
  path: "/blog",
  title: "Blog: WhatsApp Lead Follow-up Guides",
  description:
    "Practical guides on replying to leads fast, following up on WhatsApp, WhatsApp Business API pricing and selling on WhatsApp, from the Wazelo team.",
};

const base = pageMetadata(seo);
export const metadata = {
  ...base,
  alternates: { ...base.alternates, types: { "application/rss+xml": absoluteUrl("/blog/rss.xml") } },
};

export default function BlogIndex() {
  const posts = postsByDate();
  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <JsonLd data={[webPageJsonLd(seo), breadcrumbJsonLd([{ name: "Blog", path: seo.path }])]} />
      <Navbar />

      <main className="px-4 pb-28 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Blog</p>
          <h1 className="mt-5 max-w-4xl font-display text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">
            Reply faster. <em className="text-rust">Follow up better.</em>
          </h1>
          <p className="mt-6 max-w-[56ch] text-lg leading-relaxed text-ink-soft">
            Guides for small businesses and freelancers who sell on WhatsApp: catching leads, following up and getting the most from the WhatsApp Business API.
          </p>

          <ul className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.slug} className="min-w-0">
                <Link
                  href={`/blog/${p.slug}`}
                  className={`group flex h-full flex-col rounded-[1.5rem] border border-ink/10 bg-card/60 p-8 transition-colors hover:border-ink/30 ${focusInk}`}
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-rust">{p.pillar}</span>
                  <span className="mt-4 flex items-start justify-between gap-3">
                    <span className="font-display text-2xl leading-tight">{p.title}</span>
                    <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-ink-faint transition-colors group-hover:text-rust" />
                  </span>
                  <span className="mt-4 text-[15px] leading-relaxed text-ink-soft">{p.description}</span>
                  <span className="mt-auto pt-6 font-mono text-xs text-ink-faint">
                    {formatDate(p.published)} · {p.readMinutes} min read
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
