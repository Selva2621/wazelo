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
  'TUTOR',
  'INTERIOR_DESIGNER',
  'ACCOUNTANT',
  'ARCHITECT_CIVIL',
  'LEGAL',
  'CONSULTANT',
  'FITNESS_TRAINER',
  'DIETITIAN',
  'MAKEUP_ARTIST',
  'FASHION_DESIGNER',
  'EVENT_PLANNER',
  'TRAVEL_AGENT',
  'REAL_ESTATE',
  'TRANSLATOR',
  'VIRTUAL_ASSISTANT',
  'IT_SUPPORT',
  'HOME_SERVICES',
  'OTHER',
] as const;

export type FreelancerType = (typeof FREELANCER_TYPES)[number];

export interface FreelancerProfile {
  label: string;
  /** Fills {{lead.service}} in the common freelancer templates */
  serviceLabel: string;
  pitch: { intro: string; portfolio: string; followup: string; packages: string };
  /** Setup card subtitle */
  description?: string;
  /** Words people use for this work: setup search, and matching "Something else" text */
  keywords?: string[];
  /** Shown before "Show all" in setup */
  popular?: boolean;
}

const PROFILES: Record<Exclude<FreelancerType, 'OTHER'>, FreelancerProfile> = {
  WEB_DEVELOPER: {
    label: 'Web / App Developer',
    serviceLabel: 'website and app development',
    description: 'Websites, online stores, web and mobile apps',
    keywords: ['web developer', 'website', 'websites', 'web design', 'app developer', 'app development', 'mobile app', 'android', 'ios', 'wordpress', 'shopify', 'ecommerce', 'software developer', 'programmer', 'full stack', 'frontend', 'backend'],
    popular: true,
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
    description: 'Logos, brand identity, UI and print design',
    keywords: ['graphic', 'graphic designer', 'graphics', 'logo', 'logos', 'branding', 'brand identity', 'ui', 'ux', 'ui ux', 'illustrator', 'illustration', 'photoshop', 'poster', 'packaging design', 'print design', 'canva'],
    popular: true,
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
    description: 'SEO, social media and paid ads',
    keywords: ['digital marketing', 'digital marketer', 'marketing', 'seo', 'social media', 'smm', 'google ads', 'meta ads', 'facebook ads', 'instagram marketing', 'ppc', 'performance marketing', 'lead generation'],
    popular: true,
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
    description: 'Reels, product shoots, events, editing',
    keywords: ['photographer', 'photography', 'videographer', 'videography', 'video editing', 'video editor', 'reels', 'wedding photography', 'drone', 'cinematographer', 'photo editing', 'product shoot'],
    popular: true,
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
    description: 'Website copy, blogs, captions, scripts',
    keywords: ['content writer', 'content writing', 'writer', 'writing', 'copywriter', 'copywriting', 'blog', 'blogs', 'articles', 'script writer', 'ghostwriter', 'proofreading'],
    popular: true,
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
  TUTOR: {
    label: 'Tutor / Coach',
    serviceLabel: 'tutoring and coaching',
    description: 'School subjects, exam prep, music, languages, skills',
    keywords: ['tutor', 'tutoring', 'tuition', 'tuitions', 'teacher', 'teaching', 'coaching', 'coach', 'tuition classes', 'maths', 'science', 'exam preparation', 'music teacher', 'spoken english', 'online classes'],
    popular: true,
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a tutor and coach. I teach in small batches and one-to-one, with clear weekly goals and regular progress updates. Would you like to book a free trial class?",
      portfolio:
        'Hi {{contact.name}}, here are my student results and reviews: {{lead.portfolio_link}}. Happy to explain how my classes are planned.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can do a free 30-minute session to check the current level and suggest a study plan. Would that help?',
      packages:
        'Hi {{contact.name}}, here are my class options:\n- One-to-one: personal sessions at a time that suits you\n- Small batch: up to 5 students, weekly schedule\n- Exam crash course: focused practice before exams\nWhich one would suit you best?',
    },
  },
  INTERIOR_DESIGNER: {
    label: 'Interior Designer',
    serviceLabel: 'interior design',
    description: 'Homes, offices and shops, space planning, 3D designs',
    keywords: ['interior', 'interiors', 'interior design', 'interior designer', 'home decor', 'decor', 'modular kitchen', 'space planning', 'furniture design', 'renovation'],
    popular: true,
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, an interior designer. I plan homes, offices and shops that look good and work well every day, with 3D designs before any work starts. Would you be open to a short call about your space?",
      portfolio:
        'Hi {{contact.name}}, here are some of my recent interior projects: {{lead.portfolio_link}}. Happy to walk you through the ideas behind any of them.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Share a few photos of your space and I can suggest a free layout idea. Would that be useful?',
      packages:
        'Hi {{contact.name}}, here are my design packages:\n- Consultation: layout and style advice for one space\n- Room design: full design with 3D views for one room\n- Complete home or office: design and site supervision\nWhich one fits what you have in mind?',
    },
  },
  ACCOUNTANT: {
    label: 'Accountant / Tax Consultant',
    serviceLabel: 'accounting, GST and tax filing',
    description: 'Bookkeeping, GST, income tax, company compliance',
    keywords: ['accountant', 'accounting', 'accounts', 'bookkeeping', 'gst', 'tax', 'income tax', 'itr', 'tax filing', 'audit', 'chartered accountant', 'tally', 'payroll', 'compliance'],
    popular: true,
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}. I handle bookkeeping, GST and income tax filing for small businesses, so your accounts stay clean and deadlines are never missed. Would you be open to a short call?",
      portfolio:
        'Hi {{contact.name}}, here is more about my services and client reviews: {{lead.portfolio_link}}. Happy to answer any questions.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can do a free check of your current GST or tax filings and point out anything that needs attention. Would that help?',
      packages:
        'Hi {{contact.name}}, here are my plans:\n- Bookkeeping: monthly accounts and reports\n- GST: monthly or quarterly returns\n- Income tax: ITR filing for individuals and businesses\nWhich one do you need right now?',
    },
  },
  ARCHITECT_CIVIL: {
    label: 'Architect / Civil Engineer',
    serviceLabel: 'architecture and civil engineering',
    description: 'Building plans, structural design, approvals, site work',
    keywords: ['architect', 'architecture', 'civil', 'civil engineer', 'structural', 'structural design', 'construction', 'building plan', 'autocad', 'site engineer', 'surveyor', 'elevation', 'estimation'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}. I prepare building plans, elevations and structural designs, and help with approvals and site supervision. Would you be open to a short call about your project?",
      portfolio:
        'Hi {{contact.name}}, here are some of my recent plans and completed projects: {{lead.portfolio_link}}. Happy to explain any of them.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Share your plot size and needs, and I can suggest a free basic layout idea. Would that help?',
      packages:
        'Hi {{contact.name}}, here are my services:\n- Planning: floor plans and elevations\n- Structural design: drawings and estimates\n- Supervision: regular site visits and quality checks\nWhich of these do you need?',
    },
  },
  LEGAL: {
    label: 'Lawyer / Legal Consultant',
    serviceLabel: 'legal advice and documentation',
    description: 'Agreements, notices, registrations, legal advice',
    keywords: ['lawyer', 'advocate', 'legal', 'law', 'attorney', 'agreement', 'contract drafting', 'legal notice', 'notary', 'trademark', 'company registration'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a legal consultant. I help businesses and individuals with agreements, notices, registrations and clear legal advice. Would you be open to a short call?",
      portfolio:
        'Hi {{contact.name}}, here is more about my practice and the areas I handle: {{lead.portfolio_link}}. Happy to answer any questions.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can do a free 15-minute call to understand your matter and explain the next steps. Would that help?',
      packages:
        'Hi {{contact.name}}, here is how I can help:\n- Consultation: advice on your matter\n- Drafting: agreements, notices and contracts\n- Registrations: company, trademark and licences\nWhich one do you need?',
    },
  },
  CONSULTANT: {
    label: 'Business Consultant',
    serviceLabel: 'business consulting',
    description: 'Strategy, operations, sales and growth planning',
    keywords: ['consultant', 'consulting', 'business consultant', 'strategy', 'management consultant', 'startup', 'business plan', 'operations', 'hr consultant', 'sales consultant'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a business consultant. I help small businesses fix what slows them down, from sales and operations to planning for growth. Would you be open to a short call?",
      portfolio:
        'Hi {{contact.name}}, here are a few businesses I have worked with and the results: {{lead.portfolio_link}}. Happy to share how a similar plan could work for you.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can do a free 30-minute review of your business and share three practical improvements. Would that be useful?',
      packages:
        'Hi {{contact.name}}, here is how we can work together:\n- Review: a one-time study of your business with clear recommendations\n- Monthly advisory: regular calls and progress tracking\n- Project: hands-on help with one goal, like a sales process\nWhich one suits you?',
    },
  },
  FITNESS_TRAINER: {
    label: 'Fitness / Yoga Trainer',
    serviceLabel: 'fitness and yoga training',
    description: 'Personal training, yoga, group classes, home sessions',
    keywords: ['fitness', 'gym', 'personal trainer', 'yoga', 'zumba', 'workout', 'pilates', 'weight loss', 'fitness coach', 'aerobics'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a fitness and yoga trainer. I run personal and group sessions with plans built around your goals, whether that's strength, weight loss or flexibility. Would you like a free trial session?",
      portfolio:
        'Hi {{contact.name}}, here are some client transformations and reviews: {{lead.portfolio_link}}. Happy to explain how my sessions work.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can do a free fitness check and suggest a simple weekly plan for you. Would that help?',
      packages:
        'Hi {{contact.name}}, here are my options:\n- Personal training: one-to-one sessions at home or online\n- Group classes: yoga or workout batches\n- Monthly plan: sessions with a diet guide\nWhich one would you like to try?',
    },
  },
  DIETITIAN: {
    label: 'Nutritionist / Dietitian',
    serviceLabel: 'nutrition and diet planning',
    description: 'Diet plans, weight management, health coaching',
    keywords: ['nutritionist', 'nutrition', 'dietitian', 'dietician', 'diet', 'diet plan', 'meal plan', 'health coach', 'weight management'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a nutritionist. I create simple diet plans using everyday food, for weight management, health conditions and better energy. Would you be open to a short consultation?",
      portfolio:
        'Hi {{contact.name}}, here are some client results and reviews: {{lead.portfolio_link}}. Happy to explain how my plans work.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Share your current routine and I can suggest three easy changes for free. Would that help?',
      packages:
        'Hi {{contact.name}}, here are my plans:\n- Consultation: one session with a personal diet chart\n- Monthly plan: weekly check-ins and plan updates\n- 3-month programme: full support for a health goal\nWhich one suits you?',
    },
  },
  MAKEUP_ARTIST: {
    label: 'Makeup & Beauty Artist',
    serviceLabel: 'makeup and beauty services',
    description: 'Bridal and party makeup, hair styling, mehendi',
    keywords: ['makeup', 'make up', 'makeup artist', 'beautician', 'bridal', 'mehendi', 'mehndi', 'hair stylist', 'hairstyle', 'salon', 'nail art', 'beauty'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a makeup and beauty artist. I do bridal, party and event looks, with hair styling, at your place or my studio. Would you like to check dates for your event?",
      portfolio:
        'Hi {{contact.name}}, here are some of my recent looks: {{lead.portfolio_link}}. Let me know which style you like and I can plan something similar.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Popular dates book early, so I can hold your date while you decide. Would you like that?',
      packages:
        'Hi {{contact.name}}, here are my packages:\n- Party makeup: makeup and hair for one look\n- Bridal: trial, wedding day makeup and hair\n- Family package: makeup for the bride and family members\nWhich one are you looking for?',
    },
  },
  FASHION_DESIGNER: {
    label: 'Fashion Designer / Tailor',
    serviceLabel: 'fashion design and tailoring',
    description: 'Custom outfits, boutique wear, alterations',
    keywords: ['fashion', 'fashion designer', 'boutique', 'tailor', 'tailoring', 'stitching', 'dress designer', 'clothing', 'embroidery', 'blouse', 'alterations'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}. I design and stitch custom outfits for everyday wear, festivals and weddings, made to your size and style. Would you like to discuss what you have in mind?",
      portfolio:
        'Hi {{contact.name}}, here are some of my recent designs: {{lead.portfolio_link}}. Tell me which ones you like and I can suggest ideas for you.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Share a picture of a style you like and I can tell you how I would make it for you. Would that help?',
      packages:
        'Hi {{contact.name}}, here is what I offer:\n- Custom stitching: outfits made to your measurements\n- Designer wear: full design for weddings and events\n- Alterations: fitting and small changes\nWhich one do you need?',
    },
  },
  EVENT_PLANNER: {
    label: 'Event Planner',
    serviceLabel: 'event planning',
    description: 'Weddings, birthdays, corporate events, decoration',
    keywords: ['event', 'events', 'event planner', 'event management', 'wedding planner', 'decoration', 'decorator', 'party planner', 'birthday party', 'corporate event'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, an event planner. I handle weddings, birthdays and company events end to end, from decoration and vendors to the day itself. Would you be open to a short call about your event?",
      portfolio:
        'Hi {{contact.name}}, here are some events I have planned recently: {{lead.portfolio_link}}. Happy to share ideas for yours.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Share your date, guest count and budget range, and I can send a free theme idea. Would that help?',
      packages:
        'Hi {{contact.name}}, here are my packages:\n- Decoration: theme, stage and venue decoration\n- Planning: vendors, schedule and coordination\n- Full event: everything managed from start to finish\nWhich one fits your event?',
    },
  },
  TRAVEL_AGENT: {
    label: 'Travel Agent',
    serviceLabel: 'travel planning and bookings',
    description: 'Tour packages, tickets, hotels, visas',
    keywords: ['travel', 'travel agent', 'tour', 'tours', 'tour package', 'holiday', 'ticket booking', 'visa', 'trip', 'hotel booking'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a travel planner. I arrange tour packages, tickets, hotels and visas, so your trip is sorted without the hassle. Where are you planning to go next?",
      portfolio:
        'Hi {{contact.name}}, here are some of my popular trips and traveller reviews: {{lead.portfolio_link}}. Happy to plan something similar for you.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Share your dates and destination, and I can send a free sample plan. Would that help?',
      packages:
        'Hi {{contact.name}}, here is how I can help:\n- Bookings: flights, trains and hotels\n- Tour packages: planned trips with stays and sightseeing\n- Visa help: documents and application support\nWhich one do you need?',
    },
  },
  REAL_ESTATE: {
    label: 'Real Estate Agent',
    serviceLabel: 'property buying, selling and rentals',
    description: 'Homes, plots, rentals and property deals',
    keywords: ['real estate', 'property', 'properties', 'realtor', 'broker', 'plots', 'flats', 'apartments', 'rental', 'land'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a property advisor. I help people buy, sell and rent homes and plots, with verified listings and help through paperwork. Are you looking to buy, sell or rent?",
      portfolio:
        'Hi {{contact.name}}, here are some of my current listings: {{lead.portfolio_link}}. Tell me your budget and area, and I will shortlist the best ones.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Share your budget and preferred area, and I can send a free shortlist this week. Would that help?',
      packages:
        'Hi {{contact.name}}, here is how I can help:\n- Buying: shortlists, site visits and paperwork\n- Selling: listing, buyer visits and negotiation\n- Rentals: verified tenants or homes\nWhich one are you looking for?',
    },
  },
  TRANSLATOR: {
    label: 'Translator / Transcriber',
    serviceLabel: 'translation and transcription',
    description: 'Documents, subtitles, interpretation, transcription',
    keywords: ['translator', 'translation', 'translate', 'transcription', 'transcriber', 'subtitles', 'interpreter', 'localisation', 'localization'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}. I translate documents, websites and videos accurately and on time, and also transcribe audio and video. Would you be open to a short chat about your project?",
      portfolio:
        'Hi {{contact.name}}, here are some samples of my work and the languages I cover: {{lead.portfolio_link}}. Happy to do a short free sample for you.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Send me one page and I can translate it free so you can check the quality. Would that help?',
      packages:
        'Hi {{contact.name}}, here is what I offer:\n- Document translation: certified or general\n- Subtitles: translation and timing for videos\n- Transcription: audio and video to text\nWhich one do you need?',
    },
  },
  VIRTUAL_ASSISTANT: {
    label: 'Virtual Assistant',
    serviceLabel: 'virtual assistance and admin support',
    description: 'Email, calendar, data entry, customer support',
    keywords: ['virtual assistant', 'va', 'data entry', 'admin support', 'back office', 'customer support', 'typing', 'excel', 'calendar management'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}, a virtual assistant. I take care of email, scheduling, data entry and customer replies, so you can focus on your business. Would you be open to a short call?",
      portfolio:
        'Hi {{contact.name}}, here is more about my work and client reviews: {{lead.portfolio_link}}. Happy to answer any questions.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can take one small task off your plate for free so you can see how I work. Would that help?',
      packages:
        'Hi {{contact.name}}, here are my options:\n- Hourly: help when you need it\n- Part-time: a few hours every day\n- Monthly: ongoing admin and support\nWhich one suits you?',
    },
  },
  IT_SUPPORT: {
    label: 'IT Support / Networking',
    serviceLabel: 'IT support and networking',
    description: 'Computer repair, networks, CCTV, software setup',
    keywords: ['it support', 'computer repair', 'laptop repair', 'networking', 'network', 'cctv', 'hardware', 'server', 'technician', 'software installation', 'wifi'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}. I set up and fix computers, networks, Wi-Fi and CCTV for homes and offices, with quick on-site or remote support. Would you be open to a short call?",
      portfolio:
        'Hi {{contact.name}}, here is more about my services and client reviews: {{lead.portfolio_link}}. Happy to answer any questions.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. I can do a free check of your office network and systems and tell you what needs fixing. Would that help?',
      packages:
        'Hi {{contact.name}}, here is how I can help:\n- On-call support: repairs when something breaks\n- Setup: new computers, network, Wi-Fi or CCTV\n- Annual maintenance: regular checks and priority support\nWhich one do you need?',
    },
  },
  HOME_SERVICES: {
    label: 'Home Services / Repairs',
    serviceLabel: 'home repair and maintenance',
    description: 'Electrical, plumbing, AC service, carpentry, painting',
    keywords: ['electrician', 'plumber', 'plumbing', 'ac service', 'ac repair', 'carpenter', 'carpentry', 'painter', 'painting', 'home repair', 'maintenance', 'cleaning', 'pest control'],
    pitch: {
      intro:
        "Hi {{contact.name}}, I'm {{org.name}}. I handle home and office repairs, from electrical and plumbing to AC service, carpentry and painting, with on-time visits. What do you need help with?",
      portfolio:
        'Hi {{contact.name}}, here are some of my recent jobs and customer reviews: {{lead.portfolio_link}}. Happy to answer any questions.',
      followup:
        'Hi {{contact.name}}, following up on my earlier message. Send me a photo of the problem and I can tell you what it needs before visiting. Would that help?',
      packages:
        'Hi {{contact.name}}, here is how I can help:\n- One-time visit: repair or installation\n- Regular service: AC, cleaning or maintenance on a schedule\n- Annual plan: priority visits for your home or office\nWhich one do you need?',
    },
  },
};

export function freelancerTypeLabel(type: string | null | undefined, customService?: string | null): string {
  if (type && type in PROFILES) return PROFILES[type as keyof typeof PROFILES].label;
  return customService?.trim() || 'Freelancer';
}

/** A line of work offered in setup: built in here, or added by a super admin */
export interface CatalogEntry {
  key: string;
  label: string;
  description: string;
  keywords: string[];
  popular: boolean;
  builtIn: boolean;
}

/** Built-in lines of work, in setup order */
export const BUILT_IN_CATALOG: CatalogEntry[] = Object.entries(PROFILES).map(([key, p]) => ({
  key,
  label: p.label,
  description: p.description ?? '',
  keywords: p.keywords ?? [],
  popular: !!p.popular,
  builtIn: true,
}));

export function builtInProfile(key: string): FreelancerProfile | null {
  return key in PROFILES ? PROFILES[key as keyof typeof PROFILES] : null;
}

export interface FreelancerTemplateOptions {
  /** Saved (non built-in) lines of work the org picked as cards, by key */
  profiles?: Record<string, FreelancerProfile>;
  /** What the "Something else" service resolved to (a built-in or saved profile) */
  otherProfile?: FreelancerProfile | null;
}

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
  options: FreelancerTemplateOptions = {},
): SystemTemplate[] {
  // "Interior Designing!" reads badly mid-sentence ("I offer Interior Designing!.")
  const custom = customService?.trim().replace(/[\s!?.,;:]+$/, '') || null;
  const selected = [...new Set(types ?? [])];
  const profileFor =(type: string): FreelancerProfile | null =>
    type === 'OTHER' ? (options.otherProfile ?? null) : (builtInProfile(type) ?? options.profiles?.[type] ?? null);

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
