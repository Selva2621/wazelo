import { A, Callout, H2, H3, OL, P, ScreenshotPlaceholder, Template, UL } from "@/components/blog/post-parts";

// Post #1 from reference/content-strategy.md (pillar: speed to lead).
// Placeholders mark where real Wazelo screenshots go; swap them in, then set
// hasPlaceholders to false in components/blog/posts.ts so the post is indexed.

export const toc = [
  { id: "why-sheets-are-slow", label: "Why the Google Sheet route is slow" },
  { id: "what-seconds-looks-like", label: "What a reply in seconds looks like" },
  { id: "set-it-up", label: "Set it up in Wazelo" },
  { id: "after-the-welcome", label: "After the welcome" },
  { id: "welcome-templates", label: "Welcome message templates" },
  { id: "faq", label: "Questions" },
];

export default function Post() {
  return (
    <>
      <P>
        Someone fills your Facebook or Instagram lead form. At that moment they are holding their phone, thinking about your offer. An hour later they have seen
        three other ads and forgotten yours. The fastest way to reach them is the app already open in their hand: WhatsApp.
      </P>
      <P>
        This guide shows how to send that first WhatsApp message within seconds of the form being submitted, without exporting leads to a Google Sheet first, and
        how to keep following up until the lead replies.
      </P>

      <H2 id="why-sheets-are-slow">Why the Google Sheet route is slow</H2>
      <P>A common setup sends Meta leads to a spreadsheet, then a second tool reads the sheet and messages the lead. Each step adds delay and a place to break:</P>
      <UL>
        <li>Sync tools often check for new rows on a schedule, so the message waits for the next check.</li>
        <li>A renamed column, an expired login or a full sheet can stop the sync without anyone noticing.</li>
        <li>The sheet has no owner for the lead, so nobody is reminded when it sits untouched.</li>
      </UL>
      <P>
        Meta can send each lead straight to your CRM through a webhook the moment the form is submitted. That removes the sheet, the schedule and the failure
        points in between.
      </P>

      <H2 id="what-seconds-looks-like">What a reply in seconds looks like</H2>
      <OL>
        <li>The lead submits the form on Facebook or Instagram.</li>
        <li>Meta sends the lead to Wazelo, with the campaign, ad and form answers.</li>
        <li>A WhatsApp welcome goes out, using the lead&apos;s name and the ad they responded to.</li>
        <li>The lead gets an owner on your team, who sees the chat in the shared inbox.</li>
      </OL>

      <H2 id="set-it-up">Set it up in Wazelo</H2>
      <H3>1. Connect your Meta app</H3>
      <P>Add your Meta app details in Wazelo and point the app&apos;s lead webhook at Wazelo. From then on, every new form entry arrives as it happens.</P>
      <ScreenshotPlaceholder caption="Lead ads settings in Wazelo, with the Meta app connected and the webhook status showing as active." />

      <H3>2. Write the welcome message</H3>
      <P>
        On the official WhatsApp Business API, the first message to someone who hasn&apos;t messaged you must be an approved template. Keep it short, use the
        lead&apos;s name, mention what they asked for and end with one easy question. Submit it as a marketing template unless your form tells people you
        will reply on WhatsApp and the message only confirms their request; only then may Meta accept it as utility, which costs less.
      </P>
      <ScreenshotPlaceholder caption="The welcome template in Wazelo, with the lead's name and ad name filled in from the form." />

      <H3>3. Turn on the &ldquo;Lead ad received&rdquo; automation</H3>
      <P>
        Switch on the automation that sends the welcome when a lead arrives. You can run a different one per Facebook page, platform or lead form, so each
        campaign gets a message that matches its ad. Link a form to a product and its leads go to that product&apos;s team, shared in turn.
      </P>
      <ScreenshotPlaceholder caption="The Lead ad received automation, set to send the welcome template and assign the lead to the product team." />

      <H3>4. Send a test lead</H3>
      <P>
        Submit a test entry with Meta&apos;s <A href="https://developers.facebook.com/tools/lead-ads-testing">Lead Ads Testing Tool</A> and watch it arrive in
        Wazelo with its campaign and ad, followed by the WhatsApp welcome.
      </P>
      <ScreenshotPlaceholder caption="A test lead arriving live in Wazelo, with the WhatsApp welcome shown as delivered." />

      <H2 id="after-the-welcome">After the welcome</H2>
      <P>The welcome starts the conversation. Most sales come from the messages after it:</P>
      <UL>
        <li>If nobody on the team contacts the lead within 30 minutes, the owner gets a reminder.</li>
        <li>
          A <A href="/features/sequences">follow-up sequence</A> sends the next messages on schedule and stops the moment the lead replies.
        </li>
        <li>Leads with an email address also get one welcome email.</li>
      </UL>
      <Callout>
        A good rule: one quick welcome, then two or three follow-ups over the next week, each with a reason to reply. Stop as soon as they answer.
      </Callout>

      <H2 id="welcome-templates">Welcome message templates</H2>
      <P>Copy one, change the details and submit it for approval. The numbers in braces are filled in from the lead form.</P>
      <Template title="Real estate enquiry" category="Marketing (safest)">
        {"Hi {{1}}, thanks for your interest in {{2}}. I'm {{3}} from the sales team.\nWould you like the price list and floor plans here on WhatsApp?"}
      </Template>
      <Template title="Coaching or course enquiry" category="Marketing (safest)">
        {"Hi {{1}}, we got your enquiry about {{2}}.\nWhich batch timing suits you better: morning or evening?"}
      </Template>
      <Template title="Service booking" category="Marketing (safest)">
        {"Hi {{1}}, thanks for requesting a quote for {{2}}.\nWhat's a good time today for a 5-minute call?"}
      </Template>
      <P>
        Meta decides the final category when it reviews the template, and offers or discounts always make it marketing. For which follow-ups count as
        utility, see <A href="/blog/whatsapp-follow-up-templates">17 follow-up templates with their Meta category</A>.
      </P>

      <H2 id="faq">Questions</H2>
      <H3>Does this work for Instagram lead ads too?</H3>
      <P>Yes. Facebook and Instagram lead forms both come through Meta, so the same connection and automation cover both.</P>
      <H3>Do I need Zapier or a Google Sheet?</H3>
      <P>No. Leads come straight from Meta&apos;s webhook into Wazelo.</P>
      <H3>Can each campaign get its own message?</H3>
      <P>Yes. Run a separate automation per page, platform or lead form, and use the campaign and ad name in the message.</P>
    </>
  );
}
