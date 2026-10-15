import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  Payment,
  PaymentStatus,
  Invoice,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';

export interface CreatePaymentInput {
  orgId: string;
  subscriptionId: string | null;
  amountInCents: number;
  currency?: string;
  externalId?: string;
  paymentMethod?: string;
  idempotencyKey?: string;
}

export interface CreateInvoiceInput {
  orgId: string;
  /** Null only for manual invoices raised by a super admin */
  subscriptionId: string | null;
  paymentId?: string;
  invoiceNumber: string;
  amountInCents: number;
  currency?: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: Record<string, unknown>[];
  dueDate: Date;
  externalId?: string;
  /** Defaults to DRAFT */
  status?: InvoiceStatus;
  paidAt?: Date;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Payments ──

  /** @param tx run inside the caller's transaction */
  async createPayment(input: CreatePaymentInput, tx?: Prisma.TransactionClient): Promise<Payment> {
    return (tx ?? this.prisma).payment.create({
      data: {
        orgId: input.orgId,
        subscriptionId: input.subscriptionId,
        amountInCents: input.amountInCents,
        currency: input.currency || 'USD',
        status: PaymentStatus.PENDING,
        externalId: input.externalId || null,
        paymentMethod: input.paymentMethod || null,
        idempotencyKey: input.idempotencyKey || null,
      },
    });
  }

  async findPaymentById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async findPaymentByIdempotencyKey(key: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async findPaymentByExternalId(externalId: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { externalId },
    });
  }

  async transitionPaymentStatus(
    id: string,
    expectedStatus: PaymentStatus,
    newStatus: PaymentStatus,
    extra?: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ): Promise<Payment | null> {
    // A succeeded payment always gets paidAt (revenue reporting groups by it);
    // callers may still pass their own timestamp
    const paidAt = newStatus === PaymentStatus.SUCCEEDED ? { paidAt: new Date() } : {};
    const db = tx ?? this.prisma;
    const result = await db.payment.updateMany({
      where: { id, status: expectedStatus },
      data: { status: newStatus, ...paidAt, ...extra },
    });

    if (result.count === 0) return null;
    return db.payment.findUnique({ where: { id } });
  }

  async schedulePaymentRetry(
    id: string,
    nextRetryAt: Date,
  ): Promise<void> {
    await this.prisma.payment.update({
      where: { id },
      data: {
        retryCount: { increment: 1 },
        nextRetryAt,
      },
    });
  }

  async findPaymentsForRetry(beforeTime: Date): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.FAILED,
        nextRetryAt: { lte: beforeTime },
        retryCount: { lt: this.prisma.payment.fields?.maxRetries as any ?? 3 },
      },
    });
  }

  async findPaymentsByOrgPaginated(
    orgId: string,
    options: { take?: number; skip?: number; status?: PaymentStatus },
  ): Promise<{ payments: Payment[]; total: number }> {
    const where: Prisma.PaymentWhereInput = {
      orgId,
      ...(options.status && { status: options.status }),
    };

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        take: options.take ?? 20,
        skip: options.skip ?? 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { payments, total };
  }

  // ── Invoices ──

  /** @param tx run inside the caller's transaction */
  async createInvoice(input: CreateInvoiceInput, tx?: Prisma.TransactionClient): Promise<Invoice> {
    return (tx ?? this.prisma).invoice.create({
      data: {
        orgId: input.orgId,
        subscriptionId: input.subscriptionId,
        paymentId: input.paymentId || null,
        invoiceNumber: input.invoiceNumber,
        amountInCents: input.amountInCents,
        currency: input.currency || 'USD',
        status: input.status ?? InvoiceStatus.DRAFT,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        lineItems: input.lineItems as Prisma.InputJsonValue,
        dueDate: input.dueDate,
        externalId: input.externalId || null,
        paidAt: input.paidAt ?? null,
        ...(input.metadata !== undefined && { metadata: input.metadata }),
      },
    });
  }

  /**
   * OPEN/DRAFT → PAID, optionally linking the payment. Conditional, so a concurrent
   * void or second settle loses; returns null when the invoice was not open.
   */
  async markInvoicePaid(
    id: string,
    data: { paymentId?: string; paidAt?: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<Invoice | null> {
    const db = tx ?? this.prisma;
    const result = await db.invoice.updateMany({
      where: { id, status: { in: [InvoiceStatus.OPEN, InvoiceStatus.DRAFT] } },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: data.paidAt ?? new Date(),
        ...(data.paymentId && { paymentId: data.paymentId }),
      },
    });
    if (result.count === 0) return null;
    return db.invoice.findUnique({ where: { id } });
  }

  async findInvoiceById(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({ where: { id } });
  }

  async transitionInvoiceStatus(
    id: string,
    expectedStatus: InvoiceStatus,
    newStatus: InvoiceStatus,
    extra?: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ): Promise<Invoice | null> {
    const db = tx ?? this.prisma;
    const result = await db.invoice.updateMany({
      where: { id, status: expectedStatus },
      data: { status: newStatus, ...extra },
    });

    if (result.count === 0) return null;
    return db.invoice.findUnique({ where: { id } });
  }

  async findInvoicesByOrgPaginated(
    orgId: string,
    options: { take?: number; skip?: number; status?: InvoiceStatus },
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = {
      orgId,
      // Exclude zero-amount DRAFT invoices (free-trial signup noise)
      NOT: { status: 'DRAFT', amountInCents: 0 },
      ...(options.status && { status: options.status }),
    };

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        take: options.take ?? 20,
        skip: options.skip ?? 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices, total };
  }

  /** @param tx run inside the caller's transaction */
  async getNextInvoiceNumber(tx?: Prisma.TransactionClient): Promise<string> {
    const count = await (tx ?? this.prisma).invoice.count();
    const padded = String(count + 1).padStart(8, '0');
    return `INV-${padded}`;
  }
}
