/*
 * A small Wazelo phone screen laid over a People photo, with a hand-drawn arrow
 * pointing at the phone the person is holding. Built in markup (not baked into the
 * photo) so the chat text stays sharp. All positions are in the photo's own
 * 1024×1280 pixel space, so they hold at every width.
 *
 * The phone screen keeps fixed light colours in both site themes: it is a picture
 * of a phone, not part of the page chrome.
 */

export type PhonePeekData = {
  /** Screen box, % of the photo. */
  box: { left: number; top: number; width: number };
  /** Arrow path in photo pixels (viewBox 0 0 1024 1280), ending at the phone. */
  arrow: string;
  /** Where the held phone is, in photo pixels. */
  target: { x: number; y: number };
  name: string;
  source: string;
  incoming: string;
  reply: string;
  result: string;
};

export function PhonePeek({ d }: { d: PhonePeekData }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 @container">
      <svg viewBox="0 0 1024 1280" className="absolute inset-0 h-full w-full [filter:drop-shadow(0_2px_3px_rgb(0_0_0/0.45))]">
        <defs>
          <marker id="pp-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse" markerUnits="strokeWidth">
            <path d="M1 1 L8 5 L1 9" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>
        <path data-pk="arrow" d={d.arrow} fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" markerEnd="url(#pp-head)" />
        <circle data-pk="ring" cx={d.target.x} cy={d.target.y} r="48" fill="none" stroke="#fff" strokeWidth="7" strokeDasharray="12 10" />
      </svg>

      <div
        data-pk="phone"
        className="absolute rounded-[3.2cqw] bg-[#17130f] p-[0.9cqw] shadow-[0_18px_40px_-12px_rgb(0_0_0/0.6)]"
        style={{ left: `${d.box.left}%`, top: `${d.box.top}%`, width: `${d.box.width}%` }}
      >
        <div className="overflow-hidden rounded-[2.5cqw] bg-[#efe7dc] text-[#17130f]">
          {/* App bar */}
          <div className="flex items-center gap-[1.6cqw] bg-white px-[2.2cqw] py-[1.8cqw]">
            <span className="grid size-[5.6cqw] shrink-0 place-items-center rounded-full bg-[#c2410c] text-[2.6cqw] font-semibold text-white">
              {d.name[0]}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[2.9cqw] font-semibold">{d.name}</span>
              <span className="block truncate text-[2.2cqw] text-[#5e554b]">{d.source}</span>
            </span>
          </div>
          {/* Chat */}
          <div className="space-y-[1.4cqw] px-[1.8cqw] py-[2cqw] text-[2.6cqw] leading-snug">
            <p className="mr-[5cqw] rounded-[1.8cqw] rounded-tl-[0.4cqw] bg-white px-[2cqw] py-[1.3cqw] shadow-sm">{d.incoming}</p>
            <div className="ml-[5cqw] rounded-[1.8cqw] rounded-tr-[0.4cqw] bg-[#d9fdd3] px-[2cqw] py-[1.3cqw] shadow-sm">
              <span className="mb-[0.4cqw] block text-[1.9cqw] font-semibold uppercase tracking-wider text-[#1f7a4d]">Auto-reply · 4s</span>
              {d.reply}
            </div>
            <p className="flex items-center justify-center gap-[1cqw] rounded-full bg-[#c2410c] px-[2cqw] py-[1.1cqw] text-center text-[2.3cqw] font-semibold text-white">
              <span>✓</span>
              {d.result}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Keyed by photo file name. India visitors see the first three, everyone else the
 * last three (see People in story-sections). */
export const PHONE_PEEKS: Record<string, PhonePeekData> = {
  /* ── India ── */
  realty: {
    box: { left: 4, top: 4, width: 38 },
    arrow: "M250 620 C 230 690, 255 740, 300 772",
    target: { x: 315, y: 830 },
    name: "Karthik",
    source: "Site visit · from Instagram",
    incoming: "Is the 2BHK in Velachery still free? Can I see it this weekend?",
    reply: "Yes! Pick a slot: Sat 11 AM or Sun 4 PM.",
    result: "Visit booked · Sat 11 AM",
  },
  "coaching-office": {
    box: { left: 59, top: 3, width: 38 },
    arrow: "M600 330 C 400 380, 330 640, 380 850",
    target: { x: 395, y: 915 },
    name: "Divya",
    source: "Course enquiry · website",
    incoming: "What's the fee for the NEET crash course?",
    reply: "₹18,000. Batch starts 2 Dec. Brochure attached.",
    result: "Follow-up set",
  },
  boutique: {
    box: { left: 3, top: 3, width: 38 },
    arrow: "M290 575 C 300 615, 335 640, 385 648",
    target: { x: 440, y: 665 },
    name: "Revathi",
    source: "Saree enquiry · WhatsApp",
    incoming: "Price for the cream cotton saree?",
    reply: "₹2,450. 3 colours in stock. Want photos?",
    result: "Saved as Hot lead",
  },

  /* ── Everyone else ── */
  "intl-realty": {
    box: { left: 4, top: 4, width: 38 },
    arrow: "M235 640 C 230 720, 265 800, 322 852",
    target: { x: 370, y: 892 },
    name: "Omar",
    source: "Viewing request · Instagram",
    incoming: "Is the 2-bed in Dubai Marina still available? Can I view it Saturday?",
    reply: "Yes! Pick a slot: Sat 11 AM or Sun 4 PM.",
    result: "Viewing booked · Sat",
  },
  "intl-school": {
    box: { left: 4, top: 3, width: 38 },
    arrow: "M235 620 C 235 670, 270 705, 330 728",
    target: { x: 385, y: 775 },
    name: "Lucas",
    source: "Course enquiry · website",
    incoming: "How much is the evening English course?",
    reply: "$120 a month. Next class starts Monday. Details attached.",
    result: "Follow-up set",
  },
  "intl-boutique": {
    box: { left: 4, top: 3, width: 38 },
    arrow: "M445 330 C 500 335, 545 365, 578 405",
    target: { x: 632, y: 450 },
    name: "Amaka",
    source: "Dress enquiry · WhatsApp",
    incoming: "How much for the yellow ankara gown?",
    reply: "$45. Sizes S to XL in stock. Want photos?",
    result: "Saved as Hot lead",
  },
};
