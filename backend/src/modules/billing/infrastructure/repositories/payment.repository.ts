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
  subscriptionId: string;
  amountInCents: number;
  currency?: string;
  externalId?: string;
  paymentMethod?: string;
  idempotencyKey?: string;
}

export interface CreateInvoiceInput {
  orgId: string;
  subscriptionId: string;
  paymentId?: string;
  invoiceNumber: string;
  amountInCents: number;
  currency?: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: Record<string, unknown>[];
  dueDate: Date;
  externalId?: string;
}

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Payments ──

  async createPayment(input: CreatePaymentInput): Promise<Payment> {
    return this.prisma.payment.create({
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
  ): Promise<Payment | null> {
    const result = await this.prisma.payment.updateMany({
      where: { id, status: expectedStatus },
      data: { status: newStatus, ...extra },
    });

    if (result.count === 0) return null;
    return this.findPaymentById(id);
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

  async createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    return this.prisma.invoice.create({
      data: {
        orgId: input.orgId,
        subscriptionId: input.subscriptionId,
        paymentId: input.paymentId || null,
        invoiceNumber: input.invoiceNumber,
        amountInCents: input.amountInCents,
        currency: input.currency || 'USD',
        status: InvoiceStatus.DRAFT,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        lineItems: input.lineItems as Prisma.InputJsonValue,
        dueDate: input.dueDate,
        externalId: input.externalId || null,
      },
    });
  }

  async findInvoiceById(id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({ where: { id } });
  }

  async transitionInvoiceStatus(
    id: string,
    expectedStatus: InvoiceStatus,
    newStatus: InvoiceStatus,
    extra?: Record<string, unknown>,
  ): Promise<Invoice | null> {
    const result = await this.prisma.invoice.updateMany({
      where: { id, status: expectedStatus },
      data: { status: newStatus, ...extra },
    });

    if (result.count === 0) return null;
    return this.findInvoiceById(id);
  }

  async findInvoicesByOrgPaginated(
    orgId: string,
    options: { take?: number; skip?: number; status?: InvoiceStatus },
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const where: Prisma.InvoiceWhereInput = {
      orgId,
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

  async getNextInvoiceNumber(): Promise<string> {
    const count = await this.prisma.invoice.count();
    const padded = String(count + 1).padStart(8, '0');
    return `INV-${padded}`;
  }
}
