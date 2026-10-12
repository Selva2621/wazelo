import axios from 'axios';
import { BaseScraper } from './base-scraper';
import { ScrapedLead } from './scraper.interface';

interface FreelancerProject {
  title?: string;
  type?: string;
  owner_id?: number;
  budget?: {
    minimum?: number;
    maximum?: number;
    currency?: { sign?: string };
  };
  bid_stats?: { bid_count?: number };
  jobs?: Array<{ name?: string }>;
  time_submitted?: number;
  seo_url?: string;
}

interface FreelancerUser {
  status?: { payment_verified?: boolean };
  location?: { country?: { name?: string } };
}

interface FreelancerApiResponse {
  result?: {
    projects?: FreelancerProject[];
    users?: Record<string, FreelancerUser>;
  };
}

export class FreelancerInScraper extends BaseScraper {
  async scrape(
    keywords: string,
    _location?: string,
    maxResults = 50,
  ): Promise<ScrapedLead[]> {
    const url =
      `https://www.freelancer.com/api/projects/0.1/projects/active?query=${encodeURIComponent(keywords)}` +
      `&compact=true&limit=${maxResults}&job_details=true&user_details=true&user_status=true&user_country_details=true`;

    try {
      const response = await axios.get<FreelancerApiResponse>(url, {
        headers: {
          ...this.getHeaders(),
          Accept: 'application/json',
        },
        timeout: 15_000,
      });

      const projects = response.data?.result?.projects ?? [];
      const users = response.data?.result?.users ?? {};

      return projects.map((project): ScrapedLead => {
        const currencySign = project.budget?.currency?.sign ?? '$';
        const min = project.budget?.minimum ?? 0;
        const max = project.budget?.maximum ?? 0;
        const skills = (project.jobs ?? [])
          .map((j) => j.name)
          .filter((n): n is string => Boolean(n));
        const owner = project.owner_id != null ? users[String(project.owner_id)] : undefined;
        const type = project.type?.toLowerCase();

        return {
          name: 'Freelancer.com Client',
          jobTitle: project.title ?? 'Untitled Project',
          budget: `${currencySign}${min}-${max}`,
          budgetMin: project.budget?.minimum,
          budgetMax: project.budget?.maximum,
          budgetType: type === 'hourly' || type === 'fixed' ? type : undefined,
          skills,
          postedAt: project.time_submitted ? new Date(project.time_submitted * 1000).toISOString() : undefined,
          proposals: project.bid_stats?.bid_count,
          paymentVerified: owner?.status?.payment_verified,
          clientCountry: owner?.location?.country?.name,
          sourceUrl: project.seo_url
            ? `https://www.freelancer.com/projects/${project.seo_url}`
            : 'https://www.freelancer.com',
          scrapedAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      return this.fail('Freelancer.com', error);
    }
  }
}
