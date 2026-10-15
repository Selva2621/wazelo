import { FREELANCER_SYSTEM_TEMPLATES, SystemTemplate } from './system-templates';

/**
 * What a freelancer does — asked in onboarding. Drives the wording of the
 * default templates (and, on the frontend, the outreach sequence).
 */
export const FREELANCER_TYPES = [
  'WEB_DEVELOPER',
  'DESIGNER',
  'DIGITAL_MARKETER',
  'VIDEO_PHOTO',
  'CONTENT_WRITER',
  'OTHER',
] as const;

export type FreelancerType = (typeof FREELANCER_TYPES)[number];

interface FreelancerProfile {
  label: string;
  /** Fills {{lead.service}} in the common freelancer templates */
  serviceLabel: string;
  pitch: { intro: string; portfolio: string; followup: string; packages: string };
}

const PROFILES: Record<Exclude<FreelancerType, 'OTHER'>, FreelancerProfile> = {
  WEB_DEVELOPER: {
    label: 'Web / App Developer',
    serviceLabel: 'website and app development',
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a web and app developer. I build fast, mobile-friendly websites and apps that bring in enquiries, from business sites and online stores to custom web apps. Would you be open to a short call to see if I can help your business?",
      portfolio:
        "Hi {{contact.name}}, here are a few websites and apps I've built recently: {{lead.portfolio_link}}. Each was delivered on time, works well on mobile and is easy for the client to update. Happy to walk you through any of them.",
      followup:
        'Hi {{contact.name}}, following up on my earlier message. If your website is slow, outdated or not bringing in leads, I can send you a short free review with a few practical improvements. Would that be useful?',
      packages:
        'Hi {{contact.name}}, here are my website packages:\n- Starter: up to 5 pages, mobile-ready, contact form\n- Business: up to 12 pages, blog, SEO setup, WhatsApp chat button\n- Custom: online store or web app, quoted on scope\nEvery package includes hosting setup and 30 days of support. Which one fits what you need?',
    },
  },
  DESIGNER: {
    label: 'Graphic / UI Designer',
    serviceLabel: 'branding and design',
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a designer focused on logos, brand identity and app/web UI. Strong, consistent design builds trust before a customer says a word. Would you be open to a short call about your brand?",
      portfolio:
        "Hi {{contact.name}}, here's a selection of my recent branding and UI work: {{lead.portfolio_link}}. I'm happy to explain the thinking behind any of these designs.",
      followup:
        "Hi {{contact.name}}, following up on my earlier message. I can send you a short free review of your current logo and social media look, with a few ideas to make it more consistent. Would that help?",
      packages:
        'Hi {{contact.name}}, here are my design packages:\n- Logo: 3 concepts, 2 revision rounds, all file formats\n- Brand kit: logo, colours, fonts, business card and social templates\n- UI design: app or website screens, quoted on scope\nWhich of these is closest to what you need?',
    },
  },
  DIGITAL_MARKETER: {
    label: 'Digital Marketer',
    serviceLabel: 'digital marketing (SEO, social media and ads)',
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a digital marketer. I help businesses get more enquiries through SEO, social media and paid ads, with clear monthly reporting. Would you be open to a short call about your growth goals?",
      portfolio:
        "Hi {{contact.name}}, here are some results I've delivered for clients: {{lead.portfolio_link}}. Happy to share how a similar plan could work for your business.",
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can prepare a short free audit of your Google listing and social media pages with a few quick wins. Would that be useful?',
      packages:
        'Hi {{contact.name}}, here are my marketing plans:\n- SEO: on-page fixes, Google Business profile, monthly ranking report\n- Social media: 12 posts a month with captions and scheduling\n- Ads: Google or Meta ads setup and weekly optimisation\nAll plans are monthly with no long lock-in. Which one would you like to start with?',
    },
  },
  VIDEO_PHOTO: {
    label: 'Video & Photography',
    serviceLabel: 'video production and photography',
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}. I shoot and edit videos and photos for businesses, including reels, product shoots and event coverage. Good visuals make people stop scrolling. Would you be open to a short call?",
      portfolio:
        'Hi {{contact.name}}, here are some of my recent videos and shoots: {{lead.portfolio_link}}. Let me know which style suits your brand and I can plan something similar.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. If you have a launch, event or new products coming up, I can suggest a simple content plan for it. Would that help?',
      packages:
        'Hi {{contact.name}}, here are my packages:\n- Reels: 4 edited short videos a month\n- Product shoot: up to 20 edited product photos\n- Event coverage: photos and a highlight video, quoted by duration\nWhich one fits what you have planned?',
    },
  },
  CONTENT_WRITER: {
    label: 'Content Writer',
    serviceLabel: 'content writing',
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a content writer. I write website copy, blogs and social media captions that sound like your brand and help you get found on Google. Would you be open to a short call?",
      portfolio:
        'Hi {{contact.name}}, here are some samples of my writing: {{lead.portfolio_link}}. Happy to write a short sample for your business so you can see the fit.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can review one page of your website and suggest clearer wording at no cost. Would that be useful?',
      packages:
        'Hi {{contact.name}}, here are my writing packages:\n- Blogs: 4 SEO-friendly articles a month\n- Website copy: home, about, services and contact pages\n- Social captions: 20 captions a month\nWhich one would help you most right now?',
    },
  },
};

export function freelancerTypeLabel(type: string | null | undefined, customService?: string | null): string {
  if (type && type in PROFILES) return PROFILES[type as keyof typeof PROFILES].label;
  return customService?.trim() || 'Freelancer';
}

const profileFor = (type: string) => (type in PROFILES ? PROFILES[type as keyof typeof PROFILES] : null);

/** "a", "a and b", "a, b and c" */
const joinList = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * The full freelancer template set for one org: the common lifecycle templates
 * with {{lead.service}} filled for all their lines of work, plus four pitch
 * templates per selected type (named pitch_<key>_<type>, e.g. pitch_intro_designer).
 */
export function buildFreelancerTemplates(
  types: readonly string[] | null | undefined,
  customService?: string | null,
): SystemTemplate[] {
  const custom = customService?.trim() || null;
  const selected = [...new Set(types ?? [])];

  const services = selected
    .map((type) => profileFor(type)?.serviceLabel ?? (type === 'OTHER' ? custom : null))
    .filter((s): s is string => !!s);
  const service = services.length ? joinList(services) : custom;

  // Without a known service, keep {{lead.service}} so the user fills it in
  const common = service
    ? FREELANCER_SYSTEM_TEMPLATES.map((t) => ({ ...t, body: t.body.split('{{lead.service}}').join(service) }))
    : FREELANCER_SYSTEM_TEMPLATES;

  // No type picked yet: one generic pitch set under the plain names
  const pitchSets = selected.length
    ? selected.map((type) => ({
        type,
        suffix: `_${type.toLowerCase()}`,
        pitch: profileFor(type)?.pitch ?? genericPitch(custom ?? 'my services'),
      }))
    : [{ type: 'OTHER', suffix: '', pitch: genericPitch(service ?? 'my services') }];

  const pitchTemplates = pitchSets.flatMap(({ type, suffix, pitch }) => {
    const pitchTemplate = (key: keyof FreelancerProfile['pitch'], description: string): SystemTemplate => ({
      name: `pitch_${key}${suffix}`,
      category: 'MARKETING',
      language: 'en',
      body: pitch[key],
      meta: { freelancerType: `pitch_${key}`, description, profile: type },
    });
    return [
      pitchTemplate('intro', 'First message to a new lead'),
      pitchTemplate('portfolio', 'Share your portfolio'),
      pitchTemplate('followup', 'Follow-up with a free offer'),
      pitchTemplate('packages', 'Your service packages'),
    ];
  });

  return [...common, ...pitchTemplates];
}

function genericPitch(service: string): FreelancerProfile['pitch'] {
  return {
    intro: `Hi {{contact.name}}, I'm {{org.name}} and I offer ${service}. I work closely with small businesses and deliver on time. Would you be open to a short call to see if I can help?`,
    portfolio: `Hi {{contact.name}}, here are some examples of my recent work: {{lead.portfolio_link}}. Happy to walk you through any of them.`,
    followup: `Hi {{contact.name}}, following up on my earlier message about ${service}. Is this something you're looking at right now?`,
    packages: `Hi {{contact.name}}, I offer ${service} as fixed-price packages or quoted on scope. Could you share a little about what you need so I can suggest the right option?`,
  };
}
