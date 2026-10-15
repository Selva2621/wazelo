import { Injectable } from '@nestjs/common';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { searchTerm } from '../../domain/services/search-term';

const PER_KIND = 5;

/** Header search across orgs, users, WhatsApp numbers, tickets and invoices. */
@Injectable()
export class GlobalSearchUseCase {
  constructor(private readonly platformRepo: PlatformRepository) {}

  async execute(q?: string) {
    const term = searchTerm(q);
    // Two characters minimum: one letter would match half the database
    if (!term || term.length < 2) {
      return { query: term ?? '', orgs: [], users: [], phoneNumbers: [], tickets: [], invoices: [] };
    }
    return { query: term, ...(await this.platformRepo.globalSearch(term, PER_KIND)) };
  }
}
