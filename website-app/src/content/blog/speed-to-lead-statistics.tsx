import { A, Callout, H2, H3, P, Schedule, UL } from "@/components/blog/post-parts";

// Post #9 from reference/content-strategy.md (pillar: Speed to lead, stats roundup).
// Every number below was checked against its original document on 2026-11-21:
// - InsideSales.com/MIT Lead Response Management Study (presented 16 Oct 2007), read in full.
// - HBR "The Short Life of Online Sales Leads" (Mar 2011): only the visible standfirst; the
//   body is paywalled, so none of its widely quoted numbers are used.
// - Meta's WhatsApp pricing, policy and per-user limit pages (see the 24-hour rule post).
// Don't add a statistic here without reading its original source.

export const toc = [
  { id: "short-version", label: "The short version" },
  { id: "lrm-study", label: "The study everyone quotes" },
  { id: "read-it-right", label: "How to read the numbers" },
  { id: "limits", label: "What the study doesn't show" },
  { id: "hbr", label: "The Harvard Business Review article" },
  { id: "untraced", label: "Numbers we couldn't trace" },
  { id: "whatsapp", label: "WhatsApp facts that affect speed" },
  { id: "your-numbers", label: "Measure your own" },
  { id: "sources", label: "Sources" },
];

export default function Post() {
  return (
    <>
      <P>
        Almost every article about responding to leads quotes the same few statistics. Most never link to where they came from. We went back to the original
        documents, read them, and wrote down what each one actually measured, so you can quote them accurately or decide not to.
      </P>

      <H2 id="short-version">The short version</H2>
      <Callout>
        The best-known evidence, a 2007 study of web leads, found that the odds of reaching a lead by phone fall sharply within minutes of the enquiry. It is old,
        it measured phone calls rather than sales, and it was run with a company that sells lead-response software. The direction is clear; the exact multipliers
        are not something to build a budget on.
      </Callout>

      <H2 id="lrm-study">The study everyone quotes</H2>
      <P>
        The InsideSales.com / MIT Lead Response Management Study was presented by Dave Elkington, then CEO of InsideSales.com, and James Oldroyd, then at MIT&apos;s
        Sloan School of Management, at a MarketingSherpa summit on 16 October 2007. It used three years of data from six companies that respond to web leads:
        over 15,000 leads and over 100,000 call attempts.
      </P>
      <H3>What it found about response time</H3>
      <Schedule
        title="Odds of reaching or qualifying a web lead by phone, by how soon you call"
        steps={[
          { when: "5 vs 10 min", what: "Odds of contacting the lead fall by 5 times; odds of qualifying fall by 4 times.", kind: "Call" },
          { when: "5 vs 30 min", what: "Odds of contacting the lead fall by 100 times; odds of qualifying fall by 21 times.", kind: "Call" },
          { when: "First hour", what: "Odds of contacting fall by over 10 times, and of qualifying by over 6 times.", kind: "Call" },
          { when: "After 20 hours", what: "Each additional call attempt made it less likely, not more, to reach and qualify the lead.", kind: "Stop" },
        ]}
      />
      <H3>What it found about days and times</H3>
      <UL>
        <li>Wednesday and Thursday were the best days to call. Thursday was 49.7% better for making contact than Tuesday, the worst day.</li>
        <li>4 to 6 pm was the best time to make contact, 114% better than the worst time block.</li>
        <li>8 to 9 am and 4 to 5 pm were the best times to qualify a lead.</li>
      </UL>

      <H2 id="read-it-right">How to read the numbers</H2>
      <UL>
        <li>
          &ldquo;100 times&rdquo; is a change in <em>odds</em>, not &ldquo;100 times more sales&rdquo;. It means that, in this data, a lead called within 5
          minutes was far more likely to be reached than one called after 30.
        </li>
        <li>&ldquo;Contact&rdquo; meant a call that connected with a live person and lasted a few minutes. &ldquo;Qualify&rdquo; was defined by each company.</li>
        <li>The figures are about the first call attempt, measured from the moment the web form was submitted.</li>
      </UL>

      <H2 id="limits">What the study doesn&apos;t show</H2>
      <UL>
        <li>
          <strong className="text-ink">Sales.</strong> The study says it &ldquo;did not address close ratios&rdquo;. It measured reaching and qualifying leads,
          not revenue.
        </li>
        <li>
          <strong className="text-ink">WhatsApp.</strong> It measured phone calls in 2007. A WhatsApp message can be read later, so the drop-off may be gentler.
          No one has published comparable data for WhatsApp that we could find.
        </li>
        <li>
          <strong className="text-ink">Your market.</strong> Six companies, all using one vendor&apos;s system.
        </li>
        <li>
          <strong className="text-ink">Independence.</strong> It was run with InsideSales.com, which sold lead-response software.
        </li>
      </UL>

      <H2 id="hbr">The Harvard Business Review article</H2>
      <P>
        The other source you will see cited is &ldquo;The Short Life of Online Sales Leads&rdquo; by James B. Oldroyd, Kristina McElheran and David Elkington, in
        Harvard Business Review, March 2011. Its summary says that &ldquo;most companies are not responding nearly fast enough&rdquo; to online enquiries.
      </P>
      <P>
        The article body is behind a paywall, so we could not check the response-time figures that are widely quoted from it. We have left those numbers out
        rather than repeat them second-hand. If you have access, read the article and quote it directly.
      </P>

      <H2 id="untraced">Numbers we couldn&apos;t trace</H2>
      <P>
        &ldquo;80% of sales need five follow-ups&rdquo; appears in many sales articles, usually without a source. We could not find an original study for it. The
        same goes for many percentages about &ldquo;customers buying from the first company to respond&rdquo;. If a statistic has no link to its original data,
        treat it as an opinion.
      </P>

      <H2 id="whatsapp">WhatsApp facts that affect speed</H2>
      <P>These are rules rather than research, from Meta&apos;s own documentation, and they reward replying fast:</P>
      <UL>
        <li>When a lead messages you, a 24-hour window opens in which you can reply with normal messages instead of templates.</li>
        <li>A chat started from a Click-to-WhatsApp ad is free of Meta&apos;s message charges for up to 7 days.</li>
        <li>Outside the window, only approved templates can be sent, and marketing templates are limited per person.</li>
      </UL>
      <P>
        More on each: <A href="/blog/whatsapp-24-hour-rule">the 24-hour rule</A> and{" "}
        <A href="/blog/whatsapp-number-banned-or-limited">messaging limits and per-person limits</A>.
      </P>

      <H2 id="your-numbers">Measure your own</H2>
      <P>Your own data beats any 2007 study. Track two numbers for a month:</P>
      <UL>
        <li>
          <strong className="text-ink">Time to first reply:</strong> from the enquiry arriving to the first message the lead receives, automated or human.
        </li>
        <li>
          <strong className="text-ink">Time to first human contact:</strong> from the enquiry to the first time a person on your team speaks or writes to them.
        </li>
      </UL>
      <P>
        Then compare how often leads reply, book or buy when the first human contact came within 30 minutes versus later. In Wazelo, a{" "}
        <A href="/blog/facebook-lead-ads-to-whatsapp">WhatsApp welcome goes out within seconds</A> of a Meta lead, the owner is reminded if nobody contacts the
        lead within 30 minutes, and <A href="/features/analytics">analytics</A> show your team&apos;s reply times.
      </P>

      <H2 id="sources">Sources</H2>
      <UL>
        <li>
          <A href="https://www.mortech.com/hs-fs/hub/25649/file-13535879-pdf/docs/mit_study.pdf">
            InsideSales.com / MIT Lead Response Management Study
          </A>
          , presented 16 October 2007 (copy of the original study page). Read in full on 21 November 2026.
        </li>
        <li>
          <A href="https://hbr.org/2011/03/the-short-life-of-online-sales-leads">The Short Life of Online Sales Leads</A>, Harvard Business Review, March 2011.
          Summary only; the body is paywalled.
        </li>
        <li>
          Meta&apos;s <A href="https://developers.facebook.com/docs/whatsapp/pricing">WhatsApp pricing page</A> and{" "}
          <A href="https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits.md">per-user marketing limits</A>,
          read on 21 November 2026.
        </li>
      </UL>
    </>
  );
}
