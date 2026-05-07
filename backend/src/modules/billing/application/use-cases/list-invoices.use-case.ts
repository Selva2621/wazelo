import { Injectable } from '@nestjs/common';
import { PaymentRepository } from '../../infrastructure/repositories/payment.repository';
import { ListInvoicesQueryDto, ListPaymentsQueryDto } from '../dto/list-billing-query.dto';

@Injectable()
export class ListInvoicesUseCase {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  async execute(orgId: string, query: ListInvoicesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { invoices, total } = await this.paymentRepo.findInvoicesByOrgPaginated(
      orgId,
      {
        take: limit,
        skip: (page - 1) * limit,
        status: query.status,
      },
    );

    return {
      data: invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

@Injectable()
export class ListPaymentsUseCase {
  constructor(private readonly paymentRepo: PaymentRepository) {}

  async execute(orgId: string, query: ListPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { payments, total } = await this.paymentRepo.findPaymentsByOrgPaginated(
      orgId,
      {
        take: limit,
        skip: (page - 1) * limit,
        status: query.status,
      },
    );

    return {
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
