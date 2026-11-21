import { A, Callout, H2, P, Schedule, Template, UL } from "@/components/blog/post-parts";

// Post #7 from reference/content-strategy.md (pillar: Selling on WhatsApp, real estate spoke).
// Wazelo features used here are verified in the product: project = product with its own
// team, round-robin assignment, 30-minute reminder, day-end summary, sequences, deals.
// Template categories follow Meta's guidelines (see posts #2 and #4).

export const toc = [
  { id: "stages", label: "The five stages" },
  { id: "first-reply", label: "1. First reply" },
  { id: "qualify", label: "2. Qualify" },
  { id: "visit", label: "3. Book the site visit" },
  { id: "after-visit", label: "4. After the visit" },
  { id: "team", label: "Setting up the team" },
  { id: "templates", label: "Templates" },
  { id: "track", label: "What to track" },
];

export default function Post() {
  return (
    <>
      <P>
        In real estate the site visit is where most deals are won. Everything before it is about getting the buyer to show up, and everything after it is about
        answering what they saw. This playbook covers both on WhatsApp, step by step, from the first enquiry to the booking.
      </P>

      <H2 id="stages">The five stages</H2>
      <UL>
        <li>
          <strong className="text-ink">Enquiry:</strong> a lead form, a Click-to-WhatsApp ad or a website chat.
        </li>
        <li>
          <strong className="text-ink">First reply:</strong> within seconds, then a call within 30 minutes.
        </li>
        <li>
          <strong className="text-ink">Qualify:</strong> budget, size and when they want to move.
        </li>
        <li>
          <strong className="text-ink">Site visit:</strong> booked, confirmed and reminded.
        </li>
        <li>
          <strong className="text-ink">Decision:</strong> follow-up after the visit until they book or say no.
        </li>
      </UL>

      <H2 id="first-reply">1. First reply: seconds, then a call</H2>
      <P>
        Buyers often enquire about several projects at once, and the first agent to reply with something useful gets the conversation. Send a WhatsApp welcome
        the moment the enquiry arrives, and have the agent call or message by hand within 30 minutes.
      </P>
      <P>
        If the lead came from a Facebook or Instagram form, the welcome must be an approved template.{" "}
        <A href="/blog/facebook-lead-ads-to-whatsapp">Here is how to send it within seconds</A>. If they messaged you from a Click-to-WhatsApp ad, you can reply
        normally, and Meta doesn&apos;t charge for that chat for 7 days.
      </P>

      <H2 id="qualify">2. Qualify with three questions</H2>
      <P>Ask one at a time, in the chat, so each answer opens the next question:</P>
      <UL>
        <li>Which configuration are you looking for, such as a 2BHK (two-bedroom) or 3BHK?</li>
        <li>What budget range should I show you options in?</li>
        <li>When are you planning to move: within 3 months, 6 months or later?</li>
      </UL>
      <P>
        Note the answers on the contact and tag the lead, so the next agent who opens the chat doesn&apos;t ask again. In Wazelo,{" "}
        <A href="/features/lead-scoring">lead scoring</A> moves leads who answer and engage up the list.
      </P>

      <H2 id="visit">3. Book the site visit</H2>
      <P>Offer two specific slots instead of asking when they are free. A choice between two times is easier to answer than an open question.</P>
      <Schedule
        title="From booking to visit"
        steps={[
          { when: "On booking", what: "Confirm the project, date, time and who will meet them.", kind: "Utility" },
          { when: "Day before", what: "Reminder with the location pin and parking details.", kind: "Utility" },
          { when: "2 hours before", what: "A short reminder and the agent's direct number.", kind: "Utility" },
          { when: "15 min late", what: "Call them. Don't wait for a message.", kind: "Call" },
          { when: "No-show", what: "Same day: ask if they'd like a new time, with two slots.", kind: "Utility" },
          { when: "Day 3", what: "If they didn't rebook, one more nudge with new slots.", kind: "Marketing" },
        ]}
      />

      <H2 id="after-visit">4. After the visit</H2>
      <P>Buyers decide in the days after a visit, often while comparing it with another project. Stay useful without chasing:</P>
      <Schedule
        title="After the site visit"
        steps={[
          { when: "Same evening", what: "Thank them and answer anything they asked on site.", kind: "Free-form" },
          { when: "Day 2", what: "The price sheet and payment plan for the unit they liked.", kind: "Marketing" },
          { when: "Day 5", what: "Home loan options, or the one detail they were unsure about.", kind: "Marketing" },
          { when: "Day 10", what: "A polite last note: close it for now and invite them back.", kind: "Marketing" },
          { when: "On decision", what: "Move the deal to Won or Lost, with the reason.", kind: "Stop" },
        ]}
      />
      <Callout>
        If the buyer replies at any point, stop the sequence and talk. A reply inside the 24-hour window also lets you send normal messages instead of templates.
      </Callout>

      <H2 id="team">Setting up the team</H2>
      <P>With several projects and agents, the enquiry has to reach the right person straight away. In Wazelo:</P>
      <UL>
        <li>Set up each project as a product and link its lead form. Its enquiries go to that project&apos;s team, shared in turn.</li>
        <li>If the agent hasn&apos;t contacted a new lead within 30 minutes, they get a reminder.</li>
        <li>The manager gets a day-end summary of which leads were contacted and which are waiting.</li>
        <li>
          Track each buyer in a <A href="/features/deals">deals pipeline</A>, with stages such as enquiry, qualified, visit booked, visited, negotiation, and won
          or lost.
        </li>
      </UL>

      <H2 id="templates">Templates</H2>
      <P>Templates for the steps outside the 24-hour window. Meta makes the final call on each category.</P>
      <Template title="Visit confirmation" category="Utility (likely)">
        {"Hi {{1}}, your site visit to {{2}} is confirmed for {{3}} at {{4}}. {{5}} will meet you at the sales office."}
      </Template>
      <Template title="Day-before reminder" category="Utility (likely)">
        {"Hi {{1}}, see you tomorrow at {{2}} for your visit to {{3}}. Location: {{4}}. Parking is available at the main gate."}
      </Template>
      <Template title="Missed visit" category="Utility (likely)">
        {"Hi {{1}}, we missed you at {{2}} today. Would {{3}} or {{4}} work better for a new visit?"}
      </Template>
      <Template title="Price sheet after the visit" category="Marketing">
        {"Hi {{1}}, thanks for visiting {{2}}. Here is the price sheet and payment plan for the {{3}} you liked: {{4}}. Any questions, just reply here."}
      </Template>
      <Template title="Last note" category="Marketing">
        {"Hi {{1}}, I'll close your enquiry for {{2}} for now so I don't keep messaging. If you'd like to see it again, reply here and I'll set up a visit."}
      </Template>
      <P>
        More examples for other stages are in <A href="/blog/whatsapp-follow-up-templates">17 follow-up templates</A>.
      </P>

      <H2 id="track">What to track</H2>
      <UL>
        <li>
          <strong className="text-ink">Enquiry to visit:</strong> how many enquiries become a booked visit. Low means the first reply or qualifying is slow.
        </li>
        <li>
          <strong className="text-ink">No-show rate:</strong> booked visits that didn&apos;t happen. High means reminders are missing or slots are too far out.
        </li>
        <li>
          <strong className="text-ink">Visit to booking:</strong> how many visits become a sale. Low means the after-visit follow-up needs work.
        </li>
      </UL>
      <P>
        See how this runs end to end in <A href="/use-cases/real-estate">Wazelo for real estate</A>.
      </P>
    </>
  );
}
