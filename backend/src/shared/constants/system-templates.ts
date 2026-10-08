/**
 * System WhatsApp message templates seeded per org by the onboarding job.
 *
 * Differentiated from user-created templates by:
 *   - exampleValues.isSystemTemplate: true
 *   - status: 'PENDING'          (not yet submitted to / approved by Meta)
 *   - whatsappTemplateId: null   (no Meta template ID yet)
 *
 * Shopify templates go to every org; freelancer templates only to
 * orgs with orgType = FREELANCER.
 */

export interface SystemTemplate {
  name: string;
  category: string;
  language: string;
  body: string;
  /** Extra keys stored in exampleValues alongside isSystemTemplate */
  meta: Record<string, string>;
}

const shopify = (name: string, shopifyType: string, body: string): SystemTemplate => ({
  name,
  category: 'SHOPIFY',
  language: 'en',
  body,
  meta: { shopifyType },
});

const freelancer = (
  name: string,
  category: 'MARKETING' | 'UTILITY',
  freelancerType: string,
  description: string,
  body: string,
): SystemTemplate => ({
  name,
  category,
  language: 'en',
  body,
  meta: { freelancerType, description },
});

export const SHOPIFY_SYSTEM_TEMPLATES: SystemTemplate[] = [
  shopify(
    'shopify_order_confirmation',
    'order_confirmation',
    "Hi {{contact.name}}, your order {{shopify.order_name}} for ₹{{shopify.total_price}} has been confirmed! We'll notify you when it ships.",
  ),
  shopify(
    'shopify_order_fulfilled',
    'order_fulfilled',
    'Hi {{contact.name}}, great news! Your order {{shopify.order_name}} has been shipped 🚚. Track your delivery and let us know if you need help.',
  ),
  shopify(
    'shopify_cart_abandoned',
    'cart_abandoned',
    'Hi {{contact.name}}, you left items in your cart worth ₹{{shopify.cart_total}}. Complete your order here: {{shopify.recovery_url}}',
  ),
  shopify(
    'shopify_post_purchase',
    'post_purchase',
    'Hi {{contact.name}}, thank you for your order {{shopify.order_name}}! We hope you love it. Reply anytime if you need support.',
  ),
  shopify(
    'shopify_order_cancelled',
    'order_cancelled',
    'Hi {{contact.name}}, your order {{shopify.order_name}} has been cancelled. Your refund of ₹{{shopify.total_price}} will be processed within 5-7 business days.',
  ),
];

export const FREELANCER_SYSTEM_TEMPLATES: SystemTemplate[] = [
  // ── Lead & Outreach ────────────────────────────────────────────────────
  freelancer(
    'freelancer_lead_intro',
    'MARKETING',
    'lead_intro',
    'Cold outreach intro — personalised by service type',
    "Hi {{contact.name}}! I'm {{org.name}}, a freelancer specialising in {{lead.service}}. I noticed your business could benefit from my services. Would you like a quick 15-min call to explore how I can help? 🚀",
  ),
  freelancer(
    'freelancer_lead_followup',
    'MARKETING',
    'lead_followup',
    'Follow-up after no reply to initial outreach',
    "Hi {{contact.name}}, just following up on my earlier message about {{lead.service}}. I'd love to show you how I've helped similar clients. Are you available for a quick call this week?",
  ),
  freelancer(
    'freelancer_lead_qualified',
    'UTILITY',
    'lead_qualified',
    'Confirm a qualified lead and set proposal expectation',
    "Hi {{contact.name}}, thanks for your interest! Based on our conversation, I think I can definitely help with {{lead.requirement}}. I'll send over a detailed proposal by {{lead.proposal_date}}. Stay tuned! 📄",
  ),

  // ── Demo & Portfolio Links ─────────────────────────────────────────────
  freelancer(
    'freelancer_demo_intro',
    'MARKETING',
    'demo_intro',
    'Lead intro with demo / portfolio link attached',
    "Hi {{contact.name}}! I'm {{org.name}}, a {{lead.service}} specialist. I've put together a quick demo of how I can help your business — take a look here: {{lead.demo_link}} 👀 Would love to hear your thoughts!",
  ),
  freelancer(
    'freelancer_demo_followup',
    'MARKETING',
    'demo_followup',
    'Follow-up nudge after sharing a demo link',
    "Hi {{contact.name}}, did you get a chance to check out the demo I shared? 😊 Here's the link again in case it got buried: {{lead.demo_link}}. Happy to walk you through it live — just say the word!",
  ),
  freelancer(
    'freelancer_portfolio_share',
    'MARKETING',
    'portfolio_share',
    'Share portfolio link with a lead',
    "Hi {{contact.name}}, here's my portfolio showcasing recent {{lead.service}} work: {{lead.portfolio_link}} 🌟 You'll find case studies and client results in there. Let me know if anything catches your eye!",
  ),
  freelancer(
    'freelancer_case_study_share',
    'MARKETING',
    'case_study_share',
    'Share a relevant case study to build credibility',
    'Hi {{contact.name}}, I worked with a client similar to you in {{lead.industry}} and helped them achieve {{lead.result}}. Read the full case study here: {{lead.case_study_link}} 📈 Think we could do the same for you!',
  ),
  freelancer(
    'freelancer_live_demo_invite',
    'UTILITY',
    'live_demo_invite',
    'Invite lead to book a live personalised demo',
    "Hi {{contact.name}}, I'd love to give you a personalised live demo of {{lead.service}} tailored to your business. Book a free 20-min slot here: {{lead.booking_link}} 📅 No commitment — just a chance to see if it's a fit!",
  ),
  freelancer(
    'freelancer_demo_delivered',
    'UTILITY',
    'demo_delivered',
    'Send a recorded custom demo to a specific lead',
    "Hi {{contact.name}}, as discussed, here's the recorded demo of {{lead.project_name}} I built for your review: {{lead.demo_link}} 🎬 Let me know your feedback and I can tweak anything before we finalise!",
  ),

  // ── Proposal & Quotation ───────────────────────────────────────────────
  freelancer(
    'freelancer_proposal_sent',
    'UTILITY',
    'proposal_sent',
    'Notify client that proposal has been sent via email',
    "Hi {{contact.name}}, I've just sent across the proposal for {{lead.project_name}} to your email. It covers the scope, timeline ({{lead.timeline}}), and pricing. Please review and let me know if you have any questions! 🙏",
  ),
  freelancer(
    'freelancer_proposal_followup',
    'MARKETING',
    'proposal_followup',
    'Follow-up after proposal sent but no response',
    'Hi {{contact.name}}, just checking in — did you get a chance to review the proposal for {{lead.project_name}}? Happy to jump on a call to walk you through it or answer any questions. Let me know! 😊',
  ),
  freelancer(
    'freelancer_proposal_accepted',
    'UTILITY',
    'proposal_accepted',
    'Confirm proposal acceptance and next steps',
    "Hi {{contact.name}}, great news — you've accepted the proposal for {{lead.project_name}}! 🎉 I'll send over the contract and invoice shortly. We'll kick off on {{lead.start_date}}. Excited to work with you!",
  ),

  // ── Contract & Onboarding ──────────────────────────────────────────────
  freelancer(
    'freelancer_contract_sent',
    'UTILITY',
    'contract_sent',
    'Notify client that contract is ready for signing',
    'Hi {{contact.name}}, your contract for {{lead.project_name}} has been sent to {{contact.email}}. Please sign it at your earliest convenience so we can get started. Let me know if anything needs clarification! ✍️',
  ),
  freelancer(
    'freelancer_onboarding_welcome',
    'UTILITY',
    'onboarding_welcome',
    'Welcome message after contract is signed',
    "Welcome aboard, {{contact.name}}! 🙌 I'm thrilled to start working on {{lead.project_name}}. I'll share the project brief and access details by {{lead.kickoff_date}}. Feel free to reach me here on WhatsApp anytime.",
  ),

  // ── Project Updates ────────────────────────────────────────────────────
  freelancer(
    'freelancer_project_update',
    'UTILITY',
    'project_update',
    'Weekly / milestone project progress update',
    "Hi {{contact.name}}, quick update on {{lead.project_name}}: {{lead.update_message}}. We're currently at {{lead.progress}}% completion and on track to deliver by {{lead.deadline}}. Let me know if you have any feedback! 💪",
  ),
  freelancer(
    'freelancer_project_milestone',
    'UTILITY',
    'project_milestone',
    'Notify client on milestone completion for review',
    'Hi {{contact.name}}, milestone reached for {{lead.project_name}}! ✅ {{lead.milestone_name}} is now complete. Please review and share your feedback so we can move to the next phase.',
  ),
  freelancer(
    'freelancer_project_delivered',
    'UTILITY',
    'project_delivered',
    'Final delivery notification with link',
    "Hi {{contact.name}}, {{lead.project_name}} is delivered! 🎉 Please find the final files at {{lead.delivery_link}}. It's been a pleasure working with you. Do drop a review if you're happy with the work — it means a lot!",
  ),

  // ── Invoice & Payment ──────────────────────────────────────────────────
  freelancer(
    'freelancer_invoice_sent',
    'UTILITY',
    'invoice_sent',
    'Notify client that invoice has been emailed',
    'Hi {{contact.name}}, your invoice #{{lead.invoice_number}} for ₹{{lead.invoice_amount}} ({{lead.project_name}}) has been sent to {{contact.email}}. Payment is due by {{lead.due_date}}. Thank you! 🙏',
  ),
  freelancer(
    'freelancer_invoice_reminder',
    'UTILITY',
    'invoice_reminder',
    'Payment due-date reminder',
    'Hi {{contact.name}}, a gentle reminder that invoice #{{lead.invoice_number}} for ₹{{lead.invoice_amount}} is due on {{lead.due_date}}. Please let me know if you need any details. Thank you!',
  ),
  freelancer(
    'freelancer_payment_received',
    'UTILITY',
    'payment_received',
    'Confirm payment receipt to client',
    'Hi {{contact.name}}, payment of ₹{{lead.invoice_amount}} for invoice #{{lead.invoice_number}} received! ✅ Thank you so much. Looking forward to working with you again. 😊',
  ),

  // ── Meeting & Scheduling ───────────────────────────────────────────────
  freelancer(
    'freelancer_meeting_confirm',
    'UTILITY',
    'meeting_confirm',
    'Meeting / call confirmation with link',
    'Hi {{contact.name}}, confirming our call on {{lead.meeting_date}} at {{lead.meeting_time}} ({{lead.timezone}}). Join here: {{lead.meeting_link}}. See you then! 📞',
  ),
  freelancer(
    'freelancer_meeting_reminder',
    'UTILITY',
    'meeting_reminder',
    '30-minute pre-call reminder',
    'Hi {{contact.name}}, just a reminder — we have a call in 30 minutes at {{lead.meeting_time}}! Join here: {{lead.meeting_link}}. Talk soon! ⏰',
  ),
  freelancer(
    'freelancer_meeting_reschedule',
    'UTILITY',
    'meeting_reschedule',
    'Request to reschedule a meeting',
    'Hi {{contact.name}}, I need to reschedule our call originally set for {{lead.old_meeting_date}}. Could we move it to {{lead.new_meeting_date}} at {{lead.meeting_time}}? Let me know if that works for you!',
  ),

  // ── Re-engagement & Upsell ─────────────────────────────────────────────
  freelancer(
    'freelancer_reengagement',
    'MARKETING',
    'reengagement',
    'Re-engage past leads or clients who went cold',
    "Hi {{contact.name}}, it's been a while! Hope things are going well with your business. I'm currently taking on new projects in {{lead.service}} — would you be open to a quick chat about your upcoming needs? 🙂",
  ),
  freelancer(
    'freelancer_referral_request',
    'MARKETING',
    'referral_request',
    'Ask a happy client for a referral',
    'Hi {{contact.name}}, loved working on {{lead.project_name}} with you! If you know anyone who could use my {{lead.service}} services, a referral would mean the world to me. I offer a {{lead.referral_discount}} discount for referrals! 🙏',
  ),
  freelancer(
    'freelancer_testimonial_request',
    'MARKETING',
    'testimonial_request',
    'Request a testimonial / review after project completion',
    "Hi {{contact.name}}, thank you for choosing me for {{lead.project_name}}! If you're happy with the results, could you spare 2 minutes to leave a quick review? It really helps other businesses find me. 🌟",
  ),
];
