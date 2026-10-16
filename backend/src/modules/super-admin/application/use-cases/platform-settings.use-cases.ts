import { BadRequestException, Injectable } from '@nestjs/common';
import { OrgType, PlatformAuditAction } from '@prisma/client';
import { PlatformSettingRepository } from '@/modules/platform-settings/infrastructure/repositories/platform-setting.repository';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import {
  isGoogleConfigured,
  PlatformSettings,
  SETUP_ORG_TYPES,
  SetupOrgType,
} from '@/modules/platform-settings/domain/services/platform-settings';
import { planPlatformSettingsChange } from '../../domain/services/platform-settings-change';
import { UpdatePlatformSettingsDto } from '../dto/platform-settings.dto';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

export interface PlatformSettingsView {
  googleSignupEnabled: boolean;
  google: {
    clientId: string | null;
    /** Whether a secret is stored. The secret (and its ciphertext) is never returned. */
    clientSecretSet: boolean;
    redirectUri: string | null;
    configured: boolean;
    /** This backend's own callback URL, to copy into Google Cloud Console */
    suggestedRedirectUri: string;
  };
  /** Per org type: may new workspaces pick it, and how many live orgs have it */
  orgTypes: Record<SetupOrgType, { setupEnabled: boolean; orgCount: number }>;
}

function toView(
  settings: PlatformSettings,
  suggestedRedirectUri: string,
  orgCounts: Partial<Record<OrgType, number>>,
): PlatformSettingsView {
  return {
    googleSignupEnabled: settings.googleSignupEnabled,
    google: {
      clientId: settings.google.clientId,
      clientSecretSet: !!settings.google.clientSecretEncrypted,
      redirectUri: settings.google.redirectUri,
      configured: isGoogleConfigured(settings.google),
      suggestedRedirectUri,
    },
    orgTypes: Object.fromEntries(
      SETUP_ORG_TYPES.map((type) => [
        type,
        { setupEnabled: settings.orgTypeSetup[type], orgCount: orgCounts[type] ?? 0 },
      ]),
    ) as PlatformSettingsView['orgTypes'],
  };
}

/** GET /super-admin/settings */
@Injectable()
export class GetPlatformSettingsUseCase {
  constructor(
    private readonly settings: PlatformSettingsService,
    private readonly platform: PlatformRepository,
  ) {}

  async execute(suggestedRedirectUri: string): Promise<PlatformSettingsView> {
    const [settings, counts] = await Promise.all([this.settings.get(), this.platform.countOrgsByType()]);
    return toView(settings, suggestedRedirectUri, counts);
  }
}

/**
 * PATCH /super-admin/settings: audited as PLATFORM_SETTING_CHANGED with before/after.
 * The client secret is encrypted before storage and only ever audited as changed/cleared.
 */
@Injectable()
export class UpdatePlatformSettingsUseCase {
  constructor(
    private readonly repo: PlatformSettingRepository,
    private readonly settings: PlatformSettingsService,
    private readonly audit: PlatformAuditService,
    private readonly platform: PlatformRepository,
  ) {}

  async execute(
    dto: UpdatePlatformSettingsDto,
    actor: AuditActor,
    meta: RequestMeta,
    suggestedRedirectUri: string,
  ): Promise<PlatformSettingsView> {
    // Read through to the database: the decision must not rest on a stale cached value
    this.settings.invalidate();
    const current = await this.settings.get();

    const change = planPlatformSettingsChange(current, dto, (plain) => this.settings.encryptSecret(plain));
    if (change.kind === 'invalid') throw new BadRequestException(change.error);

    if (change.kind === 'apply') {
      await this.repo.apply(change.set, change.remove, actor.id);
      // Takes effect immediately on this (single) instance
      this.settings.invalidate();
      const keys = [...change.set.map((s) => s.key), ...change.remove];
      const orgTypesOnly = keys.every((k) => k.startsWith('orgTypes.'));
      await this.audit.record({
        action: PlatformAuditAction.PLATFORM_SETTING_CHANGED,
        actor,
        targetType: 'PlatformSetting',
        targetId: orgTypesOnly ? 'orgTypes' : 'auth.google',
        metadata: {
          label: orgTypesOnly ? 'Workspace types' : 'Google sign-in',
          before: change.before,
          after: change.after,
        },
        meta,
      });
    }

    const [settings, counts] = await Promise.all([this.settings.get(), this.platform.countOrgsByType()]);
    return toView(settings, suggestedRedirectUri, counts);
  }
}
