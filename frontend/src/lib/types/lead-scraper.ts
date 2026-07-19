export type ScrapeSource =
  | "GOOGLE_MAPS"
  | "UPWORK_JOBS"
  | "FREELANCER_IN"
  | "TRUELANCER"
  | "LINKEDIN_JOBS";

export type ScrapeRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface ScrapeRun {
  id: string;
  orgId: string;
  source: ScrapeSource;
  keywords: string;
  location?: string;
  maxResults: number;
  status: ScrapeRunStatus;
  resultCount: number;
  importedCount: number;
  skippedCount: number;
  errorMessage?: string;
  completedAt?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeResult {
  id: string;
  scrapeRunId: string;
  orgId: string;
  name?: string;
  phone?: string;
  email?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  address?: string;
  website?: string;
  budget?: string;
  skills: string[];
  rating?: number;
  reviewCount?: number;
  category?: string;
  description?: string;
  openingHours?: string;
  socialLinks: string[];
  sourceUrl: string;
  imported: boolean;
  contactId?: string;
  createdAt: string;
}

export interface TriggerScrapeRequest {
  source: ScrapeSource;
  keywords: string;
  location?: string;
  maxResults?: number;
}

export interface ListScrapeRunsParams {
  skip?: number;
  take?: number;
  status?: ScrapeRunStatus;
  source?: ScrapeSource;
}

export interface ScrapeRunsResponse {
  runs: ScrapeRun[];
  total: number;
}

export interface ScrapeResultsResponse {
  results: ScrapeResult[];
  total: number;
}

export interface ImportScrapeResultsRequest {
  resultIds?: string[]; // empty = import all
}

export interface ImportScrapeResultsResponse {
  imported: number;
  skipped: number;
}
