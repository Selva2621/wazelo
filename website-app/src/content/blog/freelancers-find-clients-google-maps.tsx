import { A, Callout, H2, H3, P, Schedule, Template, UL } from "@/components/blog/post-parts";

// Post #8 from reference/content-strategy.md (pillar: Selling on WhatsApp, freelancer spoke).
// Follows WhatsApp's opt-in rule (Business Messaging Policy, read 2026-11-21): businesses
// found on Google Maps haven't agreed to hear from you, so first contact is by call or
// email, and WhatsApp starts only once they say yes.

export const toc = [
  { id: "niche", label: "1. Pick a niche and a city" },
  { id: "search", label: "2. Search Google Maps" },
  { id: "shortlist", label: "3. Shortlist with one reason each" },
  { id: "ask-first", label: "4. Ask before you WhatsApp" },
  { id: "pitch", label: "5. Pitch on WhatsApp" },
  { id: "proposal", label: "6. Proposal and follow-up" },
  { id: "pipeline", label: "7. Keep a pipeline" },
];

export default function Post() {
  return (
    <>
      <P>
        Google Maps is a free list of every local business that could hire you, with phone numbers, websites, photos and reviews. This guide shows a freelancer
        how to turn it into clients: find the right businesses, contact them in a way WhatsApp allows, and follow up until you get a yes or a no.
      </P>

      <H2 id="niche">1. Pick a niche and a city</H2>
      <P>
        &ldquo;Businesses&rdquo; is too broad to search. Pick one type of business and one area, such as bakeries in Coimbatore, dental clinics in Dubai or gyms
        in Manchester. A narrow niche lets you reuse the same pitch and show the same kind of work.
      </P>

      <H2 id="search">2. Search Google Maps for businesses that need you</H2>
      <P>Look for signs that match what you sell:</P>
      <UL>
        <li>Web designers: no website, or a site that is slow or broken on a phone.</li>
        <li>Photographers: few photos, or dark, blurry ones.</li>
        <li>Social media and marketing freelancers: good reviews but no Instagram, or an account that hasn&apos;t posted in months.</li>
        <li>Copywriters and translators: thin descriptions, or listings in only one language for a mixed-language area.</li>
      </UL>
      <P>
        Wazelo&apos;s <A href="/features/lead-finder">lead finder</A> runs this search for you by category and city on Google Maps (and IndiaMART in India). You
        review the results and add the ones you want as leads.
      </P>

      <H2 id="shortlist">3. Shortlist 20, with one reason each</H2>
      <P>
        Twenty is enough for a week. For each one, write down the single specific thing you would fix: &ldquo;no menu on the website&rdquo;, &ldquo;last
        Instagram post in March&rdquo;. That one line becomes your pitch.
      </P>

      <H2 id="ask-first">4. Ask before you WhatsApp</H2>
      <Callout>
        WhatsApp&apos;s Business Messaging Policy only lets you message people who gave you their number and agreed to hear from you. A number on Google Maps is
        public, but the business hasn&apos;t agreed to messages from you. Sending cold pitches on WhatsApp risks your number being restricted.
      </Callout>
      <P>So make the first contact somewhere else, and ask if you can continue on WhatsApp:</P>
      <UL>
        <li>A short phone call to the number on the listing.</li>
        <li>An email, or the contact form on their website.</li>
        <li>A visit, if they are nearby.</li>
      </UL>
      <Template title="Opening call or email" category="Not WhatsApp">
        {"Hi, I'm Arun, a web designer in Coimbatore. I noticed your bakery's Google listing has no website, so customers can't see your menu.\nI've built sites for two cafés nearby. Can I send you an example on WhatsApp?"}
      </Template>
      <P>
        When they say yes, note it on the contact. For why this matters and what happens to numbers that skip it, see{" "}
        <A href="/blog/whatsapp-number-banned-or-limited">why WhatsApp numbers get limited or banned</A>.
      </P>

      <H2 id="pitch">5. Pitch on WhatsApp, once they&apos;ve said yes</H2>
      <P>Keep the first WhatsApp message to three parts: the specific thing, one example, one question.</P>
      <Template title="First WhatsApp message" category="Marketing">
        {"Hi {{1}}, thanks for taking my call. Here's the café site I mentioned: {{2}}.\nFor your bakery I'd add the menu, opening hours and a WhatsApp order button. Shall I send a quote?"}
      </Template>
      <P>
        If they reply, a 24-hour window opens and you can carry on with normal messages.{" "}
        <A href="/blog/whatsapp-24-hour-rule">Here is how the 24-hour rule works</A>.
      </P>

      <H2 id="proposal">6. Send the proposal and follow up</H2>
      <P>
        Send the proposal while the conversation is warm. In Wazelo you send it on WhatsApp and the client accepts it from a link, so nothing waits on a printed
        or emailed PDF.
      </P>
      <Schedule
        title="After the proposal"
        steps={[
          { when: "Day 0", what: "Send the proposal they asked for, with its validity date.", kind: "Utility" },
          { when: "Day 4", what: "Ask if it covers what they need, and offer to adjust the scope.", kind: "Marketing" },
          { when: "Day 10", what: "A last note that leaves the door open.", kind: "Marketing" },
          { when: "On reply", what: "Stop the follow-ups and talk.", kind: "Stop" },
        ]}
      />
      <P>
        For the wording of each step, see the freelancer examples in <A href="/blog/whatsapp-follow-up-templates">17 follow-up templates</A>.
      </P>

      <H2 id="pipeline">7. Keep a pipeline</H2>
      <P>Move each business through the same stages, so you always know who needs a message today:</P>
      <UL>
        <li>Found → Contacted → Agreed to WhatsApp → Pitched → Proposal sent → Won or Lost.</li>
      </UL>
      <H3>Check these every Friday</H3>
      <UL>
        <li>How many you contacted, and how many agreed to WhatsApp. Few agreeing means the opening line needs to be more specific.</li>
        <li>How many pitches turned into a proposal request. Few means the example you send isn&apos;t close enough to their business.</li>
        <li>How many proposals were accepted. Few means price or scope is off, so ask the ones who said no.</li>
      </UL>
      <P>
        Wazelo&apos;s Solo plan is built for this: the lead finder, a client pipeline, 26 freelancer templates, proposals and follow-up sequences for one person.{" "}
        <A href="/use-cases/freelancers">See how it works for freelancers</A>.
      </P>
    </>
  );
}
