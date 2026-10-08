// Scripted product stories for the homepage. One beat drives both devices:
// the phone shows the customer's WhatsApp, the laptop shows Wazelo.
// Features used here match what each account type gets in the app
// (OrgType FREELANCER vs TEAM): freelancers get Lead Scraper, pipeline,
// templates, button messages and sequences; teams add shared inbox, automation
// rules, AI and CSAT. Only claims listed as Real in
// reference/website-product-facts.md belong here.

export type ChatItem =
  /** From the business (freelancer or agent) to the customer. */
  | { kind: "biz"; text: string; time: string }
  /** From the customer. */
  | { kind: "customer"; text: string; time: string }
  /** Rich template with an image and quick-reply buttons. */
  | { kind: "rich"; id: string; art: "proposal" | "listing"; text: string; time: string; buttons: string[] }
  /** The customer taps a quick-reply button on a rich message. */
  | { kind: "press"; target: string; button: string }
  /** Business side is typing. */
  | { kind: "typing" }
  /** Internal note: shown in Wazelo only, never on the customer's phone. */
  | { kind: "note"; text: string };

export interface Beat {
  title: string;
  body: string;
  chat: ChatItem[];
}

export interface Story {
  id: "freelancer" | "team";
  tab: string;
  who: string;
  phoneContact: { name: string; initials: string; subtitle: string; verified?: boolean };
  beats: Beat[];
}

export const freelancerStory: Story = {
  id: "freelancer",
  tab: "Freelancer",
  who: "Riya Kapoor, UI/UX designer in Chennai, wins a website project from Bloom Bakery.",
  phoneContact: { name: "Riya Kapoor", initials: "RK", subtitle: "UI/UX designer", verified: true },
  beats: [
    {
      title: "Find the client",
      body: "Lead Scraper finds Bloom Bakery on Google Maps. One click imports it as a New lead.",
      chat: [],
    },
    {
      title: "Say hello",
      body: "Send an intro template. The chat is saved on the lead, not just on your phone.",
      chat: [
        { kind: "biz", text: "Hi Arjun, I'm Riya, a UI/UX designer in Chennai. Loved Bloom Bakery's reviews. Can I share an idea for your website?", time: "10:38" },
        { kind: "customer", text: "Sure, send it over", time: "10:40" },
      ],
    },
    {
      title: "Send a message with buttons",
      body: "Arjun answers in one tap. The lead moves to Interested.",
      chat: [
        { kind: "rich", id: "proposal", art: "proposal", text: "Here's my idea for the Bloom Bakery homepage. Want to talk it through?", time: "10:42", buttons: ["Book a call", "Maybe later"] },
        { kind: "press", target: "proposal", button: "Book a call" },
        { kind: "customer", text: "Book a call", time: "10:43" },
        { kind: "biz", text: "Great, booked for Tue, 11 AM. Talk then!", time: "10:43" },
      ],
    },
    {
      title: "Follow up on autopilot",
      body: "A sequence nudges Arjun after the call. It stops when he replies, and you move him to Converted.",
      chat: [
        { kind: "biz", text: "Hi Arjun, any thoughts on the homepage plan from our call?", time: "18:00" },
        { kind: "customer", text: "Loved it. Let's go ahead!", time: "12:10" },
      ],
    },
    {
      title: "Deliver and close",
      body: "Share the finished site, then drag the lead to Closed. Closed This Month ticks up.",
      chat: [
        { kind: "biz", text: "The new Bloom Bakery website is live! Thanks for the project, Arjun.", time: "12:14" },
        { kind: "customer", text: "Looks great, thank you!", time: "12:31" },
        { kind: "typing" },
        { kind: "biz", text: "Glad you like it! Would you share a two-line review?", time: "12:32" },
      ],
    },
  ],
};

export const teamStory: Story = {
  id: "team",
  tab: "Team",
  who: "Harbor Homes, a 12-agent realty team in Pune, turns an evening enquiry into a site visit.",
  phoneContact: { name: "Harbor Homes", initials: "HH", subtitle: "Business account", verified: true },
  beats: [
    {
      title: "A buyer writes in",
      body: "Kunal taps your property ad and messages on WhatsApp. The chat lands in the shared inbox for the whole team.",
      chat: [{ kind: "customer", text: "Hi, is the 2BHK in Baner still available?", time: "19:52" }],
    },
    {
      title: "Route it instantly",
      body: "An automation rule replies in seconds and assigns the chat to Meera in sales.",
      chat: [
        { kind: "biz", text: "Hi Kunal, thanks for reaching Harbor Homes! Meera from our sales team will help you shortly.", time: "19:52" },
        { kind: "note", text: "Auto-assigned to Meera Joshi" },
      ],
    },
    {
      title: "Reply with AI help",
      body: "AI suggests a reply. Meera checks it and sends it with the brochure.",
      chat: [
        { kind: "typing" },
        { kind: "rich", id: "listing", art: "listing", text: "Yes, it's available! 2BHK, 1,050 sq ft, ₹78 L. Want to visit this weekend?", time: "19:56", buttons: ["Sat, 11 AM", "Sun, 4 PM"] },
      ],
    },
    {
      title: "Book the site visit",
      body: "Kunal picks a slot. His lead status moves to Interested.",
      chat: [
        { kind: "press", target: "listing", button: "Sat, 11 AM" },
        { kind: "customer", text: "Sat, 11 AM", time: "19:58" },
        { kind: "biz", text: "Done! See you Saturday, 11 AM at Baner Heights.", time: "19:58" },
        { kind: "note", text: "Lead status changed to Interested" },
      ],
    },
    {
      title: "Close the loop",
      body: "After the visit, Meera sends a CSAT survey. Ratings show up per agent.",
      chat: [
        { kind: "biz", text: "How was your visit with Meera? Rate us 1 to 5.", time: "13:05" },
        { kind: "customer", text: "5, she was really helpful", time: "13:09" },
        { kind: "note", text: "CSAT 5/5 recorded. Chat closed" },
      ],
    },
  ],
};

export const stories = [freelancerStory, teamStory] as const;

/** Every chat item visible at (beat, revealed): earlier beats in full, then the current beat's first `revealed` items. */
export function visibleItems(story: Story, beat: number, revealed: number) {
  const out: { key: string; item: ChatItem }[] = [];
  story.beats.forEach((b, bi) => {
    if (bi > beat) return;
    const count = bi < beat ? b.chat.length : revealed;
    b.chat.slice(0, count).forEach((item, i) => out.push({ key: `${bi}-${i}`, item }));
  });
  return out;
}
