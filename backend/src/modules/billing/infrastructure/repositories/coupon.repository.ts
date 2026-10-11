import { Injectable } from '@nestjs/common';
import { Coupon, CouponKind, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

export interface CreateCouponInput {
  code: string;
  kind: CouponKind;
  percentOff: number | null;
  amountOffInCents: number | null;
  currency: string | null;
  maxRedemptions: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  appliesToPlanIds: string[];
  firstPaymentOnly: boolean;
  createdById: string;
}

export interface RedeemCouponInput {
  couponId: string;
  orgId: string;
  subscriptionId?: string | null;
  invoiceId?: string | null;
  discountInCents: number;
  currency: string;
}

/** Thrown inside the redeem transaction so it rolls back; callers map it to a 409. */
export class CouponRedemptionError extends Error {
  constructor(readonly code: 'exhausted' | 'already_redeemed') {
    super(
      code === 'exhausted'
        ? 'This coupon has reached its redemption limit'
        : 'Your organization has already used this coupon',
    );
  }
}

@Injectable()
export class CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByCode(code: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { code } });
  }

  findById(id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  list(): Promise<Coupon[]> {
    return this.prisma.coupon.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
  }

  async hasRedeemed(couponId: string, orgId: string): Promise<boolean> {
    const hit = await this.prisma.couponRedemption.findUnique({
      where: { couponId_orgId: { couponId, orgId } },
      select: { id: true },
    });
    return hit !== null;
  }

  create(input: CreateCouponInput): Promise<Coupon> {
    return this.prisma.coupon.create({ data: input });
  }

  /** Conditional: returns null when the coupon was already inactive (or missing). */
  async deactivate(id: string): Promise<Coupon | null> {
    const result = await this.prisma.coupon.updateMany({ where: { id, active: true }, data: { active: false } });
    if (result.count === 0) return null;
    return this.findById(id);
  }

  /**
   * Records a redemption inside the caller's transaction. The count is claimed with a
   * conditional UPDATE (redemption_count < max_redemptions), so concurrent checkouts can
   * never exceed the limit; the (coupon_id, org_id) unique index stops a second use by
   * the same org. Either failure throws CouponRedemptionError, rolling the caller back.
   */
  async redeem(tx: Prisma.TransactionClient, input: RedeemCouponInput) {
    const claimed = await tx.$executeRaw`
      UPDATE coupons
      SET redemption_count = redemption_count + 1, updated_at = NOW()
      WHERE id = ${input.couponId}::uuid
        AND (max_redemptions IS NULL OR redemption_count < max_redemptions)`;
    if (claimed === 0) throw new CouponRedemptionError('exhausted');

    // Pre-check under the same transaction; the unique index is the final guard
    const existing = await tx.couponRedemption.findUnique({
      where: { couponId_orgId: { couponId: input.couponId, orgId: input.orgId } },
      select: { id: true },
    });
    if (existing) throw new CouponRedemptionError('already_redeemed');
    try {
      return await tx.couponRedemption.create({
        data: {
          couponId: input.couponId,
          orgId: input.orgId,
          subscriptionId: input.subscriptionId ?? null,
          invoiceId: input.invoiceId ?? null,
          discountInCents: input.discountInCents,
          currency: input.currency,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new CouponRedemptionError('already_redeemed');
      }
      throw err;
    }
  }

  plansByIds(ids: string[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.prisma.plan.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, billingCycle: true, currency: true },
    });
  }
}
