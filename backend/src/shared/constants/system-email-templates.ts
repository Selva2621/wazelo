/**
 * Ready-made email templates every workspace starts with (like the WhatsApp ones).
 * Fields: {{name}} = first name, {{company}} = the business name. Blank line = new paragraph.
 */
export interface SystemEmailTemplate {
  name: string;
  subject: string;
  body: string;
}

/** Businesses (shops, clinics, agencies…) */
export const BUSINESS_EMAIL_TEMPLATES: SystemEmailTemplate[] = [
  {
    name: 'Welcome',
    subject: 'Welcome to {{company}}, {{name}}!',
    body: `Hi {{name}},

Thanks for connecting with {{company}}. We're glad you're here.

If you have any questions, just reply to this email and our team will help you.

Warm regards,
{{company}}`,
  },
  {
    name: 'Thanks for your enquiry',
    subject: 'We got your message, {{name}}',
    body: `Hi {{name}},

Thank you for reaching out to {{company}}. We've received your enquiry and someone from our team will get back to you shortly.

Meanwhile, feel free to reply here with any details that can help us.

Thanks,
{{company}}`,
  },
  {
    name: 'Follow-up',
    subject: 'Following up, {{name}}',
    body: `Hi {{name}},

Just checking in on your recent enquiry with {{company}}. Is there anything else you'd like to know?

Reply to this email and we'll be happy to help.

Best,
{{company}}`,
  },
  {
    name: 'Special offer',
    subject: 'A special offer for you, {{name}}',
    body: `Hi {{name}},

We have a special offer for our customers at {{company}} this week.

Reply to this email to know more or to claim it before it ends.

Cheers,
{{company}}`,
  },
  {
    name: 'Order / booking confirmed',
    subject: 'Your order with {{company}} is confirmed',
    body: `Hi {{name}},

Thank you! Your order / booking with {{company}} is confirmed.

We'll keep you posted on the next steps. If anything changes, just reply to this email.

Thanks,
{{company}}`,
  },
  {
    name: 'Feedback request',
    subject: 'How did we do, {{name}}?',
    body: `Hi {{name}},

Thank you for choosing {{company}}. We'd love to hear how your experience was.

Just reply to this email with a few words. It really helps us get better.

Thank you,
{{company}}`,
  },
  {
    name: 'We miss you',
    subject: "It's been a while, {{name}}",
    body: `Hi {{name}},

We haven't heard from you in a while and wanted to say hello from {{company}}.

If there's anything we can help you with, just reply to this email.

Warm regards,
{{company}}`,
  },
];

/** Freelancers (designers, developers, consultants…) */
export const FREELANCER_EMAIL_TEMPLATES: SystemEmailTemplate[] = [
  {
    name: 'Introduction',
    subject: 'Nice to meet you, {{name}}',
    body: `Hi {{name}},

Thanks for getting in touch. I'm {{company}}, and I'd love to hear more about your project.

Could you share what you need and your timeline? I'll reply with how I can help.

Best,
{{company}}`,
  },
  {
    name: 'Proposal follow-up',
    subject: 'Any questions on the proposal, {{name}}?',
    body: `Hi {{name}},

Just following up on the proposal I sent. Happy to walk you through it or adjust anything to fit your needs.

Let me know a good time to talk.

Thanks,
{{company}}`,
  },
  {
    name: 'Project kickoff',
    subject: "Let's get started, {{name}}",
    body: `Hi {{name}},

Thank you for choosing to work with me. I'm excited to get started!

Next, I'll share the plan and the first milestone. If you have files or details to send, just reply to this email.

Best,
{{company}}`,
  },
  {
    name: 'Payment reminder',
    subject: 'Friendly payment reminder',
    body: `Hi {{name}},

A friendly reminder that the payment for our recent work is due.

If you've already paid, please ignore this email. Thank you!

Best,
{{company}}`,
  },
  {
    name: 'Review request',
    subject: 'Could you share a quick review, {{name}}?',
    body: `Hi {{name}},

It was great working with you. If you were happy with the work, a short review would mean a lot to me.

Just reply to this email with a few words.

Thank you,
{{company}}`,
  },
];
