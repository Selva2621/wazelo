import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CouponKind, PlatformAuditAction, Prisma } from '@prisma/client';
import { CouponRepository } from '@/modules/billing/infrastructure/repositories/coupon.repository';
import { checkCouponDefinition, normalizeCouponCode } from '@/modules/billing/domain/services/coupons';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

export interface CreateCouponInput {
  code: string;
  kind: CouponKind;
  percentOff?: number;
  amountOffInCents?: number;
  currency?: string;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
  appliesToPlanIds?: string[];
  firstPaymentOnly?: boolean;
}

function toDate(value: string | undefined, label: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid ${label}`);
  return d;
}

/** Every coupon (active or not), newest first, with its plan names resolved. */
@Injectable()
export class ListCouponsUseCase {
  constructor(private readonly couponRepo: CouponRepository) {}

  async execute() {
    const coupons = await this.couponRepo.list();
    const planIds = [...new Set(coupons.flatMap((c) => c.appliesToPlanIds))];
    const plans = new Map((await this.couponRepo.plansByIds(planIds)).map((p) => [p.id, p]));
    return {
      coupons: coupons.map((c) => ({
        ...c,
        plans: c.appliesToPlanIds
          .map((id) => plans.get(id))
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => ({ id: p.id, name: p.name, billingCycle: p.billingCycle })),
      })),
    };
  }
}

@Injectable()
export class CreateCouponUseCase {
  constructor(
    private readonly couponRepo: CouponRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(input: CreateCouponInput, actor: AuditActor, meta: RequestMeta) {
    const code = normalizeCouponCode(input.code);
    const validFrom = toDate(input.validFrom, 'valid from date');
    const validUntil = toDate(input.validUntil, 'valid until date');
    const isFixed = input.kind === CouponKind.FIXED;
    const def = {
      code,
      kind: input.kind,
      percentOff: input.percentOff ?? null,
      amountOffInCents: input.amountOffInCents ?? null,
      currency: input.currency ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
      validFrom,
      validUntil,
      firstPaymentOnly: input.firstPaymentOnly ?? true,
    };
    const check = checkCouponDefinition(def);
    if (!check.ok) throw new BadRequestException(check.reason);

    const appliesToPlanIds = [...new Set(input.appliesToPlanIds ?? [])];
    const plans = await this.couponRepo.plansByIds(appliesToPlanIds);
    if (plans.length !== appliesToPlanIds.length) throw new BadRequestException('One or more plans were not found');

    let coupon;
    try {
      coupon = await this.couponRepo.create({
        ...def,
        // A percent coupon has no currency; a fixed one keeps its own
        currency: isFixed ? def.currency : null,
        firstPaymentOnly: true,
        appliesToPlanIds,
        createdById: actor.id,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`A coupon with code ${code} already exists`);
      }
      throw err;
    }

    await this.audit.record({
      action: PlatformAuditAction.COUPON_CREATED,
      actor,
      targetType: 'Coupon',
      targetId: coupon.id,
      metadata: {
        code,
        kind: coupon.kind,
        percentOff: coupon.percentOff,
        amountOffInCents: coupon.amountOffInCents,
        currency: coupon.currency,
        maxRedemptions: coupon.maxRedemptions,
        validFrom: validFrom?.toISOString() ?? null,
        validUntil: validUntil?.toISOString() ?? null,
        appliesToPlanIds,
      },
      meta,
    });
    return { ...coupon, plans: plans.map((p) => ({ id: p.id, name: p.name, billingCycle: p.billingCycle })) };
  }
}

/** Stops new redemptions. Coupons are never deleted (redemptions reference them). */
@Injectable()
export class DeactivateCouponUseCase {
  constructor(
    private readonly couponRepo: CouponRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(id: string, actor: AuditActor, meta: RequestMeta) {
    const existing = await this.couponRepo.findById(id);
    if (!existing) throw new NotFoundException('Coupon not found');
    const coupon = await this.couponRepo.deactivate(id);
    if (!coupon) throw new ConflictException('This coupon is already inactive');

    await this.audit.record({
      action: PlatformAuditAction.COUPON_DEACTIVATED,
      actor,
      targetType: 'Coupon',
      targetId: id,
      metadata: { code: coupon.code, redemptionCount: coupon.redemptionCount },
      meta,
    });
    return coupon;
  }
}
