// Seed: Freelancer System Message Templates
// Run: node prisma/seed-freelancer-templates.js
//   or: node prisma/seed-freelancer-templates.js <orgId>   (specific org only)
//
// Seeds into FREELANCER orgs only by default (orgType = 'FREELANCER').
// Pass a specific orgId to target any org regardless of type.
//
// Template categories follow WhatsApp standards:
//   MARKETING  — promotional / outreach (requires Meta approval)
//   UTILITY    — transactional / status updates (requires Meta approval)
//
// Status: PENDING (not yet submitted to Meta)

'use strict';

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// ─── Template Definitions ──────────────────────────────────────────────────

const TEMPLATES = [
  // ── Lead & Outreach ────────────────────────────────────────────────────
  {
    name: 'freelancer_lead_intro',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}! I'm {{org.name}}, a freelancer specialising in {{lead.service}}. I noticed your business could benefit from my services. Would you like a quick 15-min call to explore how I can help? \uD83D\uDE80",
    description: 'Cold outreach intro — personalised by service type',
    freelancerType: 'lead_intro',
  },
  {
    name: 'freelancer_lead_followup',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}, just following up on my earlier message about {{lead.service}}. I'd love to show you how I've helped similar clients. Are you available for a quick call this week?",
    description: 'Follow-up after no reply to initial outreach',
    freelancerType: 'lead_followup',
  },
  {
    name: 'freelancer_lead_qualified',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, thanks for your interest! Based on our conversation, I think I can definitely help with {{lead.requirement}}. I'll send over a detailed proposal by {{lead.proposal_date}}. Stay tuned! \uD83D\uDCC4",
    description: 'Confirm a qualified lead and set proposal expectation',
    freelancerType: 'lead_qualified',
  },

  // ── Demo & Portfolio Links ─────────────────────────────────────────────
  {
    name: 'freelancer_demo_intro',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}! I'm {{org.name}}, a {{lead.service}} specialist. I've put together a quick demo of how I can help your business — take a look here: {{lead.demo_link}} \uD83D\uDC40 Would love to hear your thoughts!",
    description: 'Lead intro with demo / portfolio link attached',
    freelancerType: 'demo_intro',
  },
  {
    name: 'freelancer_demo_followup',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}, did you get a chance to check out the demo I shared? \uD83D\uDE0A Here's the link again in case it got buried: {{lead.demo_link}}. Happy to walk you through it live — just say the word!",
    description: 'Follow-up nudge after sharing a demo link',
    freelancerType: 'demo_followup',
  },
  {
    name: 'freelancer_portfolio_share',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}, here's my portfolio showcasing recent {{lead.service}} work: {{lead.portfolio_link}} \uD83C\uDF1F You'll find case studies and client results in there. Let me know if anything catches your eye!",
    description: 'Share portfolio link with a lead',
    freelancerType: 'portfolio_share',
  },
  {
    name: 'freelancer_case_study_share',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}, I worked with a client similar to you in {{lead.industry}} and helped them achieve {{lead.result}}. Read the full case study here: {{lead.case_study_link}} \uD83D\uDCC8 Think we could do the same for you!",
    description: 'Share a relevant case study to build credibility',
    freelancerType: 'case_study_share',
  },
  {
    name: 'freelancer_live_demo_invite',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, I'd love to give you a personalised live demo of {{lead.service}} tailored to your business. Book a free 20-min slot here: {{lead.booking_link}} \uD83D\uDCC5 No commitment — just a chance to see if it's a fit!",
    description: 'Invite lead to book a live personalised demo',
    freelancerType: 'live_demo_invite',
  },
  {
    name: 'freelancer_demo_delivered',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, as discussed, here's the recorded demo of {{lead.project_name}} I built for your review: {{lead.demo_link}} \uD83C\uDFAC Let me know your feedback and I can tweak anything before we finalise!",
    description: 'Send a recorded custom demo to a specific lead',
    freelancerType: 'demo_delivered',
  },

  // ── Proposal & Quotation ───────────────────────────────────────────────
  {
    name: 'freelancer_proposal_sent',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, I've just sent across the proposal for {{lead.project_name}} to your email. It covers the scope, timeline ({{lead.timeline}}), and pricing. Please review and let me know if you have any questions! \uD83D\uDE4F",
    description: 'Notify client that proposal has been sent via email',
    freelancerType: 'proposal_sent',
  },
  {
    name: 'freelancer_proposal_followup',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}, just checking in — did you get a chance to review the proposal for {{lead.project_name}}? Happy to jump on a call to walk you through it or answer any questions. Let me know! \uD83D\uDE0A",
    description: 'Follow-up after proposal sent but no response',
    freelancerType: 'proposal_followup',
  },
  {
    name: 'freelancer_proposal_accepted',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, great news — you've accepted the proposal for {{lead.project_name}}! \uD83C\uDF89 I'll send over the contract and invoice shortly. We'll kick off on {{lead.start_date}}. Excited to work with you!",
    description: 'Confirm proposal acceptance and next steps',
    freelancerType: 'proposal_accepted',
  },

  // ── Contract & Onboarding ──────────────────────────────────────────────
  {
    name: 'freelancer_contract_sent',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, your contract for {{lead.project_name}} has been sent to {{contact.email}}. Please sign it at your earliest convenience so we can get started. Let me know if anything needs clarification! \u270D\uFE0F",
    description: 'Notify client that contract is ready for signing',
    freelancerType: 'contract_sent',
  },
  {
    name: 'freelancer_onboarding_welcome',
    category: 'UTILITY',
    language: 'en',
    body: "Welcome aboard, {{contact.name}}! \uD83D\uDE4C I'm thrilled to start working on {{lead.project_name}}. I'll share the project brief and access details by {{lead.kickoff_date}}. Feel free to reach me here on WhatsApp anytime.",
    description: 'Welcome message after contract is signed',
    freelancerType: 'onboarding_welcome',
  },

  // ── Project Updates ────────────────────────────────────────────────────
  {
    name: 'freelancer_project_update',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, quick update on {{lead.project_name}}: {{lead.update_message}}. We're currently at {{lead.progress}}% completion and on track to deliver by {{lead.deadline}}. Let me know if you have any feedback! \uD83D\uDCAA",
    description: 'Weekly / milestone project progress update',
    freelancerType: 'project_update',
  },
  {
    name: 'freelancer_project_milestone',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, milestone reached for {{lead.project_name}}! \u2705 {{lead.milestone_name}} is now complete. Please review and share your feedback so we can move to the next phase.",
    description: 'Notify client on milestone completion for review',
    freelancerType: 'project_milestone',
  },
  {
    name: 'freelancer_project_delivered',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, {{lead.project_name}} is delivered! \uD83C\uDF89 Please find the final files at {{lead.delivery_link}}. It's been a pleasure working with you. Do drop a review if you're happy with the work — it means a lot!",
    description: 'Final delivery notification with link',
    freelancerType: 'project_delivered',
  },

  // ── Invoice & Payment ──────────────────────────────────────────────────
  {
    name: 'freelancer_invoice_sent',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, your invoice #{{lead.invoice_number}} for \u20b9{{lead.invoice_amount}} ({{lead.project_name}}) has been sent to {{contact.email}}. Payment is due by {{lead.due_date}}. Thank you! \uD83D\uDE4F",
    description: 'Notify client that invoice has been emailed',
    freelancerType: 'invoice_sent',
  },
  {
    name: 'freelancer_invoice_reminder',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, a gentle reminder that invoice #{{lead.invoice_number}} for \u20b9{{lead.invoice_amount}} is due on {{lead.due_date}}. Please let me know if you need any details. Thank you!",
    description: 'Payment due-date reminder',
    freelancerType: 'invoice_reminder',
  },
  {
    name: 'freelancer_payment_received',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, payment of \u20b9{{lead.invoice_amount}} for invoice #{{lead.invoice_number}} received! \u2705 Thank you so much. Looking forward to working with you again. \uD83D\uDE0A",
    description: 'Confirm payment receipt to client',
    freelancerType: 'payment_received',
  },

  // ── Meeting & Scheduling ───────────────────────────────────────────────
  {
    name: 'freelancer_meeting_confirm',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, confirming our call on {{lead.meeting_date}} at {{lead.meeting_time}} ({{lead.timezone}}). Join here: {{lead.meeting_link}}. See you then! \uD83D\uDCDE",
    description: 'Meeting / call confirmation with link',
    freelancerType: 'meeting_confirm',
  },
  {
    name: 'freelancer_meeting_reminder',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, just a reminder — we have a call in 30 minutes at {{lead.meeting_time}}! Join here: {{lead.meeting_link}}. Talk soon! \u23F0",
    description: '30-minute pre-call reminder',
    freelancerType: 'meeting_reminder',
  },
  {
    name: 'freelancer_meeting_reschedule',
    category: 'UTILITY',
    language: 'en',
    body: "Hi {{contact.name}}, I need to reschedule our call originally set for {{lead.old_meeting_date}}. Could we move it to {{lead.new_meeting_date}} at {{lead.meeting_time}}? Let me know if that works for you!",
    description: 'Request to reschedule a meeting',
    freelancerType: 'meeting_reschedule',
  },

  // ── Re-engagement & Upsell ─────────────────────────────────────────────
  {
    name: 'freelancer_reengagement',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}, it's been a while! Hope things are going well with your business. I'm currently taking on new projects in {{lead.service}} — would you be open to a quick chat about your upcoming needs? \uD83D\uDE42",
    description: 'Re-engage past leads or clients who went cold',
    freelancerType: 'reengagement',
  },
  {
    name: 'freelancer_referral_request',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}, loved working on {{lead.project_name}} with you! If you know anyone who could use my {{lead.service}} services, a referral would mean the world to me. I offer a {{lead.referral_discount}} discount for referrals! \uD83D\uDE4F",
    description: 'Ask a happy client for a referral',
    freelancerType: 'referral_request',
  },
  {
    name: 'freelancer_testimonial_request',
    category: 'MARKETING',
    language: 'en',
    body: "Hi {{contact.name}}, thank you for choosing me for {{lead.project_name}}! If you're happy with the results, could you spare 2 minutes to leave a quick review? It really helps other businesses find me. \uD83C\uDF1F",
    description: 'Request a testimonial / review after project completion',
    freelancerType: 'testimonial_request',
  },
];

// ─── Seed Logic ────────────────────────────────────────────────────────────

async function seedForOrg(orgId) {
  let created = 0;
  let updated = 0;

  for (const t of TEMPLATES) {
    const existing = await p.messageTemplate.findFirst({
      where: { orgId, name: t.name, language: t.language, deletedAt: null },
    });

    if (existing) {
      await p.messageTemplate.update({
        where: { id: existing.id },
        data: {
          category: t.category,
          status: 'PENDING',
          components: [{ type: 'BODY', text: t.body }],
          exampleValues: {
            isSystemTemplate: true,
            freelancerType: t.freelancerType,
            description: t.description,
          },
        },
      });
      updated++;
    } else {
      await p.messageTemplate.create({
        data: {
          orgId,
          channelId: null,
          name: t.name,
          language: t.language,
          category: t.category,
          status: 'PENDING',
          whatsappTemplateId: null,
          components: [{ type: 'BODY', text: t.body }],
          exampleValues: {
            isSystemTemplate: true,
            freelancerType: t.freelancerType,
            description: t.description,
          },
        },
      });
      created++;
    }
  }

  return { created, updated };
}

async function main() {
  const targetOrgId = process.argv[2] || null;

  let orgs;
  if (targetOrgId) {
    orgs = [{ id: targetOrgId, name: targetOrgId }];
  } else {
    orgs = await p.organization.findMany({
      where: { deletedAt: null, orgType: 'FREELANCER' },
      select: { id: true, name: true },
    });
  }

  if (orgs.length === 0) {
    console.log('No FREELANCER orgs found. Pass a specific orgId to seed any org:');
    console.log('  node prisma/seed-freelancer-templates.js <orgId>');
    return;
  }

  console.log(`Seeding freelancer system templates for ${orgs.length} org(s)...\n`);

  let totalCreated = 0;
  let totalUpdated = 0;

  for (const org of orgs) {
    const { created, updated } = await seedForOrg(org.id);
    console.log(`  \u2713 ${org.name} (${org.id}) \u2014 ${created} created, ${updated} updated`);
    totalCreated += created;
    totalUpdated += updated;
  }

  console.log(`\nDone! ${totalCreated} created, ${totalUpdated} updated across ${orgs.length} org(s).`);
  console.log('\nTemplate groups (20 total):');
  console.log('  Lead & Outreach     : freelancer_lead_intro, _followup, _qualified');
  console.log('  Proposal            : freelancer_proposal_sent, _followup, _accepted');
  console.log('  Contract/Onboarding : freelancer_contract_sent, freelancer_onboarding_welcome');
  console.log('  Project Updates     : freelancer_project_update, _milestone, _delivered');
  console.log('  Invoice & Payment   : freelancer_invoice_sent, _reminder, freelancer_payment_received');
  console.log('  Meeting             : freelancer_meeting_confirm, _reminder, _reschedule');
  console.log('  Re-engagement       : freelancer_reengagement, _referral_request, _testimonial_request');
  console.log('\nVariable reference:');
  console.log('  Contact : {{contact.name}}  {{contact.email}}  {{contact.phone}}');
  console.log('  Org     : {{org.name}}');
  console.log('  Lead    : {{lead.service}}  {{lead.project_name}}  {{lead.timeline}}  {{lead.start_date}}');
  console.log('            {{lead.deadline}}  {{lead.progress}}  {{lead.update_message}}');
  console.log('            {{lead.milestone_name}}  {{lead.delivery_link}}  {{lead.kickoff_date}}');
  console.log('            {{lead.proposal_date}}  {{lead.requirement}}');
  console.log('            {{lead.invoice_number}}  {{lead.invoice_amount}}  {{lead.due_date}}');
  console.log('            {{lead.meeting_date}}  {{lead.meeting_time}}  {{lead.timezone}}');
  console.log('            {{lead.meeting_link}}  {{lead.old_meeting_date}}  {{lead.new_meeting_date}}');
  console.log('            {{lead.referral_discount}}');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
