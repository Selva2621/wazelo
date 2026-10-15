import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { buildManualInvoice, canSettleInvoice, ManualLineInput } from '../../domain/services/manual-invoices';
import { ManualInvoiceRepository } from '../../infrastructure/repositories/manual-invoice.repository';
import { PlatformRepository } from '../../infrastructure/repositories/platform.repository';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

export interface CreateManualInvoiceInput {
  orgId: string;
  currency: string;
  dueDate: string;
  note?: string;
  lineItems: ManualLineInput[];
}

/** Raises an OPEN invoice with custom line items for any org (with or without a subscription). Audited. */
@Injectable()
export class CreateManualInvoiceUseCase {
  constructor(
    private readonly platformRepo: PlatformRepository,
    private readonly invoiceRepo: ManualInvoiceRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(input: CreateManualInvoiceInput, actor: AuditActor, meta: RequestMeta) {
    const built = buildManualInvoice(input.lineItems);
    if (!built.ok) throw new BadRequestException(built.reason);
    const dueDate = new Date(input.dueDate);
    if (Number.isNaN(dueDate.getTime())) throw new BadRequestException('Invalid due date');
    if (!(await this.platformRepo.findOrgBasics(input.orgId))) throw new NotFoundException('Organization not found');

    const invoice = await this.invoiceRepo.create({
      orgId: input.orgId,
      currency: input.currency,
      dueDate,
      lineItems: built.lineItems,
      totalInCents: built.totalInCents,
      note: input.note?.trim() || null,
      createdById: actor.id,
    });

    await this.audit.record({
      action: PlatformAuditAction.INVOICE_CREATED,
      actor,
      targetType: 'Invoice',
      targetId: invoice.id,
      orgId: input.orgId,
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        amountInCents: built.totalInCents,
        currency: input.currency,
        lineItems: built.lineItems.length,
        dueDate: dueDate.toISOString(),
      },
      meta,
    });
    return invoice;
  }
}

function settleGuard(action: string) {
  return (invoice: { status: string }) => {
    if (!canSettleInvoice(invoice.status)) {
      throw new ConflictException(`Only open or draft invoices can be ${action} (this one is ${invoice.status})`);
    }
  };
}

/** Records an offline payment (bank transfer, cheque…) and marks the invoice PAID. Audited. */
@Injectable()
export class MarkInvoicePaidUseCase {
  constructor(
    private readonly invoiceRepo: ManualInvoiceRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(invoiceId: string, input: { note?: string; paidAt?: string }, actor: AuditActor, meta: RequestMeta) {
    const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) throw new BadRequestException('Invalid paid date');
    if (paidAt.getTime() > Date.now() + 5 * 60_000) throw new BadRequestException('Paid date cannot be in the future');

    const result = await this.invoiceRepo.markPaid(
      invoiceId,
      { paidAt, note: input.note?.trim() || null, actorId: actor.id },
      settleGuard('marked paid'),
    );
    if (!result) throw new NotFoundException('Invoice not found');

    await this.audit.record({
      action: PlatformAuditAction.INVOICE_MARKED_PAID,
      actor,
      targetType: 'Invoice',
      targetId: invoiceId,
      orgId: result.invoice.orgId,
      metadata: {
        invoiceNumber: result.invoice.invoiceNumber,
        paymentId: result.payment.id,
        amountInCents: result.invoice.amountInCents,
        currency: result.invoice.currency,
        previousStatus: result.previousStatus,
        paidAt: paidAt.toISOString(),
        note: input.note ?? null,
      },
      meta,
    });
    return result.invoice;
  }
}

/** Voids an OPEN/DRAFT invoice; any account credit applied to it is restored. Audited. */
@Injectable()
export class VoidInvoiceUseCase {
  constructor(
    private readonly invoiceRepo: ManualInvoiceRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(invoiceId: string, reason: string, actor: AuditActor, meta: RequestMeta) {
    const result = await this.invoiceRepo.void(invoiceId, { reason, actorId: actor.id }, settleGuard('voided'));
    if (!result) throw new NotFoundException('Invoice not found');

    await this.audit.record({
      action: PlatformAuditAction.INVOICE_VOIDED,
      actor,
      targetType: 'Invoice',
      targetId: invoiceId,
      orgId: result.invoice.orgId,
      metadata: {
        invoiceNumber: result.invoice.invoiceNumber,
        amountInCents: result.invoice.amountInCents,
        currency: result.invoice.currency,
        previousStatus: result.previousStatus,
        reason,
        creditRestoredInCents: result.creditRestoredInCents,
      },
      meta,
    });
    return result.invoice;
  }
}
