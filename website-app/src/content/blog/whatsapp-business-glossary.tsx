import { A, Glossary, H2, P } from "@/components/blog/post-parts";

// Post #11 from reference/content-strategy.md (pillar: WhatsApp API explained, glossary).
// Definitions use only facts already checked against Meta's docs for posts #2 to #9
// (template categorization, pricing, messaging limits, template quality and pausing,
// policy enforcement, opt-in, per-user limits), read 2026-11-21.

export const toc = [
  { id: "accounts", label: "Accounts and setup" },
  { id: "templates", label: "Templates and categories" },
  { id: "windows", label: "Windows and costs" },
  { id: "limits", label: "Limits, quality and policy" },
  { id: "leads", label: "Leads and follow-up" },
];

export default function Post() {
  return (
    <>
      <P>
        WhatsApp for business comes with its own vocabulary, and the same word can mean different things in different tools. These are the 25 terms you will
        meet most, explained in plain English, grouped by topic. Each links to a fuller guide where there is one.
      </P>

      <H2 id="accounts">Accounts and setup</H2>
      <Glossary
        items={[
          {
            term: "WhatsApp Business app",
            def: "The free app for a single phone. It doesn't use message templates, and its terms don't allow bulk messaging or auto-messaging.",
          },
          {
            term: "WhatsApp Business Platform (Cloud API)",
            def: "Meta's official way for software to send and receive WhatsApp messages for a business. Templates, messaging limits and per-message pricing apply here.",
          },
          {
            term: "Business Solution Provider",
            def: "A company whose software connects a business to the WhatsApp Business Platform, such as a WhatsApp CRM. It usually charges its own fee on top of Meta's.",
          },
          {
            term: "Business portfolio",
            def: "The Meta business account that owns your WhatsApp numbers. Messaging limits are set at this level and shared by all its numbers.",
          },
          {
            term: "Business verification",
            def: "Confirming your business with Meta. It is one way to raise your messaging limit beyond the starting level.",
          },
          {
            term: "WhatsApp Manager",
            def: "Meta's dashboard for your WhatsApp accounts, where you see templates, quality and your current messaging limit.",
          },
        ]}
      />

      <H2 id="templates">Templates and categories</H2>
      <Glossary
        items={[
          {
            term: "Message template",
            def: (
              <>
                A message approved by Meta in advance. You need one to message someone outside the 24-hour window.{" "}
                <A href="/blog/whatsapp-follow-up-templates">17 examples</A>.
              </>
            ),
          },
          {
            term: "Variable",
            def: "A placeholder such as {{1}} in a template, filled in when the message is sent, such as the customer's name. You give sample values when submitting.",
          },
          {
            term: "Marketing template",
            def: "Anything persuasive: offers, re-engagement and nudges to leads who went quiet. Templates that mix promotion with an update also count as marketing.",
          },
          {
            term: "Utility template",
            def: "A non-promotional message that follows up on something the person asked for or booked, such as a confirmation or reminder.",
          },
          {
            term: "Authentication template",
            def: "A template that sends a one-time passcode to verify someone's identity.",
          },
          {
            term: "Re-categorisation",
            def: "When Meta moves an approved template to the category it should be in, most often from utility to marketing. Repeated mislabelling can restrict your utility templates.",
          },
        ]}
      />

      <H2 id="windows">Windows and costs</H2>
      <Glossary
        items={[
          {
            term: "Customer service window",
            def: (
              <>
                The 24 hours after a customer messages or calls you, when you can reply with normal messages. Each new message from them resets it.{" "}
                <A href="/blog/whatsapp-24-hour-rule">How it works</A>.
              </>
            ),
          },
          {
            term: "Service message",
            def: "A normal, non-template reply sent inside the customer service window. Each business number gets 1,000 free a month; Meta charges for the rest.",
          },
          {
            term: "Free entry point",
            def: "A chat started from a Click-to-WhatsApp ad. Messages you send in it are not charged by Meta for up to 7 days.",
          },
          {
            term: "Per-message pricing",
            def: (
              <>
                Meta charges for each delivered template or service message by its category and the recipient&apos;s country code. Incoming messages are free.{" "}
                <A href="/blog/whatsapp-business-api-pricing">Pricing explained</A>.
              </>
            ),
          },
          {
            term: "Volume tiers",
            def: "Lower rates for utility and authentication messages as monthly volume grows, counted per market and category. Marketing messages have none.",
          },
        ]}
      />

      <H2 id="limits">Limits, quality and policy</H2>
      <Glossary
        items={[
          {
            term: "Messaging limit",
            def: (
              <>
                How many unique people you can message outside the customer service window in a moving 24 hours: 250 to start, then 2,000, 10,000, 100,000 and
                unlimited. <A href="/blog/whatsapp-number-banned-or-limited">Limits and bans</A>.
              </>
            ),
          },
          {
            term: "Quality rating",
            def: "Meta's rating of a template (green, yellow or red) or a number, based on how people respond to your messages, such as blocking or reporting.",
          },
          {
            term: "Template pausing",
            def: "A template rated red is paused for 3 hours the first time, 6 hours the second time, and disabled the third time.",
          },
          {
            term: "Per-user marketing limit",
            def: "A cap on how many marketing templates one person receives from businesses. A message held back returns error 131049.",
          },
          {
            term: "Opt-in",
            def: "The person's agreement to hear from your business. WhatsApp's policy requires it before you message them, and it must name your business.",
          },
        ]}
      />

      <H2 id="leads">Leads and follow-up</H2>
      <Glossary
        items={[
          {
            term: "Click-to-WhatsApp ad",
            def: "A Facebook or Instagram ad whose button opens a WhatsApp chat with your business, so the customer messages you first.",
          },
          {
            term: "Lead form ad",
            def: (
              <>
                A Facebook or Instagram ad with a form. The lead hasn&apos;t messaged you, so your first WhatsApp message must be a template.{" "}
                <A href="/blog/facebook-lead-ads-to-whatsapp">Replying in seconds</A>.
              </>
            ),
          },
          {
            term: "Follow-up sequence",
            def: (
              <>
                A series of messages sent on a schedule to a lead who hasn&apos;t replied, stopping when they do.{" "}
                <A href="/blog/how-many-times-to-follow-up-a-lead">Schedules for 5 situations</A>.
              </>
            ),
          },
        ]}
      />
      <P>
        Wazelo puts these pieces in one place: the shared inbox, templates, follow-up sequences and lead ads. <A href="/features">See all features</A>.
      </P>
    </>
  );
}
