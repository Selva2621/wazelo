import { Injectable } from '@nestjs/common';
import { ScrapeSource } from '@prisma/client';
import { IScraper } from './scraper.interface';
import { FreelancerInScraper } from './freelancer-in.scraper';
import { TruelancerScraper } from './truelancer.scraper';
import { LinkedInJobsScraper } from './linkedin-jobs.scraper';
import { UpworkJobsScraper } from './upwork-jobs.scraper';
import { GoogleMapsScraper } from './google-maps.scraper';

@Injectable()
export class ScraperFactory {
  getScraper(source: ScrapeSource): IScraper {
    switch (source) {
      case ScrapeSource.FREELANCER_IN:
        return new FreelancerInScraper();
      case ScrapeSource.TRUELANCER:
        return new TruelancerScraper();
      case ScrapeSource.LINKEDIN_JOBS:
        return new LinkedInJobsScraper();
      case ScrapeSource.UPWORK_JOBS:
        return new UpworkJobsScraper();
      case ScrapeSource.GOOGLE_MAPS:
        return new GoogleMapsScraper();
      default:
        throw new Error(`Unknown scrape source: ${source}`);
    }
  }
}
