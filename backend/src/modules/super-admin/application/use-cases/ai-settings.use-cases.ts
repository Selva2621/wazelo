import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AiCreditPack, PlatformAuditAction, Prisma } from '@prisma/client';
import { PlatformSettingRepository } from '@/modules/platform-settings/infrastructure/repositories/platform-setting.repository';
import { PlatformSettingsService } from '@/modules/platform-settings/domain/services/platform-settings.service';
import { PLATFORM_SETTING_KEYS } from '@/modules/platform-settings/domain/services/platform-settings';
import { AI_PROVIDERS, AiProviderService } from '@/modules/ai/domain/services/ai-provider.service';
import { AI_ACTIONS, AiAction, costOf, isAiAction, MAX_ACTION_COST } from '@/modules/billing/domain/services/ai-actions';
import { AiCreditRepository } from '@/modules/billing/infrastructure/repositories/ai-credit.repository';
import {
  CreateAiCreditPackDto,
  TestAiConnectionDto,
  UpdateAiCreditPackDto,
  UpdateAiSettingsDto,
} from '../dto/ai-settings.dto';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

export interface AiSettingsView {
  provider: string;
  model: string;
  apiKeySet: boolean;
  /** Where each value comes from: saved here, or the AI_* env vars */
  source: { provider: 'settings' | 'env'; model: 'settings' | 'env'; apiKey: 'settings' | 'env' | 'none' };
  providers: readonly string[];
  actions: { action: AiAction; label: string; defaultCost: number; cost: number }[];
  packs: AiCreditPack[];
}

/** GET /super-admin/ai */
@Injectable()
export class GetAiSettingsUseCase {
  constructor(
    private readonly settings: PlatformSettingsService,
    private readonly aiProvider: AiProviderService,
    private readonly repo: AiCreditRepository,
  ) {}

  async execute(): Promise<AiSettingsView> {
    const [{ ai }, conn, storedKey, packs] = await Promise.all([
      this.settings.get(),
      this.aiProvider.connection(),
      this.settings.getAiApiKey(),
      this.repo.listPacks(),
    ]);
    return {
      provider: conn.provider,
      model: conn.model,
      apiKeySet: !!conn.apiKey,
      source: {
        provider: ai.provider ? 'settings' : 'env',
        model: ai.model ? 'settings' : 'env',
        apiKey: storedKey ? 'settings' : conn.apiKey ? 'env' : 'none',
      },
      providers: AI_PROVIDERS,
      actions: (Object.keys(AI_ACTIONS) as AiAction[]).map((action) => ({
        action,
        label: AI_ACTIONS[action].label,
        defaultCost: AI_ACTIONS[action].defaultCost,
        cost: costOf(action, ai.actionCosts),
      })),
      packs,
    };
  }
}

/** PATCH /super-admin/ai — audited; the key is encrypted and only ever audited as changed/cleared. */
@Injectable()
export class UpdateAiSettingsUseCase {
  constructor(
    private readonly repo: PlatformSettingRepository,
    private readonly settings: PlatformSettingsService,
    private readonly audit: PlatformAuditService,
    private readonly getView: GetAiSettingsUseCase,
  ) {}

  async execute(dto: UpdateAiSettingsDto, actor: AuditActor, meta: RequestMeta): Promise<AiSettingsView> {
    this.settings.invalidate();
    const { ai } = await this.settings.get();
    const K = PLATFORM_SETTING_KEYS;
    const set: { key: string; value: Prisma.InputJsonValue }[] = [];
    const remove: string[] = [];
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (dto.provider !== undefined && dto.provider !== ai.provider) {
      set.push({ key: K.aiProvider, value: dto.provider });
      before.provider = ai.provider;
      after.provider = dto.provider;
    }

    if (dto.model !== undefined) {
      const model = dto.model.trim();
      if (model !== (ai.model ?? '')) {
        if (model) set.push({ key: K.aiModel, value: model });
        else remove.push(K.aiModel);
        before.model = ai.model;
        after.model = model || null;
      }
    }

    if (dto.apiKey === null) {
      if (ai.apiKeyEncrypted) {
        remove.push(K.aiApiKey);
        before.apiKey = 'set';
        after.apiKey = 'cleared';
      }
    } else if (dto.apiKey?.trim()) {
      set.push({ key: K.aiApiKey, value: this.settings.encryptSecret(dto.apiKey.trim()) });
      before.apiKey = ai.apiKeyEncrypted ? 'set' : 'none';
      after.apiKey = 'changed';
    }

    if (dto.actionCosts !== undefined) {
      const costs = { ...ai.actionCosts };
      for (const [action, cost] of Object.entries(dto.actionCosts)) {
        if (!isAiAction(action)) throw new BadRequestException(`Unknown AI action: ${action}`);
        if (!Number.isInteger(cost) || cost < 0 || cost > MAX_ACTION_COST) {
          throw new BadRequestException(`Cost for ${action} must be a whole number from 0 to ${MAX_ACTION_COST}`);
        }
        // Store only what differs from the default, so default changes still reach it
        if (cost === AI_ACTIONS[action].defaultCost) delete costs[action];
        else costs[action] = cost;
      }
      if (JSON.stringify(costs) !== JSON.stringify(ai.actionCosts)) {
        set.push({ key: K.aiActionCosts, value: costs });
        before.actionCosts = ai.actionCosts;
        after.actionCosts = costs;
      }
    }

    if (set.length || remove.length) {
      await this.repo.apply(set, remove, actor.id);
      this.settings.invalidate();
      await this.audit.record({
        action: PlatformAuditAction.PLATFORM_SETTING_CHANGED,
        actor,
        targetType: 'PlatformSetting',
        targetId: 'ai',
        metadata: { label: 'AI provider & credits', before, after },
        meta,
      });
    }
    return this.getView.execute();
  }
}

/** POST /super-admin/ai/test — one tiny completion, so a wrong key/model shows before it's saved. */
@Injectable()
export class TestAiConnectionUseCase {
  constructor(
    private readonly aiProvider: AiProviderService,
    private readonly settings: PlatformSettingsService,
  ) {}

  async execute(dto: TestAiConnectionDto) {
    const apiKey = dto.apiKey?.trim() || (await this.aiProvider.connection()).apiKey;
    if (!apiKey) return { ok: false, error: 'No API key saved yet. Paste one to test it.' };
    const started = Date.now();
    try {
      const result = await this.aiProvider.completeWith(
        { provider: dto.provider, model: dto.model.trim(), apiKey },
        { systemPrompt: 'Reply with exactly: OK', userPrompt: 'Say OK', maxTokens: 10 },
      );
      return { ok: true, latencyMs: Date.now() - started, reply: result.text.slice(0, 100) };
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - started, error: (err as Error).message.slice(0, 300) };
    }
  }
}

/**
 * POST /super-admin/ai/models — the provider's model ids. Uses the key typed in the
 * form, else the stored key when it belongs to this provider.
 */
@Injectable()
export class ListAiModelsUseCase {
  constructor(private readonly aiProvider: AiProviderService) {}

  async execute(provider: string, typedKey?: string) {
    const conn = await this.aiProvider.connection();
    const apiKey = typedKey?.trim() || (provider === conn.provider ? conn.apiKey : '');
    return this.aiProvider.listModels({ provider, model: '', apiKey });
  }
}

/** GET /super-admin/ai/usage — platform-wide AI calls and credits. */
@Injectable()
export class GetAiUsageUseCase {
  constructor(private readonly repo: AiCreditRepository) {}

  async execute() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [day, month] = await Promise.all([this.repo.usageSince(today), this.repo.usageSince(monthAgo)]);
    return { today: day, last30Days: month };
  }
}

/** GET /super-admin/ai/packs/:id — the pack and how it has sold. */
@Injectable()
export class GetAiCreditPackUseCase {
  constructor(private readonly repo: AiCreditRepository) {}

  async execute(id: string) {
    const pack = await this.repo.findPack(id);
    if (!pack) throw new NotFoundException('Credit pack not found');
    return { pack, sales: await this.repo.packSales(id) };
  }
}

/** POST /super-admin/ai/packs */
@Injectable()
export class CreateAiCreditPackUseCase {
  constructor(
    private readonly repo: AiCreditRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(dto: CreateAiCreditPackDto, actor: AuditActor, meta: RequestMeta) {
    const pack = await this.repo.createPack({ ...dto, name: dto.name.trim(), currency: dto.currency.toUpperCase() });
    await this.audit.record({
      action: PlatformAuditAction.AI_CREDIT_PACK_CREATED,
      actor,
      targetType: 'AiCreditPack',
      targetId: pack.id,
      metadata: { after: { name: pack.name, credits: pack.credits, priceInCents: pack.priceInCents, currency: pack.currency } },
      meta,
    });
    return pack;
  }
}

/** PATCH /super-admin/ai/packs/:id — price, size, order, or taking it off sale. */
@Injectable()
export class UpdateAiCreditPackUseCase {
  constructor(
    private readonly repo: AiCreditRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(id: string, dto: UpdateAiCreditPackDto, actor: AuditActor, meta: RequestMeta) {
    const current = await this.repo.findPack(id);
    if (!current) throw new NotFoundException('Credit pack not found');
    const pack = await this.repo.updatePack(id, { ...dto, ...(dto.name && { name: dto.name.trim() }) });
    const pick = (p: AiCreditPack) => ({ name: p.name, credits: p.credits, priceInCents: p.priceInCents, isActive: p.isActive, sortOrder: p.sortOrder });
    await this.audit.record({
      action: PlatformAuditAction.AI_CREDIT_PACK_UPDATED,
      actor,
      targetType: 'AiCreditPack',
      targetId: id,
      metadata: { before: pick(current), after: pick(pack) },
      meta,
    });
    return pack;
  }
}
