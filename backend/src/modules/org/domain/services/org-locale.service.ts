import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { getCountry } from '@/shared/constants/countries';
import { toE164 } from '@/shared/utils/phone.util';

const CACHE_TTL_MS = 60_000;

export interface OrgLocale {
  country: string;
  dialCode: string;
  currency: string;
}

/**
 * The org's country and currency, for every place that stores a phone number
 * or an amount. Cached per process; `invalidate()` on settings change.
 */
@Injectable()
export class OrgLocaleService {
  private readonly cache = new Map<string, { locale: OrgLocale; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async get(orgId: string): Promise<OrgLocale> {
    const cached = this.cache.get(orgId);
    if (cached && cached.expiresAt > Date.now()) return cached.locale;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { country: true, currency: true },
    });
    const country = getCountry(org?.country);
    const locale = {
      country: country.code,
      dialCode: country.dialCode,
      currency: org?.currency || country.currency,
    };
    this.cache.set(orgId, { locale, expiresAt: Date.now() + CACHE_TTL_MS });
    return locale;
  }

  /** E.164 for this org — numbers without a country code get the org's. Null if not a phone number. */
  async normalizePhone(orgId: string, raw: string | null | undefined): Promise<string | null> {
    if (!raw) return null;
    const { country } = await this.get(orgId);
    return toE164(raw, country);
  }

  invalidate(orgId: string): void {
    this.cache.delete(orgId);
  }
}
