import type { LeadFilters, ScrapeSource } from "@/lib/types/lead-scraper";
import { BUSINESS_TYPE_ALIASES, BUSINESS_TYPE_GROUPS } from "./business-types";

/** A heading (optional) with its suggestions */
export interface SuggestionGroup {
  label?: string;
  items: string[];
}

/** What to search for, per source — suggestions only, users can type anything */
export const KEYWORD_SUGGESTIONS: Record<ScrapeSource, SuggestionGroup[]> = {
  GOOGLE_MAPS: BUSINESS_TYPE_GROUPS,

  // Upwork gig categories / roles
  UPWORK_JOBS: [
    {
      label: "Development",
      items: ["Web development", "WordPress developer", "Shopify developer", "Webflow developer", "React developer",
        "Next.js developer", "Full stack developer", "Node.js developer", "Python developer", "Laravel developer",
        "Mobile app developer", "Flutter developer", "React Native developer", "iOS developer", "Android developer",
        "Web scraping", "AI chatbot development", "Automation (Zapier / Make)"],
    },
    {
      label: "Design & video",
      items: ["UI/UX design", "Figma design", "Landing page design", "Logo design", "Brand identity design",
        "Graphic design", "Video editing", "YouTube video editing", "Motion graphics", "3D modeling"],
    },
    {
      label: "Marketing & writing",
      items: ["Copywriting", "Blog writing", "Technical writing", "SEO", "Social media marketing",
        "Facebook ads", "Google ads", "Email marketing", "Lead generation"],
    },
    {
      label: "Admin & support",
      items: ["Data analysis", "Virtual assistant", "Data entry", "Bookkeeping", "Customer support", "Translation"],
    },
  ],

  // Freelancer.com project titles (India-heavy)
  FREELANCER_IN: [
    {
      label: "Development",
      items: ["Website design", "Website development", "WordPress website", "E-commerce website", "PHP developer",
        "Laravel developer", "Android app", "Mobile app development", "Python script", "Web scraping", "Software development"],
    },
    {
      label: "Design & content",
      items: ["Logo design", "Graphic design", "Banner design", "Brochure design", "Video editing",
        "Article writing", "Content writing", "Translation"],
    },
    {
      label: "Marketing & admin",
      items: ["SEO", "Digital marketing", "Social media management", "Data entry", "Excel", "Tally accounting"],
    },
  ],

  // Truelancer project types (India-heavy)
  TRUELANCER: [
    {
      label: "Development",
      items: ["Website development", "WordPress website", "Shopify store", "App development"],
    },
    {
      label: "Design & content",
      items: ["Logo design", "Graphic design", "Social media post design", "Video editing", "Reels editing",
        "Content writing", "Voice over", "Hindi translation", "Tamil translation"],
    },
    {
      label: "Marketing & admin",
      items: ["Digital marketing", "Social media management", "SEO", "Google ads", "Data entry",
        "Tally accounting", "Virtual assistant"],
    },
  ],

  // LinkedIn job titles
  LINKEDIN_JOBS: [
    {
      label: "Engineering & data",
      items: ["Software engineer", "Frontend developer", "Backend developer", "Full stack developer", "Mobile developer",
        "DevOps engineer", "QA engineer", "Data analyst", "Data scientist", "Machine learning engineer"],
    },
    {
      label: "Product & design",
      items: ["Product manager", "Project manager", "Business analyst", "UI/UX designer", "Graphic designer"],
    },
    {
      label: "Marketing & sales",
      items: ["Digital marketing manager", "Performance marketing manager", "Marketing manager", "SEO specialist",
        "Content writer", "Sales executive", "Business development executive", "Inside sales representative",
        "Account manager", "Customer success manager"],
    },
    {
      label: "HR & operations",
      items: ["HR recruiter", "Talent acquisition specialist", "Accountant", "Operations manager"],
    },
  ],
};

type ForYou = Partial<Record<ScrapeSource, string[]>>;

/** What each kind of freelancer (picked in onboarding) should search for, per source */
const FOR_YOU: Record<string, ForYou> = {
  WEB_DEVELOPER: {
    GOOGLE_MAPS: ["Boutique", "Sweet shop", "Coaching centre", "Clinic", "Interior designer", "Real estate agency", "Bakery", "Gym"],
    UPWORK_JOBS: ["WordPress developer", "Shopify developer", "Web development", "React developer", "Landing page design"],
    FREELANCER_IN: ["Website design", "WordPress website", "E-commerce website", "PHP developer"],
    TRUELANCER: ["Website development", "WordPress website", "Shopify store", "App development"],
    LINKEDIN_JOBS: ["Frontend developer", "Full stack developer", "Software engineer"],
  },
  DESIGNER: {
    GOOGLE_MAPS: ["Restaurant", "Cafe", "Bakery", "Boutique", "Beauty salon", "Coaching centre", "Real estate agency", "Event planner"],
    UPWORK_JOBS: ["Logo design", "Brand identity design", "UI/UX design", "Graphic design", "Figma design"],
    FREELANCER_IN: ["Logo design", "Graphic design", "Banner design", "Brochure design"],
    TRUELANCER: ["Logo design", "Graphic design", "Social media post design"],
    LINKEDIN_JOBS: ["UI/UX designer", "Graphic designer"],
  },
  DIGITAL_MARKETER: {
    GOOGLE_MAPS: ["Restaurant", "Beauty salon", "Gym", "Dentist", "Skin care clinic", "Real estate agency", "Coaching centre", "Interior designer"],
    UPWORK_JOBS: ["SEO", "Social media marketing", "Facebook ads", "Google ads", "Email marketing", "Lead generation"],
    FREELANCER_IN: ["SEO", "Digital marketing", "Social media management"],
    TRUELANCER: ["Digital marketing", "Social media management", "SEO", "Google ads"],
    LINKEDIN_JOBS: ["Digital marketing manager", "Performance marketing manager", "SEO specialist", "Marketing manager"],
  },
  VIDEO_PHOTO: {
    GOOGLE_MAPS: ["Restaurant", "Cafe", "Boutique", "Jewellery store", "Wedding venue", "Banquet hall", "Resort", "Real estate agency"],
    UPWORK_JOBS: ["Video editing", "YouTube video editing", "Motion graphics"],
    FREELANCER_IN: ["Video editing"],
    TRUELANCER: ["Video editing", "Reels editing"],
  },
  CONTENT_WRITER: {
    GOOGLE_MAPS: ["Coaching centre", "Clinic", "Real estate agency", "Travel agency", "Interior designer", "Software company"],
    UPWORK_JOBS: ["Copywriting", "Blog writing", "Technical writing", "Translation"],
    FREELANCER_IN: ["Article writing", "Content writing", "Translation"],
    TRUELANCER: ["Content writing", "Hindi translation", "Tamil translation"],
    LINKEDIN_JOBS: ["Content writer"],
  },
};

/** Suggestions for the org's line(s) of work on this source — merged, deduped, capped */
export function suggestedFor(freelancerTypes: string[] | undefined, source: ScrapeSource, limit = 8): string[] {
  const seen = new Set<string>();
  for (const type of freelancerTypes ?? []) {
    for (const item of FOR_YOU[type]?.[source] ?? []) seen.add(item);
  }
  return [...seen].slice(0, limit);
}

/** A Google Maps filter that suits a line of work, offered as a one-click tip */
export interface FilterTip {
  text: string;
  filters: Partial<LeadFilters>;
}

const MAPS_TIPS: Record<string, FilterTip> = {
  WEB_DEVELOPER: { text: "No website only — these businesses need one", filters: { noWebsite: true } },
  DIGITAL_MARKETER: { text: "Under 50 reviews — room to grow online", filters: { maxReviews: 50 } },
  DESIGNER: { text: "5 photos or fewer — weak visual presence", filters: { maxPhotos: 5 } },
  VIDEO_PHOTO: { text: "5 photos or fewer — weak visual presence", filters: { maxPhotos: 5 } },
};

export function mapsTipFor(freelancerTypes: string[] | undefined): FilterTip | undefined {
  for (const type of freelancerTypes ?? []) if (MAPS_TIPS[type]) return MAPS_TIPS[type];
  return undefined;
}

/** Local words per source → suggestion they should find */
export const KEYWORD_ALIASES: Partial<Record<ScrapeSource, Record<string, string[]>>> = {
  GOOGLE_MAPS: BUSINESS_TYPE_ALIASES,
};

const FREELANCE_SKILLS = [
  "React", "Next.js", "Node.js", "JavaScript", "TypeScript", "PHP", "Laravel", "Python", "Django",
  "WordPress", "Shopify", "Webflow", "Flutter", "React Native", "HTML", "CSS", "Tailwind CSS",
  "Figma", "Photoshop", "Illustrator", "After Effects", "Premiere Pro", "Canva",
  "SEO", "Google Ads", "Facebook Ads", "Copywriting", "Content writing", "Excel", "Web scraping",
];

/** Skill filters for job boards, per source */
export const SKILL_SUGGESTIONS: Partial<Record<ScrapeSource, SuggestionGroup[]>> = {
  UPWORK_JOBS: [{ items: [...FREELANCE_SKILLS, "Zapier", "Make.com", "OpenAI API", "GoHighLevel", "Bubble"] }],
  FREELANCER_IN: [{ items: [...FREELANCE_SKILLS, "Android", "MySQL", "Tally", "CorelDRAW"] }],
  TRUELANCER: [{ items: [...FREELANCE_SKILLS, "Tally", "CorelDRAW", "Voice over", "Reels"] }],
  LINKEDIN_JOBS: [{
    items: ["Java", "Spring Boot", "Python", "JavaScript", "TypeScript", "React", "Angular", "Node.js", "Go",
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "SQL", "PostgreSQL", "MongoDB", "Power BI", "Tableau",
      "Salesforce", "HubSpot", "SAP", "Figma", "Agile", "Scrum", "B2B sales", "Lead generation", "Recruiting"],
  }],
};
