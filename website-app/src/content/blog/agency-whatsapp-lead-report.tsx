import { A, Callout, H2, H3, P, UL } from "@/components/blog/post-parts";

// Post #10 from reference/content-strategy.md (pillar: Selling on WhatsApp, agency spoke).
// Wazelo features named here are verified: a brand per client with its lead forms,
// analytics (reply times, conversions, team performance) with CSV export, campaign
// delivery tracking, and a deals pipeline. No per-client analytics filter is claimed.

export const toc = [
  { id: "agree-first", label: "Agree the definitions first" },
  { id: "sources", label: "Where the numbers come from" },
  { id: "template", label: "The monthly report template" },
  { id: "example", label: "An example page one" },
  { id: "avoid", label: "Numbers that mislead" },
  { id: "setup", label: "Setting up for clean reports" },
];

export default function Post() {
  return (
    <>
      <P>
        Clients don&apos;t renew because you sent a lot of WhatsApp messages. They renew because they can see how many enquiries came in, how fast each one got
        a reply and how many turned into customers. This guide gives agencies a monthly report structure that shows exactly that.
      </P>

      <H2 id="agree-first">Agree the definitions first</H2>
      <P>Most reporting arguments are about words, not numbers. Before the first month, agree with the client in writing what these mean:</P>
      <UL>
        <li>
          <strong className="text-ink">Lead:</strong> a form submission, a WhatsApp chat from an ad, or both.
        </li>
        <li>
          <strong className="text-ink">Replied:</strong> the lead received a first message. Separate the automatic welcome from the first human reply.
        </li>
        <li>
          <strong className="text-ink">Qualified:</strong> the client&apos;s rule, such as &ldquo;budget confirmed&rdquo; or &ldquo;booked a call&rdquo;.
        </li>
        <li>
          <strong className="text-ink">Won:</strong> paid, signed or booked, and who confirms it: you or the client.
        </li>
      </UL>

      <H2 id="sources">Where the numbers come from</H2>
      <UL>
        <li>
          <strong className="text-ink">Meta Ads Manager:</strong> ad spend, leads per campaign and cost per lead.
        </li>
        <li>
          <strong className="text-ink">Your WhatsApp CRM:</strong> leads received, reply times, conversations, campaign delivery and deals won or lost.
        </li>
        <li>
          <strong className="text-ink">The client:</strong> sales that closed offline, and their value, if they share it.
        </li>
      </UL>
      <P>
        Cost per lead alone flatters cheap campaigns that bring poor leads. Joining the ad spend to deals won gives cost per customer, the number clients care
        about.
      </P>

      <H2 id="template">The monthly report template</H2>
      <H3>Page 1: the headline</H3>
      <UL>
        <li>Leads this month, and the change from last month.</li>
        <li>Share of leads that got a first reply within 5 minutes, and a human reply within 30 minutes.</li>
        <li>Qualified leads, booked calls or visits, and customers won.</li>
        <li>Ad spend, cost per lead and cost per customer won.</li>
      </UL>
      <H3>Page 2: the funnel</H3>
      <P>Leads, then replied, then qualified, then booked, then won, with the percentage at each step. The biggest drop is where next month&apos;s work goes.</P>
      <H3>Page 3: speed and the team</H3>
      <UL>
        <li>Median time to first reply and to first human contact.</li>
        <li>Leads still waiting for contact at the end of the month.</li>
        <li>Replies and conversions by team member, if the client&apos;s team handles the chats.</li>
      </UL>
      <H3>Page 4: campaigns and follow-up</H3>
      <UL>
        <li>For each WhatsApp campaign: sent, delivered, read and replies.</li>
        <li>For follow-up sequences: which step got the replies.</li>
        <li>Meta&apos;s message charges for the month, if you pay them on the client&apos;s behalf.</li>
      </UL>
      <H3>Page 5: what we changed, and what&apos;s next</H3>
      <P>Three lines on what you changed this month and three on what you will try next. This page is the one clients quote to their own managers.</P>

      <H2 id="example">An example page one</H2>
      <P>Made-up numbers, to show the shape:</P>
      <Callout>
        <strong>November: Green Park Residences</strong>
        <br />
        412 leads (up 18%) · 96% got a reply within 5 minutes · 71% got a human reply within 30 minutes
        <br />
        88 qualified · 41 site visits booked · 9 bookings
        <br />
        Ad spend ₹1,20,000 · ₹291 per lead · ₹13,333 per booking
      </Callout>

      <H2 id="avoid">Numbers that mislead</H2>
      <UL>
        <li>
          <strong className="text-ink">Messages sent:</strong> grows when you send more, not when you sell more.
        </li>
        <li>
          <strong className="text-ink">Read rate on its own:</strong> people can turn off read receipts, so it undercounts, and reading isn&apos;t replying.
        </li>
        <li>
          <strong className="text-ink">Averages for reply time:</strong> one lead answered after a weekend drags the average up. Use the median and the share
          answered within your target.
        </li>
      </UL>

      <H2 id="setup">Setting up for clean reports</H2>
      <P>Reports are only as clean as the setup behind them. In Wazelo:</P>
      <UL>
        <li>Create a brand for each client and link that client&apos;s lead forms to it, so their leads, teams and campaign audiences stay separate.</li>
        <li>Move every lead through the deals pipeline to won or lost, so the funnel counts are real.</li>
        <li>
          Export <A href="/features/analytics">analytics</A> as CSV each month for reply times, conversions and team performance, and use{" "}
          <A href="/features/campaigns">campaign</A> delivery tracking for page 4.
        </li>
      </UL>
      <P>
        See how agencies run it day to day in <A href="/use-cases/agencies">Wazelo for agencies</A>, and how fast replies affect results in{" "}
        <A href="/blog/speed-to-lead-statistics">speed-to-lead statistics</A>.
      </P>
    </>
  );
}
