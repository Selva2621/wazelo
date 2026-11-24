import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/json-ld";
import { POSTS, formatDate, postBySlug } from "@/components/blog/posts";
import { ORG_ID, absoluteUrl, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

// Same value as APP_REGISTER_URL in lib/wazelo, which is a client module.
const APP_REGISTER_URL = "https://app.wazelo.in/auth/register";
const focusInk = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props) {
  const p = postBySlug((await params).slug);
  if (!p) return {};
  const meta = pageMetadata({ path: `/blog/${p.slug}`, title: p.seoTitle ?? p.title, description: p.description, noindex: p.hasPlaceholders });
  return { ...meta, openGraph: { ...meta.openGraph, type: "article", publishedTime: p.published, modifiedTime: p.updated } };
}

export default async function BlogPost({ params }: Props) {
  const p = postBySlug((await params).slug);
  if (!p) notFound();
  const path = `/blog/${p.slug}`;
  const { Content } = p;

  const article = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.description,
    datePublished: p.published,
    dateModified: p.updated,
    author: { "@type": "Organization", name: p.author, url: absoluteUrl("/about") },
    publisher: { "@id": ORG_ID },
    mainEntityOfPage: absoluteUrl(path),
    inLanguage: "en",
  };

  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <JsonLd
        data={[
          article,
          breadcrumbJsonLd([
            { name: "Blog", path: "/blog" },
            { name: p.title, path },
          ]),
        ]}
      />
      <Navbar />

      <main className="px-4 pb-24 pt-32 sm:px-6 lg:px-8 lg:pt-40">
        <article className="mx-auto max-w-7xl">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <header className="max-w-4xl">
            <nav aria-label="Breadcrumb" className="text-sm text-ink-faint">
              <Link href="/blog" className={`rounded hover:text-ink ${focusInk}`}>
                Blog
              </Link>
              <span className="mx-2">/</span>
              <span>{p.pillar}</span>
            </nav>
            <h1 className="mt-6 font-display text-[clamp(2.4rem,5vw,4.25rem)] leading-[1.02] tracking-[-0.02em] [text-wrap:balance]">{p.title}</h1>
            <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-soft">{p.description}</p>
            <p className="mt-6 font-mono text-xs text-ink-faint">
              {p.author} · {formatDate(p.published)}
              {p.updated !== p.published && ` · Updated ${formatDate(p.updated)}`} · {p.readMinutes} min read
            </p>
          </header>

          <div className="mt-14 grid gap-12 border-t border-ink/10 pt-12 lg:grid-cols-12">
            {/* ── Contents ──────────────────────────────────────────────── */}
            <aside className="lg:col-span-3">
              <nav aria-label="On this page" className="lg:sticky lg:top-28">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">On this page</p>
                <ol className="mt-4 flex flex-col gap-2.5 text-[15px]">
                  {p.toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className={`rounded text-ink-soft transition-colors hover:text-rust ${focusInk}`}>
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            {/* ── Body ──────────────────────────────────────────────────── */}
            <div className="flex min-w-0 max-w-[68ch] flex-col gap-6 lg:col-span-8 lg:col-start-5">
              <Content />

              {/* ── Next steps ──────────────────────────────────────────── */}
              <div className="tone-fixed mt-10 rounded-[1.5rem] bg-ink p-8 text-paper">
                <p className="font-display text-3xl leading-tight">
                  Reply to every lead <em className="text-[#f0b483]">in seconds.</em>
                </p>
                <p className="mt-3 text-paper/75">Try Wazelo free for 14 days. No credit card.</p>
                <a
                  href={APP_REGISTER_URL}
                  className="group mt-6 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Read next</p>
                <ul className="mt-4 flex flex-col">
                  {p.related.map((r) => (
                    <li key={r.href}>
                      <Link
                        href={r.href}
                        className={`group flex items-center justify-between gap-3 border-b border-ink/10 py-4 text-[16px] font-medium transition-colors hover:text-rust ${focusInk}`}
                      >
                        {r.label}
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint group-hover:text-rust" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
