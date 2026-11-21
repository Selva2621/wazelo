import { A, Callout, Flow, H2, H3, P, Schedule, UL } from "@/components/blog/post-parts";

// Post #4 from reference/content-strategy.md (pillar: WhatsApp follow-up).
// Window, pricing and free-entry-point rules from Meta's pricing page and template
// categorization guidelines, read 2026-11-21:
// https://developers.facebook.com/docs/whatsapp/pricing
// https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines

export const toc = [
  { id: "the-rule", label: "The rule in one line" },
  { id: "what-opens-it", label: "What opens and resets the window" },
  { id: "inside", label: "Inside the window" },
  { id: "outside", label: "Outside the window" },
  { id: "ads", label: "Click-to-WhatsApp ads: 7 days free" },
  { id: "decide", label: "What can I send right now?" },
  { id: "example", label: "An example week" },
  { id: "mistakes", label: "Common mistakes" },
  { id: "sources", label: "Sources" },
];

export default function Post() {
  return (
    <>
      <P>
        If you message leads on the official WhatsApp Business API, one rule decides what you can send and when: the 24-hour customer service window. Get it
        wrong and your message doesn&apos;t go out, or goes out as a more expensive template than it needed to be.
      </P>

      <H2 id="the-rule">The rule in one line</H2>
      <Callout>
        For 24 hours after a lead messages you, you can send them any normal message. After that, you can only send an approved template, until they message
        you again.
      </Callout>
      <P>
        This applies to the official WhatsApp Business API (Cloud API). The WhatsApp Business app on a phone doesn&apos;t use templates, so it has no such rule.
      </P>

      <H2 id="what-opens-it">What opens and resets the window</H2>
      <UL>
        <li>The window opens when the lead sends you a message or calls you on WhatsApp.</li>
        <li>Every new message or call from them resets it to a full 24 hours.</li>
        <li>Your own messages never open or extend it. Only theirs do.</li>
      </UL>

      <H2 id="inside">Inside the window</H2>
      <P>
        While the window is open you can send normal messages: text, photos, documents, locations, buttons and lists, written by a person or by an AI assistant.
        Meta calls these service messages. No template or approval is needed.
      </P>
      <P>
        They are no longer completely free. Since 1 October 2026, each business phone number gets 1,000 free service messages a month, and Meta charges for the
        rest. The free allowance doesn&apos;t roll over. Utility templates sent inside the window are now charged too.
      </P>

      <H2 id="outside">Outside the window</H2>
      <P>Once 24 hours pass without a message from the lead, every message you send must be an approved template, in one of three categories:</P>
      <UL>
        <li>
          <strong className="text-ink">Utility:</strong> follows up on something they asked for or booked, with nothing promotional.
        </li>
        <li>
          <strong className="text-ink">Marketing:</strong> anything persuasive, including nudging a lead who went quiet. This is the most expensive category.
        </li>
        <li>
          <strong className="text-ink">Authentication:</strong> one-time passcodes only.
        </li>
      </UL>
      <P>
        Templates can be sent at any time, inside or outside the window. For which follow-ups fall into which category, see{" "}
        <A href="/blog/whatsapp-follow-up-templates">17 follow-up templates with their Meta category</A>.
      </P>

      <H2 id="ads">Click-to-WhatsApp ads: 7 days free</H2>
      <P>
        When someone starts a chat from a Click-to-WhatsApp ad on Facebook or Instagram, Meta opens a free entry point window. For up to 7 days, the messages you
        send in that conversation are not charged, whether they are marketing, utility, authentication or service messages.
      </P>
      <P>
        Lead form ads are different: the lead fills a form instead of messaging you, so no window is open yet and your first message must be a template.{" "}
        <A href="/blog/facebook-lead-ads-to-whatsapp">Here is how to send that welcome in seconds</A>.
      </P>

      <H2 id="decide">What can I send right now?</H2>
      <Flow
        steps={[
          {
            q: "Did the lead message or call you in the last 24 hours?",
            yes: "Send a normal message. No template needed.",
            no: "Go to question 2.",
          },
          {
            q: "Are you following up on something they asked for or booked, with nothing promotional?",
            yes: "Send a utility template.",
            no: "Go to question 3.",
          },
          {
            q: "Is the message persuading them: a nudge, an offer, a reminder to come back?",
            yes: "Send a marketing template.",
            no: "Rewrite it so it clearly does one job, then start again.",
          },
        ]}
      />

      <H2 id="example">An example week</H2>
      <P>A lead messages your business on Monday at 10:00 about a 2BHK flat.</P>
      <Schedule
        title="How the window moves"
        steps={[
          { when: "Mon 10:00", what: "Lead asks about the price. The window is open until Tuesday 10:00.", kind: "Free-form" },
          { when: "Mon 10:05", what: "You reply with the price list and floor plan.", kind: "Free-form" },
          { when: "Tue 15:00", what: "No reply yet, and the window closed at 10:00. Your follow-up must be a template.", kind: "Marketing" },
          { when: "Tue 18:30", what: "The lead replies asking about site visits. A new window is open until Wednesday 18:30.", kind: "Free-form" },
          { when: "Wed 11:00", what: "You confirm their Saturday visit while the window is still open.", kind: "Free-form" },
          { when: "Fri 11:00", what: "Day-before reminder. The window has closed, so it goes out as a template.", kind: "Utility" },
        ]}
      />

      <H2 id="mistakes">Common mistakes</H2>
      <H3>Replying the next afternoon</H3>
      <P>A lead who wrote yesterday morning is already outside the window. Reply within hours, not days, and you can keep the conversation in normal messages.</P>
      <H3>Trying to keep the window open</H3>
      <P>Sending more messages doesn&apos;t extend it. Only the lead&apos;s messages do, so end each reply with an easy question they will want to answer.</P>
      <H3>Calling every follow-up &ldquo;utility&rdquo;</H3>
      <P>
        A nudge to a quiet lead is marketing. Meta re-categorises templates that are labelled wrongly, and repeated mislabelling can restrict your utility
        templates.
      </P>
      <P>
        A fast first reply does most of the work here. Wazelo&apos;s <A href="/features/shared-inbox">shared inbox</A> lets the whole team answer on one number
        while the window is open, and <A href="/features/sequences">follow-up sequences</A> send the later steps on schedule, stopping when the lead replies.
      </P>

      <H2 id="sources">Sources</H2>
      <P>
        The window, pricing and free entry point rules are from Meta&apos;s <A href="https://developers.facebook.com/docs/whatsapp/pricing">WhatsApp pricing page</A>{" "}
        and the categories from its{" "}
        <A href="https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines">template categorization guidelines</A>, read on 21
        November 2026. Meta changes these rules from time to time, so check those pages before you rely on a detail.
      </P>
    </>
  );
}
