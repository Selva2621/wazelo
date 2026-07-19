export interface ScrapedLead {
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  address?: string;
  budget?: string;
  skills?: string[];
  website?: string;
  rating?: number;
  reviewCount?: number;
  category?: string;
  description?: string;
  openingHours?: string;
  socialLinks?: string[];
  sourceUrl: string;
  scrapedAt: string;
}

export interface IScraper {
  scrape(keywords: string, location?: string, maxResults?: number): Promise<ScrapedLead[]>;
}
