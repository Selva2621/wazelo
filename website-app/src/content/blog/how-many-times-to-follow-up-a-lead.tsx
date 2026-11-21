import { A, Callout, H2, H3, P, Schedule, UL } from "@/components/blog/post-parts";

// Post #3 from reference/content-strategy.md (pillar: WhatsApp follow-up, hub post).
// Message types follow Meta's template categorization and pricing pages, read 2026-11-21
// (see the follow-up templates post for the rules).

export const toc = [
  { id: "short-answer", label: "The short answer" },
  { id: "five-follow-ups", label: "About the “five follow-ups” statistic" },
  { id: "schedules", label: "Schedules for 5 situations" },
  { id: "when-to-stop", label: "When to stop" },
  { id: "is-it-working", label: "Is it working?" },
  { id: "run-it", label: "Running it without a spreadsheet" },
];

export default function Post() {
  return (
    <>
      <P>
        &ldquo;Follow up a few times&rdquo; is advice nobody can act on. This post gives a day-by-day plan for five common situations, with how each message can
        be sent on WhatsApp: as a normal message inside the 24-hour window, as a utility template, or as a marketing template.
      </P>

      <H2 id="short-answer">The short answer</H2>
      <P>
        For a new lead who hasn&apos;t replied: a welcome within seconds, then three follow-ups over about ten days, each with a new reason to reply. Then stop,
        or move them to an occasional update. Stop the moment they answer and carry on the conversation yourself.
      </P>
      <Callout>Every follow-up should add something: an answer, a detail, a time slot. A message that only says &ldquo;just checking in&rdquo; gives the lead nothing to reply to.</Callout>

      <H2 id="five-follow-ups">About the &ldquo;five follow-ups&rdquo; statistic</H2>
      <P>
        You will often see &ldquo;80% of sales need five follow-ups&rdquo; quoted in sales articles. We could not trace it to an original study, so we don&apos;t
        rely on it here. The schedules below come from how WhatsApp works instead: what you can send and when, and how much a lead will put up with before
        muting or blocking you.
      </P>

      <H2 id="schedules">Schedules for 5 situations</H2>
      <P>
        &ldquo;Free-form&rdquo; means a normal message inside the 24-hour window that opens each time the lead writes to you. Outside that window, every message
        must be an approved template (<A href="/blog/whatsapp-24-hour-rule">how the 24-hour rule works</A>), and Meta makes the final call on each
        template&apos;s category. For copy you can use at each step, see the{" "}
        <A href="/blog/whatsapp-follow-up-templates">17 follow-up templates</A>.
      </P>

      <H3>1. A new lead from an ad or form who hasn&apos;t replied</H3>
      <Schedule
        title="New lead, no reply yet"
        steps={[
          { when: "Day 0", what: "Welcome within seconds of the enquiry, with one easy question.", kind: "Marketing" },
          { when: "+30 min", what: "If nobody has spoken to them, the owner calls or messages by hand.", kind: "Call" },
          { when: "Day 2", what: "One useful detail that answers their most likely question.", kind: "Marketing" },
          { when: "Day 6", what: "A concrete next step: a slot, a demo class, a call time.", kind: "Marketing" },
          { when: "Day 10", what: "A polite last note that leaves the door open.", kind: "Marketing" },
          { when: "After", what: "Stop, or add them to a monthly update list.", kind: "Stop" },
        ]}
      />

      <H3>2. A lead who replied once, then went quiet</H3>
      <Schedule
        title="Replied, then silence"
        steps={[
          { when: "Same day", what: "Answer their question fully while the 24-hour window is open.", kind: "Free-form" },
          { when: "Day 2", what: "Pick up their last question and suggest the next step.", kind: "Marketing" },
          { when: "Day 5", what: "Offer a specific time to talk or visit.", kind: "Marketing" },
          { when: "Day 9", what: "Last note: close it for now and invite them back.", kind: "Marketing" },
        ]}
      />

      <H3>3. After you send a quote or proposal</H3>
      <Schedule
        title="Quote or proposal sent"
        steps={[
          { when: "Day 0", what: "Send the quote they asked for, with its validity date.", kind: "Utility" },
          { when: "Day 2", what: "Ask if it covers what they need and offer to adjust scope.", kind: "Marketing" },
          { when: "Day 5", what: "Offer a short call to go through it.", kind: "Marketing" },
          { when: "Day 1 before expiry", what: "Mention the quote's end date and what happens after.", kind: "Marketing" },
          { when: "After expiry", what: "Mark the deal lost, with the reason if you know it.", kind: "Stop" },
        ]}
      />

      <H3>4. A booked visit or appointment</H3>
      <Schedule
        title="Booked visit or appointment"
        steps={[
          { when: "On booking", what: "Confirm the date, time and place.", kind: "Utility" },
          { when: "Day before", what: "Reminder with the location pin or joining link.", kind: "Utility" },
          { when: "2 hours before", what: "Short reminder on the day.", kind: "Utility" },
          { when: "If no-show", what: "Ask if they would like a new time, with no pressure.", kind: "Utility" },
          { when: "Day 3 after", what: "If they didn't rebook, one nudge with two new slots.", kind: "Marketing" },
        ]}
      />

      <H3>5. A business you found yourself, that never contacted you</H3>
      <Schedule
        title="Cold outreach (freelancers and agencies)"
        steps={[
          { when: "Day 0", what: "Call or email first, and ask if you can send an example on WhatsApp.", kind: "Call" },
          { when: "On yes", what: "A short WhatsApp pitch about one specific thing you noticed about their business.", kind: "Marketing" },
          { when: "Day 3", what: "One example of similar work, with a link.", kind: "Marketing" },
          { when: "Day 8", what: "Last note. No more after this.", kind: "Marketing" },
        ]}
      />
      <P>
        WhatsApp only allows messages to people who agreed to hear from you, so don&apos;t start a cold conversation there. Once they say yes, keep it to three
        messages. People you contact first are the most likely to block or report you, and blocks and reports lower your number&apos;s quality rating.{" "}
        <A href="/blog/freelancers-find-clients-google-maps">Here is the full approach for freelancers</A>.
      </P>

      <H2 id="when-to-stop">When to stop</H2>
      <UL>
        <li>The moment they reply. From then on it&apos;s a conversation, not a sequence.</li>
        <li>When they say stop, no or not interested, in any words. Don&apos;t send &ldquo;one last offer&rdquo;.</li>
        <li>After the last note in the schedule. More messages after that mostly earn blocks.</li>
        <li>When the deal is won or lost.</li>
      </UL>

      <H2 id="is-it-working">Is it working?</H2>
      <P>Look at which step gets the replies, not just the total:</P>
      <UL>
        <li>If most replies come from the welcome, your follow-ups need a stronger reason to reply.</li>
        <li>If replies cluster on one follow-up, put that message earlier.</li>
        <li>If people block after a certain step, cut that step or space the schedule out.</li>
      </UL>

      <H2 id="run-it">Running it without a spreadsheet</H2>
      <P>
        Doing this by hand for every lead is where follow-up breaks down. In Wazelo, each schedule becomes a{" "}
        <A href="/features/sequences">follow-up sequence</A> that sends every step on time and stops on its own when the lead replies. The owner gets a reminder
        if a new lead isn&apos;t contacted within 30 minutes, and <A href="/features/lead-scoring">lead scoring</A> shows who is warming up. For leads from
        Facebook and Instagram ads, the welcome goes out in seconds: <A href="/blog/facebook-lead-ads-to-whatsapp">here is how to set that up</A>.
      </P>
    </>
  );
}
