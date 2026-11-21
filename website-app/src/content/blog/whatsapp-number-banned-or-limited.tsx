import { A, Callout, H2, H3, P, Schedule, UL } from "@/components/blog/post-parts";

// Post #6 from reference/content-strategy.md (pillar: WhatsApp API explained).
// Facts from Meta's developer docs and the WhatsApp Business Messaging Policy
// (last updated 23 Sep 2026), read 2026-11-21. See the Sources section for URLs.
// Meta's docs don't spell out the phone-number quality criteria, so the post only says
// it is based on feedback from the people you message.

export const toc = [
  { id: "limited-vs-banned", label: "Limited is not banned" },
  { id: "messaging-limits", label: "Messaging limits" },
  { id: "quality", label: "Quality: numbers and templates" },
  { id: "per-user", label: "Per-person marketing limits" },
  { id: "policy", label: "Policy restrictions and bans" },
  { id: "app-numbers", label: "App numbers and unofficial tools" },
  { id: "checklist", label: "How to avoid it" },
  { id: "if-it-happens", label: "If it happens" },
  { id: "sources", label: "Sources" },
];

export default function Post() {
  return (
    <>
      <P>
        Few things worry a business on WhatsApp more than losing its number. Most problems are smaller than a ban, and most can be avoided. Here is what Meta
        actually limits, pauses and bans on the WhatsApp Business API, and what triggers each one.
      </P>

      <H2 id="limited-vs-banned">Limited is not banned</H2>
      <UL>
        <li>
          <strong className="text-ink">Messaging limits</strong> cap how many new people you can reach in a day. Every account has one, and it grows with good
          use.
        </li>
        <li>
          <strong className="text-ink">Quality problems</strong> pause a template, or slow your sending, when people react badly to your messages.
        </li>
        <li>
          <strong className="text-ink">Policy restrictions</strong> block sending for a period, or disable the account, when you break WhatsApp&apos;s rules.
        </li>
      </UL>

      <H2 id="messaging-limits">Messaging limits</H2>
      <P>
        Your messaging limit is the number of unique people you can message outside a 24-hour customer service window, in a moving 24-hour period. Replies to
        people who wrote to you don&apos;t count against it.
      </P>
      <UL>
        <li>It is set for your whole business portfolio and shared by all its phone numbers, so one busy number can use up the capacity for all of them.</li>
        <li>New portfolios start at 250 people a day. The next levels are 2,000, 10,000, 100,000 and unlimited.</li>
        <li>
          To move past 250, verify your business, or send 2,000 delivered messages to unique people outside the window within 30 days using high-quality
          templates. Meta then reviews your quality before raising the limit.
        </li>
        <li>From 2,000 up, the limit rises one level within about 6 hours once you use at least half of it over 7 days, with good quality across your numbers and templates.</li>
      </UL>
      <P>You can check your current limit in WhatsApp Manager, under Account tools, Messaging limits.</P>

      <H2 id="quality">Quality: numbers and templates</H2>
      <H3>Phone number quality</H3>
      <P>
        Meta rates each business number by how the people you message respond, such as blocking or reporting you. If quality stays low for a sustained period,
        Meta slows down what the business can send.
      </P>
      <H3>Template quality and pausing</H3>
      <P>
        Each template gets its own rating, from usage, customer feedback and engagement: green for high, yellow for medium, red for low. A template that hits red is
        paused automatically:
      </P>
      <Schedule
        title="When a template's quality drops to red"
        steps={[
          { when: "1st time", what: "Paused for 3 hours. It can't be sent during that time.", kind: "Stop" },
          { when: "2nd time", what: "Paused for 6 hours.", kind: "Stop" },
          { when: "3rd time", what: "Disabled. Write a new template.", kind: "Stop" },
        ]}
      />
      <P>A paused template doesn&apos;t affect your phone number at first, but it is an early warning that people don&apos;t want that message.</P>

      <H2 id="per-user">Per-person marketing limits</H2>
      <P>
        WhatsApp also limits how many marketing templates one person receives from businesses in general, based on how they read and use their inbox. There is
        no fixed number and it adjusts on its own. A message held back this way returns error 131049; wait at least 24 hours before trying again, because
        repeated retries can block delivery for up to a day.
      </P>
      <Callout>
        WhatsApp currently doesn&apos;t deliver marketing templates to people with United States phone numbers. If you sell to the US, plan on utility templates
        and conversations they start.
      </Callout>

      <H2 id="policy">Policy restrictions and bans</H2>
      <H3>The opt-in rule</H3>
      <P>
        WhatsApp&apos;s Business Messaging Policy says you may only contact people who have given you their number and agreed to hear from you. The opt-in must
        say clearly that they are opting in and name your business. It can be general rather than specific to WhatsApp, such as a tick box on a lead form.
      </P>
      <H3>How enforcement escalates</H3>
      <Schedule
        title="Repeated violations (spam, mislabelled templates, high-risk categories)"
        steps={[
          { when: "First", what: "A warning.", kind: "Stop" },
          { when: "Then", what: "1 or 3 days without sending templates or adding numbers.", kind: "Stop" },
          { when: "Then", what: "5, 7 or 30 days without sending any messages.", kind: "Stop" },
          { when: "Then", what: "Account locked until a successful appeal.", kind: "Stop" },
          { when: "Last", what: "Account disabled.", kind: "Stop" },
        ]}
      />
      <P>
        Severe harms such as scams, child exploitation, terrorism or selling illegal drugs lead to immediate removal. Restricted goods such as alcohol, tobacco,
        weapons and gambling have their own rules.
      </P>

      <H2 id="app-numbers">App numbers and unofficial tools</H2>
      <P>
        Everything above applies to the official WhatsApp Business API, which gives warnings and steps before a ban. The WhatsApp and WhatsApp Business apps are
        different: their <A href="https://www.whatsapp.com/legal/terms-of-service">Terms of Service</A> don&apos;t allow bulk messaging or auto-messaging, and the
        Business Messaging Policy treats messaging people at scale in an unauthorised way as grounds to remove access.
      </P>
      <P>
        If you connect an app number to a CRM, keep it for one-to-one conversations. Send campaigns and automated follow-ups from an official API number, which is
        built for them.
      </P>

      <H2 id="checklist">How to avoid it</H2>
      <UL>
        <li>Message only people who gave you their number and agreed to hear from you. Never use bought or scraped lists for marketing templates.</li>
        <li>Put a clear opt-in on your forms that names your business.</li>
        <li>Verify your business early, so your messaging limit can grow.</li>
        <li>Label templates honestly. A sales nudge is marketing, not utility.</li>
        <li>
          Give every message a reason to reply, and stop when people say stop. Keep cold outreach to three messages (
          <A href="/blog/how-many-times-to-follow-up-a-lead">here is a schedule</A>).
        </li>
        <li>Watch template ratings. Rewrite a yellow template before it turns red.</li>
        <li>Answer fast, so more of the conversation happens inside the 24-hour window instead of through templates.</li>
      </UL>

      <H2 id="if-it-happens">If it happens</H2>
      <UL>
        <li>Check WhatsApp Manager for the warning, the reason and the affected number or template.</li>
        <li>For a paused template, fix the message or wait out the pause. Don&apos;t resend the same template to the same people.</li>
        <li>For a policy restriction, request a review from Business Support Home. Meta says decisions typically take 24 to 48 hours. Not every spam decision can be appealed.</li>
        <li>Slow down marketing sends while you fix the cause.</li>
      </UL>
      <P>
        Wazelo connects official WhatsApp Cloud API numbers, with approved templates and per-number send limits for campaigns. Its{" "}
        <A href="/features/sequences">follow-up sequences</A> stop as soon as a lead replies, which keeps unwanted messages down.
      </P>

      <H2 id="sources">Sources</H2>
      <P>
        From Meta&apos;s developer docs on{" "}
        <A href="https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits.md">messaging limits</A>,{" "}
        <A href="https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-pausing.md">template pausing</A>,{" "}
        <A href="https://developers.facebook.com/documentation/business-messaging/whatsapp/policy-enforcement.md">policy enforcement</A>,{" "}
        <A href="https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in.md">getting opt-in</A> and{" "}
        <A href="https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/per-user-limits.md">per-user marketing limits</A>, and
        the <A href="https://whatsappbusiness.com/policy/">WhatsApp Business Messaging Policy</A> (last updated 23 September 2026), all read on 21 November 2026.
      </P>
    </>
  );
}
