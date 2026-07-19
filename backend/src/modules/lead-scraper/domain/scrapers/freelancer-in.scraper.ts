import axios from 'axios';
import { BaseScraper } from './base-scraper';
import { ScrapedLead } from './scraper.interface';

interface FreelancerProject {
  title?: string;
  budget?: {
    minimum?: number;
    maximum?: number;
    currency?: { sign?: string };
  };
  jobs?: Array<{ name?: string }>;
  time_submitted?: number;
  seo_url?: string;
}

interface FreelancerApiResponse {
  result?: {
    projects?: FreelancerProject[];
  };
}

export class FreelancerInScraper extends BaseScraper {
  async scrape(
    keywords: string,
    _location?: string,
    maxResults = 50,
  ): Promise<ScrapedLead[]> {
    const url = `https://www.freelancer.com/api/projects/0.1/projects/active?query=${encodeURIComponent(keywords)}&compact=true&limit=${maxResults}&details[]=skills&details[]=users`;

    try {
      const response = await axios.get<FreelancerApiResponse>(url, {
        headers: {
          ...this.getHeaders(),
          Accept: 'application/json',
        },
        timeout: 15_000,
      });

      const projects = response.data?.result?.projects ?? [];

      return projects.map((project): ScrapedLead => {
        const currencySign = project.budget?.currency?.sign ?? '$';
        const min = project.budget?.minimum ?? 0;
        const max = project.budget?.maximum ?? 0;
        const skills = (project.jobs ?? [])
          .map((j) => j.name)
          .filter((n): n is string => Boolean(n));

        return {
          name: 'Freelancer.com Client',
          jobTitle: project.title ?? 'Untitled Project',
          budget: `${currencySign}${min}-${max}`,
          skills,
          sourceUrl: project.seo_url
            ? `https://www.freelancer.com/projects/${project.seo_url}`
            : 'https://www.freelancer.com',
          scrapedAt: new Date().toISOString(),
        };
      });
    } catch {
      return [];
    }
  }
}
