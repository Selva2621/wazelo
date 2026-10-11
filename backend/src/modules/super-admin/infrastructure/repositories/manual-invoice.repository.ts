import { Injectable } from '@nestjs/common';
import { CreditEntryKind, Invoice, InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PaymentRepository } from '@/modules/billing/infrastructure/repositories/payment.repository';
import { ManualLine } from '../../domain/services/manual-invoices';

type LockedInvoice = Pick<Invoice, 'id' | 'orgId' | 'subscriptionId' | 'status' | 'amountInCents' | 'currency' | 'invoiceNumber' | 'paymentId'> & {
  metadata: Prisma.JsonValue;
};

function metadataObject(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * Super admin invoice operations (cross-tenant). Settling writes lock the invoice row
 * (SELECT … FOR UPDATE) so mark-paid and void can't both win, and `decide` sees the
 * locked state and may refuse (throw) before anything is written.
 */
@Injectable()
export class ManualInvoiceRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentRepo: PaymentRepository,
  ) {}

  async create(input: {
    orgId: string;
    currency: string;
    dueDate: Date;
    lineItems: ManualLine[];
    totalInCents: number;
    note: string | null;
    createdById: string;
  }): Promise<Invoice> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const invoiceNumber = await this.paymentRepo.getNextInvoiceNumber(tx);
      return this.paymentRepo.createInvoice(
        {
          orgId: input.orgId,
          subscriptionId: null,
          invoiceNumber,
          amountInCents: input.totalInCents,
          currency: input.currency,
          periodStart: now,
          periodEnd: now,
          lineItems: input.lineItems as unknown as Record<string, unknown>[],
          dueDate: input.dueDate,
          status: InvoiceStatus.OPEN,
          metadata: { manual: true, createdById: input.createdById, note: input.note },
        },
        tx,
      );
    });
  }

  private async lockInvoice(tx: Prisma.TransactionClient, id: string): Promise<LockedInvoice | null> {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id::text AS id FROM invoices WHERE id = ${id}::uuid FOR UPDATE`;
    if (!rows.length) return null;
    return tx.invoice.findUnique({
      where: { id },
      select: {
        id: true, orgId: true, subscriptionId: true, status: true, amountInCents: true,
        currency: true, invoiceNumber: true, paymentId: true, metadata: true,
      },
    });
  }

  /** Records a SUCCEEDED manual payment and marks the invoice PAID, linking the payment. */
  async markPaid(
    id: string,
    input: { paidAt: Date; note: string | null; actorId: string },
    decide: (invoice: LockedInvoice) => void,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await this.lockInvoice(tx, id);
      if (!invoice) return null;
      decide(invoice);

      const payment = await tx.payment.create({
        data: {
          orgId: invoice.orgId,
          subscriptionId: invoice.subscriptionId,
          amountInCents: invoice.amountInCents,
          currency: invoice.currency,
          status: PaymentStatus.SUCCEEDED,
          paymentMethod: 'manual',
          paidAt: input.paidAt,
          idempotencyKey: `manual-invoice-${invoice.id}`,
          metadata: { manual: true, invoiceId: invoice.id, note: input.note, recordedById: input.actorId },
        },
      });
      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: input.paidAt,
          paymentId: payment.id,
          metadata: {
            ...metadataObject(invoice.metadata),
            markedPaidById: input.actorId,
            paidNote: input.note,
          } as Prisma.InputJsonValue,
        },
      });
      return { invoice: updated, payment, previousStatus: invoice.status };
    });
  }

  /**
   * Voids the invoice. Account credit that had been applied to it is given back with a
   * compensating GRANT entry (org row locked, like every balance change).
   */
  async void(
    id: string,
    input: { reason: string; actorId: string },
    decide: (invoice: LockedInvoice) => void,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await this.lockInvoice(tx, id);
      if (!invoice) return null;
      decide(invoice);

      const updated = await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.VOID,
          metadata: {
            ...metadataObject(invoice.metadata),
            voidReason: input.reason,
            voidedById: input.actorId,
            voidedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      const applied = await tx.orgCreditEntry.aggregate({
        where: { invoiceId: id, kind: CreditEntryKind.APPLIED },
        _sum: { amountInCents: true },
      });
      const creditToRestore = -(applied._sum.amountInCents ?? 0);
      if (creditToRestore > 0) {
        await tx.$queryRaw`SELECT id::text AS id FROM organizations WHERE id = ${invoice.orgId}::uuid FOR UPDATE`;
        await tx.orgCreditEntry.create({
          data: {
            orgId: invoice.orgId,
            currency: invoice.currency,
            amountInCents: creditToRestore,
            kind: CreditEntryKind.GRANT,
            reason: `Credit restored: invoice ${invoice.invoiceNumber} voided`,
            invoiceId: id,
            idempotencyKey: `credit-restore:${id}`,
            createdById: input.actorId,
          },
        });
      }
      return { invoice: updated, previousStatus: invoice.status, creditRestoredInCents: creditToRestore };
    });
  }
}
