import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { HelpTicketRepository, ListTicketsFilter } from '../../infrastructure/repositories/help-ticket.repository';
import { CreateTicketDto, ReplyToTicketDto, UpdateTicketStatusDto, ListTicketsQueryDto } from '../dto/ticket.dto';
import { EVENT_NAMES } from '@/common/constants';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class CreateTicketUseCase {
  constructor(private readonly ticketRepo: HelpTicketRepository) {}

  async execute(orgId: string, userId: string, dto: CreateTicketDto) {
    const { orgId: _o, userId: _u, ...rest } = dto;
    return this.ticketRepo.create({ orgId, userId, ...rest });
  }
}

@Injectable()
export class GetTicketUseCase {
  constructor(private readonly ticketRepo: HelpTicketRepository) {}

  async execute(id: string, orgId?: string, isSuperAdmin?: boolean) {
    const ticket = await this.ticketRepo.findById(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    // Org users can only see their own org's tickets
    if (!isSuperAdmin && ticket.orgId !== orgId) {
      throw new ForbiddenException('Access denied');
    }
    return ticket;
  }
}

@Injectable()
export class ListTicketsUseCase {
  constructor(private readonly ticketRepo: HelpTicketRepository) {}

  async execute(query: ListTicketsQueryDto, orgId?: string, isSuperAdmin?: boolean) {
    const filter: ListTicketsFilter = {
      page: query.page,
      limit: query.limit,
      status: query.status,
      category: query.category,
      priority: query.priority,
    };

    if (isSuperAdmin) {
      if (query.orgId) filter.orgId = query.orgId;
      return this.ticketRepo.findAll(filter);
    }

    return this.ticketRepo.findByOrg(orgId!, filter);
  }
}

@Injectable()
export class ReplyToTicketUseCase {
  constructor(
    private readonly ticketRepo: HelpTicketRepository,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    ticketId: string,
    dto: ReplyToTicketDto,
    userId?: string,
    superAdminId?: string,
    orgId?: string,
  ) {
    const ticket = await this.ticketRepo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Org users can only reply to their own org's tickets
    if (userId && ticket.orgId !== orgId) {
      throw new ForbiddenException('Access denied');
    }

    const reply = await this.ticketRepo.addReply(ticketId, dto.body, userId, superAdminId);

    // If super admin replied, notify the ticket owner
    if (superAdminId) {
      await this.prisma.notification.create({
        data: {
          orgId: ticket.orgId,
          userId: ticket.userId,
          type: 'TICKET_REPLY' as any,
          priority: 'NORMAL',
          title: 'Support ticket updated',
          body: `Your ticket "${ticket.title}" has a new reply from support.`,
          channel: 'IN_APP',
        },
      });

      this.eventEmitter.emit(EVENT_NAMES.NOTIFICATION_CREATED, {
        userId: ticket.userId,
        orgId: ticket.orgId,
      });
    }

    return reply;
  }
}

@Injectable()
export class UpdateTicketStatusUseCase {
  constructor(private readonly ticketRepo: HelpTicketRepository) {}

  async execute(id: string, dto: UpdateTicketStatusDto, orgId?: string, isSuperAdmin?: boolean) {
    const ticket = await this.ticketRepo.findById(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (!isSuperAdmin && ticket.orgId !== orgId) {
      throw new ForbiddenException('Access denied');
    }
    return this.ticketRepo.updateStatus(id, dto.status);
  }
}
