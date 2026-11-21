import { A, Callout, H2, H3, P, ScreenshotPlaceholder, UL } from "@/components/blog/post-parts";

// Post #5 from reference/content-strategy.md (pillar: WhatsApp API explained, hub post).
// Structure and rules from Meta's pricing page, read 2026-11-21 (rates effective 1 Oct 2026):
// https://developers.facebook.com/docs/whatsapp/pricing
// The per-market rate table is a placeholder: Meta's rate card files load in the browser
// only. Fill it from the official USD and INR rate cards, then set hasPlaceholders: false.

export const toc = [
  { id: "how-it-works", label: "How Meta charges" },
  { id: "free", label: "What's free" },
  { id: "rates", label: "Rates by country" },
  { id: "volume-tiers", label: "Volume tiers" },
  { id: "monthly-cost", label: "Working out a monthly cost" },
  { id: "keep-it-down", label: "Keeping the cost down" },
  { id: "provider-fees", label: "Provider fees" },
  { id: "sources", label: "Sources" },
];

export default function Post() {
  return (
    <>
      <P>
        WhatsApp Business API pricing confuses people because there are two bills: Meta&apos;s charge for each message, and the fee for the software you send
        from. This post covers Meta&apos;s part, using the rates that took effect on 1 October 2026, for India and the other markets small businesses ask us about.
      </P>

      <H2 id="how-it-works">How Meta charges</H2>
      <UL>
        <li>You pay per delivered message, not per conversation. Messages your customers send you are never charged.</li>
        <li>The price depends on two things: the message category and the country code of the person receiving it.</li>
        <li>Templates come in three categories: marketing, utility and authentication. Normal replies inside the 24-hour window are service messages.</li>
        <li>Meta changes rates only at the start of a quarter, and bills in your account&apos;s chosen currency where it offers one, such as INR or USD.</li>
      </UL>
      <P>
        Not sure which category a message falls into? See <A href="/blog/whatsapp-follow-up-templates">17 follow-up templates with their Meta category</A> and{" "}
        <A href="/blog/whatsapp-24-hour-rule">how the 24-hour rule works</A>.
      </P>

      <H2 id="free">What&apos;s free</H2>
      <UL>
        <li>
          <strong className="text-ink">The first 1,000 service messages</strong> each month, per business phone number. From the 1,001st, Meta charges. The free
          tier doesn&apos;t roll over.
        </li>
        <li>
          <strong className="text-ink">Click-to-WhatsApp ad chats</strong> for up to 7 days: when a customer starts a chat from a Click-to-WhatsApp ad, the
          messages you send in that window are not charged, whatever their category.
        </li>
        <li>
          <strong className="text-ink">Incoming messages</strong>, always.
        </li>
      </UL>
      <Callout>Since 1 October 2026, utility templates sent inside an open 24-hour window are charged too. Before that date they were free.</Callout>

      <H2 id="rates">Rates by country</H2>
      <P>
        India, the UAE, Saudi Arabia, Indonesia, Nigeria and the UK each have their own rate. The United States is billed at the North America rate, which it
        shares with Canada.
      </P>
      <ScreenshotPlaceholder
        label="Rates coming soon"
        caption="A table of Meta's 1 October 2026 rates for marketing, utility and authentication messages in India (INR) and in the UAE, Saudi Arabia, Indonesia, Nigeria, the UK and North America (USD), taken from Meta's official rate cards."
      />

      <H2 id="volume-tiers">Volume tiers</H2>
      <P>
        Utility and authentication messages get cheaper as you send more. The tiers are counted per market and per category, across your whole business
        portfolio, and reset each month. Only charged messages count toward them. Marketing messages have no volume tiers.
      </P>

      <H2 id="monthly-cost">Working out a monthly cost</H2>
      <P>Add up each category, then add your provider&apos;s fee and local taxes such as GST in India:</P>
      <Callout>
        Monthly cost = (marketing messages × marketing rate) + (utility messages × utility rate) + (service messages over 1,000 × service rate) + provider fee +
        taxes
      </Callout>
      <H3>Example: a small team handling 300 leads a month</H3>
      <UL>
        <li>300 welcome messages to new leads: marketing templates.</li>
        <li>600 follow-ups to leads who went quiet (two each on average): marketing templates.</li>
        <li>300 visit or appointment reminders: utility templates.</li>
        <li>2,500 replies inside the 24-hour window: service messages, the first 1,000 free.</li>
      </UL>
      <ScreenshotPlaceholder
        label="Worked cost coming soon"
        caption="The same example priced with Meta's current rates, once for a business messaging customers in India and once for customers in the UAE."
      />
      <P>
        Replies inside the window need no template and start with 1,000 free a month, which is why answering fast helps the bill as well as the sale.
      </P>

      <H2 id="keep-it-down">Keeping the cost down</H2>
      <UL>
        <li>Reply within hours. A conversation kept inside the 24-hour window runs on service messages instead of templates.</li>
        <li>End each reply with an easy question. Every reply from the customer opens a fresh window.</li>
        <li>Use utility templates only where they honestly apply. Mislabelled templates get re-categorised as marketing anyway.</li>
        <li>Stop follow-ups the moment a lead replies, and after the last step for leads who never do.</li>
        <li>Run Click-to-WhatsApp ads where they fit: their chats are free for 7 days.</li>
      </UL>

      <H2 id="provider-fees">Provider fees</H2>
      <P>
        The software you send from charges separately, usually a monthly subscription. Some providers also add a markup on top of Meta&apos;s per-message rate, so
        ask whether their message prices match Meta&apos;s rate card. When comparing providers, compare both parts:{" "}
        <A href="/compare">see how Wazelo compares with Wati, Interakt and AiSensy</A> and <A href="/pricing">Wazelo&apos;s plans</A>.
      </P>

      <H2 id="sources">Sources</H2>
      <P>
        Pricing rules, free tiers, volume tiers and market groupings are from Meta&apos;s{" "}
        <A href="https://developers.facebook.com/docs/whatsapp/pricing">WhatsApp pricing page</A>, read on 21 November 2026, describing rates effective 1 October
        2026. Rates change at the start of each quarter, so check Meta&apos;s rate card before budgeting.
      </P>
    </>
  );
}
