import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FreelancerServiceProfile } from '@prisma/client';
import {
  BUILT_IN_CATALOG,
  CatalogEntry,
  FreelancerProfile,
  builtInProfile,
} from '@/shared/constants/freelancer-profiles';
import {
  FreelancerProfileInput,
  FreelancerProfileRepository,
} from '../../infrastructure/repositories/freelancer-profile.repository';
import {
  matchService,
  normalizeService,
  pitchProblems,
  profileKey,
} from '../../domain/services/freelancer-profile-matching';

const PITCH_KEYS = ['intro', 'portfolio', 'followup', 'packages'] as const;

export interface AdminFreelancerEntry {
  id: string;
  key: string;
  label: string;
  description: string;
  serviceLabel: string;
  keywords: string[];
  pitch: FreelancerProfile['pitch'];
  isActive: boolean;
  usageCount: number;
}

/**
 * The freelancer lines of work offered in setup: the hand-written built-in ones plus
 * entries a super admin adds. No AI here. "Something else" text is matched to an
 * entry by keywords; with no match the org gets generic wording with their service.
 */
@Injectable()
export class FreelancerProfileResolverService {
  constructor(private readonly repo: FreelancerProfileRepository) {}

  /** Setup cards and search data: built in first, then super admin entries */
  async catalog(): Promise<CatalogEntry[]> {
    const extra = await this.repo.listActive();
    return [
      ...BUILT_IN_CATALOG,
      ...extra.map((r) => ({
        key: r.key,
        label: r.label,
        description: r.description,
        keywords: r.aliases,
        popular: false,
        builtIn: false,
      })),
    ];
  }

  /** The catalog profile a "Something else" service means, or null for generic wording */
  async resolveTyped(service: string | null | undefined): Promise<FreelancerProfile | null> {
    if (normalizeService(service).length < 2) return null;
    const key = matchService(service, await this.catalog());
    if (!key) return null;
    return builtInProfile(key) ?? (await this.savedProfiles([key]))[key] ?? null;
  }

  /** Super admin entries for the keys an org picked */
  async savedProfiles(keys: readonly string[]): Promise<Record<string, FreelancerProfile>> {
    const custom = keys.filter((k) => k !== 'OTHER' && !builtInProfile(k));
    const rows = await this.repo.findByKeys(custom);
    return Object.fromEntries(
      rows.map((r) => [r.key, toProfile(r)] as const).filter((e): e is [string, FreelancerProfile] => !!e[1]),
    );
  }

  /** Keys that are not built in and not an active super admin entry */
  async unknownKeys(keys: readonly string[]): Promise<string[]> {
    const custom = keys.filter((k) => k !== 'OTHER' && !builtInProfile(k));
    if (!custom.length) return [];
    const found = new Set((await this.repo.findByKeys(custom)).filter((r) => r.isActive).map((r) => r.key));
    return custom.filter((k) => !found.has(k));
  }

  /** Counts orgs picking super admin entries (built-in ones aren't counted) */
  recordUse(keys: readonly string[]): Promise<void> {
    return this.repo.recordUse(keys.filter((k) => k !== 'OTHER' && !builtInProfile(k)));
  }

  // ───── Super admin ─────

  async adminList(): Promise<{ builtIn: CatalogEntry[]; custom: AdminFreelancerEntry[] }> {
    const rows = await this.repo.listAll();
    return { builtIn: BUILT_IN_CATALOG, custom: rows.map(toAdmin) };
  }

  async adminCreate(input: FreelancerProfileInput): Promise<AdminFreelancerEntry> {
    const clean = this.validate(input);
    const key = profileKey(clean.label);
    if (key.length < 2) throw new BadRequestException('Use a name with letters or numbers');
    if (builtInProfile(key)) throw new BadRequestException(`"${clean.label}" is already a built-in type`);
    const created = await this.repo.create(key, clean);
    if (!created) throw new BadRequestException(`A type named "${clean.label}" already exists (or was deleted). Use a different name.`);
    return toAdmin(created);
  }

  /** The key never changes, so orgs that picked it keep working */
  async adminUpdate(id: string, input: Partial<FreelancerProfileInput> & { isActive?: boolean }): Promise<AdminFreelancerEntry> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException('Type not found');
    const merged = this.validate({
      label: input.label ?? row.label,
      description: input.description ?? row.description,
      serviceLabel: input.serviceLabel ?? row.serviceLabel,
      keywords: input.keywords ?? row.aliases,
      pitch: (input.pitch ?? row.pitch) as Record<string, string>,
    });
    return toAdmin(await this.repo.update(id, { ...merged, isActive: input.isActive }));
  }

  async adminDelete(id: string): Promise<void> {
    if (!(await this.repo.findById(id))) throw new NotFoundException('Type not found');
    await this.repo.softDelete(id);
  }

  private validate(input: FreelancerProfileInput): FreelancerProfileInput {
    const problems = pitchProblems(input.pitch ?? {});
    if (problems.length) throw new BadRequestException(problems.join('; '));
    const keywords = [...new Set((input.keywords ?? []).map(normalizeService).filter((k) => k.length >= 2))].slice(0, 30);
    return {
      label: input.label.trim(),
      description: input.description.trim(),
      serviceLabel: input.serviceLabel.trim(),
      keywords,
      pitch: Object.fromEntries(PITCH_KEYS.map((k) => [k, String(input.pitch[k]).trim()])),
    };
  }
}

function toProfile(row: FreelancerServiceProfile): FreelancerProfile | null {
  const p = (row.pitch ?? {}) as Record<string, unknown>;
  if (!PITCH_KEYS.every((k) => typeof p[k] === 'string' && p[k])) return null;
  return {
    label: row.label,
    serviceLabel: row.serviceLabel,
    description: row.description,
    keywords: row.aliases,
    pitch: { intro: p.intro as string, portfolio: p.portfolio as string, followup: p.followup as string, packages: p.packages as string },
  };
}

function toAdmin(row: FreelancerServiceProfile): AdminFreelancerEntry {
  const p = (row.pitch ?? {}) as Record<string, string>;
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    description: row.description,
    serviceLabel: row.serviceLabel,
    keywords: row.aliases,
    pitch: { intro: p.intro ?? '', portfolio: p.portfolio ?? '', followup: p.followup ?? '', packages: p.packages ?? '' },
    isActive: row.isActive,
    usageCount: row.usageCount,
  };
}
