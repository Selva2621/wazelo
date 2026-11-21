import { A, Callout, H2, H3, P, Template, UL } from "@/components/blog/post-parts";

// Post #2 from reference/content-strategy.md (pillar: WhatsApp follow-up).
// Category rules from Meta's template categorization and pricing pages, read 2026-11-21:
// https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines
// https://developers.facebook.com/docs/whatsapp/pricing
// Re-check those pages before changing any category label below.

export const toc = [
  { id: "which-category", label: "Which category is a follow-up?" },
  { id: "inside-24-hours", label: "Inside the 24-hour window" },
  { id: "utility", label: "Utility templates" },
  { id: "marketing", label: "Follow-ups when a lead goes quiet" },
  { id: "schedule", label: "When to send them" },
  { id: "approval-tips", label: "Getting templates approved" },
  { id: "sources", label: "Sources" },
];

export default function Post() {
  return (
    <>
      <P>
        Most leads don&apos;t say yes to the first message. They reply to the second or third, if someone sends it. Below are 17 follow-up messages you can copy,
        grouped by the rule that decides how you can send them on WhatsApp, with the template category Meta is likely to give each one.
      </P>
      <P>
        The category matters for two reasons. It decides the price of each message, and labelling a sales nudge as &ldquo;utility&rdquo; gets the template
        re-categorised and, if it keeps happening, your utility messages restricted.
      </P>

      <H2 id="which-category">Which category is a follow-up?</H2>
      <P>Meta sorts every WhatsApp template into marketing, utility or authentication. For follow-ups, the line is simple:</P>
      <UL>
        <li>
          <strong className="text-ink">Utility</strong> follows up on something the person asked for or booked, with no promotional or persuasive content: a
          booking confirmation, the quote they requested, a reminder for the visit they scheduled.
        </li>
        <li>
          <strong className="text-ink">Marketing</strong> covers everything that persuades: nudging a lead who went quiet, re-engaging someone who visited your
          site, offers and discounts. Meta says retargeting messages are marketing even if the user asked for them.
        </li>
        <li>A template that mixes the two, such as an order update with a discount, counts as marketing.</li>
      </UL>
      <Callout>
        In practice, most &ldquo;did you get a chance to look?&rdquo; follow-ups are marketing templates. Write them as marketing from the start and they get
        approved without surprises.
      </Callout>

      <H2 id="inside-24-hours">Inside the 24-hour window: no template needed</H2>
      <P>
        When a lead messages you, a 24-hour customer service window opens, and it resets each time they write again. Inside it you can send normal, free-form
        messages without approval. Use these as a starting point:
      </P>
      <Template title="1. After they reply to your welcome" category="Free-form">
        {"Great, thanks Priya! Here are the details for the 2BHK at Green Park. Which day works for a site visit this week?"}
      </Template>
      <Template title="2. Sharing what they asked for" category="Free-form">
        {"Here's the course schedule and fee breakdown. The weekend batch starts on the 5th. Should I hold a seat for you?"}
      </Template>
      <Template title="3. Booking the next step" category="Free-form">
        {"I can call you at 4 pm or 6 pm today. Which is better?"}
      </Template>
      <P>
        Since 1 October 2026 Meta charges for these service messages after 1,000 free ones per business number each month. Once the window closes, the next
        message has to be an approved template.
      </P>

      <H2 id="utility">Utility templates: following up on what they asked for</H2>
      <P>These follow up on a request or booking the lead made, and contain nothing promotional. The numbers in braces are filled in when the message is sent.</P>
      <Template title="4. Quote they requested" category="Utility (likely)">
        {"Hi {{1}}, here is the quote you requested for {{2}}. It is valid until {{3}}. Reply here if you have any questions."}
      </Template>
      <Template title="5. Booking confirmation" category="Utility (likely)">
        {"Hi {{1}}, your {{2}} is confirmed for {{3}} at {{4}}. Reply CHANGE if you need a different time."}
      </Template>
      <Template title="6. Visit or appointment reminder" category="Utility (likely)">
        {"Hi {{1}}, a reminder of your site visit to {{2}} tomorrow at {{3}}. The location pin is here: {{4}}"}
      </Template>
      <Template title="7. Documents still needed" category="Utility (likely)">
        {"Hi {{1}}, to finish your {{2}} application we still need: {{3}}. You can send a photo of it here."}
      </Template>

      <H2 id="marketing">Follow-ups when a lead goes quiet (marketing)</H2>
      <P>These nudge a lead toward a decision, so submit them as marketing templates. Each gives the lead a reason to reply instead of a plain &ldquo;checking in&rdquo;.</P>

      <H3>Real estate</H3>
      <Template title="8. Day 3: answer the likely question" category="Marketing">
        {"Hi {{1}}, buyers looking at {{2}} often ask about home loans. We can connect you with banks for a pre-approval. Want the details?"}
      </Template>
      <Template title="9. Day 7: a concrete slot" category="Marketing">
        {"Hi {{1}}, we have site-visit slots this Saturday at 11 am and 4 pm for {{2}}. Shall I book one for you?"}
      </Template>

      <H3>Coaching and courses</H3>
      <Template title="10. Day 2: the deciding detail" category="Marketing">
        {"Hi {{1}}, a quick note on {{2}}: every batch has a free demo class first, so you can try it before paying. Want me to book the next one?"}
      </Template>
      <Template title="11. Day 6: seats left" category="Marketing">
        {"Hi {{1}}, the {{2}} batch starting {{3}} has a few seats left. Reply YES and I'll keep one for you until Friday."}
      </Template>

      <H3>Agencies and services</H3>
      <Template title="12. Day 3: a useful example" category="Marketing">
        {"Hi {{1}}, here is a 2-minute example of what we did for a business like yours: {{2}}. Happy to walk you through it on a call."}
      </Template>
      <Template title="13. Day 8: the easy yes" category="Marketing">
        {"Hi {{1}}, would a 15-minute call on {{2}} help you decide? Reply with a time that suits you."}
      </Template>

      <H3>Freelancers</H3>
      <Template title="14. Day 4: after the proposal" category="Marketing">
        {"Hi {{1}}, did the proposal for {{2}} cover what you need? I can adjust the scope or timeline if that helps."}
      </Template>
      <Template title="15. Day 10: the last note" category="Marketing">
        {"Hi {{1}}, I'll close this for now so I don't keep messaging you. If {{2}} comes back on the list, just reply here and we'll pick it up."}
      </Template>

      <H3>Shops and online stores</H3>
      <Template title="16. Back in stock" category="Marketing">
        {"Hi {{1}}, the {{2}} you asked about is back in stock in your size. Want me to keep one aside for you?"}
      </Template>
      <Template title="17. Left in the cart" category="Marketing">
        {"Hi {{1}}, you left {{2}} in your cart. It's still there if you'd like to finish your order: {{3}}"}
      </Template>

      <H2 id="schedule">When to send them</H2>
      <P>A simple schedule for a lead who hasn&apos;t replied to the welcome:</P>
      <UL>
        <li>Day 0: welcome within seconds of the enquiry.</li>
        <li>Day 2 or 3: one useful detail that answers their likely question.</li>
        <li>Day 6 or 7: a concrete next step, such as a slot or a seat.</li>
        <li>Day 10: a polite last note that leaves the door open.</li>
      </UL>
      <P>
        Stop the moment they reply and continue the conversation by hand. A <A href="/features/sequences">follow-up sequence in Wazelo</A> does both on its own:
        it sends each step on schedule and stops when the lead answers. If the lead came from a Facebook or Instagram ad, start with the{" "}
        <A href="/blog/facebook-lead-ads-to-whatsapp">welcome in seconds</A>.
      </P>

      <H2 id="approval-tips">Getting templates approved</H2>
      <UL>
        <li>Pick the category honestly. A persuasive message submitted as utility is approved as marketing, or changed later.</li>
        <li>Don&apos;t submit a template that is only a variable, like &ldquo;{"{{1}}"}&rdquo;. Meta treats unclear templates as marketing.</li>
        <li>Give realistic sample values for every variable when you submit, so the reviewer can read the message as the customer will.</li>
        <li>Keep one clear question per message. It makes replying easy and keeps the template short.</li>
      </UL>

      <H2 id="sources">Sources</H2>
      <P>
        Category rules and the 24-hour window are from Meta&apos;s{" "}
        <A href="https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines">template categorization guidelines</A> and{" "}
        <A href="https://developers.facebook.com/docs/whatsapp/pricing">WhatsApp pricing page</A>, read on 21 November 2026. Meta makes the final category
        decision on every template, so treat the labels above as a guide.
      </P>
    </>
  );
}
