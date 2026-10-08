import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { HelpTicketRepository, ListTicketsFilter } from '../../infrastructure/repositories/help-ticket.repository';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import {
  CreateTicketDto,
  ReplyToTicketDto,
  SuperAdminReplyDto,
  UpdateTicketStatusDto,
  ListTicketsQueryDto,
} from '../dto/ticket.dto';
import { EVENT_NAMES } from '@/common/constants';
import { PlatformAuditAction, TicketStatus } from '@prisma/client';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';

/** Passed only on super admin paths — the action is then recorded in the platform audit log. */
export interface SuperAdminAuditContext {
  actor: AuditActor;
  meta: RequestMeta;
}

@Injectable()
export class CreateTicketUseCase {
  constructor(
    private readonly ticketRepo: HelpTicketRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(orgId: string, userId: string, dto: CreateTicketDto, audit?: SuperAdminAuditContext) {
    const { orgId: _o, userId: _u, ...rest } = dto;
    const ticket = await this.ticketRepo.create({ orgId, userId, ...rest });
    if (audit) {
      await this.audit.record({
        action: PlatformAuditAction.TICKET_CREATED,
        actor: audit.actor,
        targetType: 'HelpTicket',
        targetId: ticket.id,
        orgId,
        metadata: { title: ticket.title, onBehalfOfUserId: userId },
        meta: audit.meta,
      });
    }
    return ticket;
  }
}

@Injectable()
export class GetTicketUseCase {
  constructor(private readonly ticketRepo: HelpTicketRepository) {}

  async execute(id: string, orgId?: string, isSuperAdmin?: boolean) {
    // Internal notes are loaded only for super admins
    const ticket = await this.ticketRepo.findById(id, !!isSuperAdmin);
    // Org users can only see their own org's tickets — 404, not 403, so
    // another org's ticket IDs can't be probed for existence
    if (!ticket || (!isSuperAdmin && ticket.orgId !== orgId)) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }
}

@Injectable()
export class ListTicketsUseCase {
  constructor(private readonly ticketRepo: HelpTicketRepository) {}

  /** `superAdminId` resolves the "me" assignee filter on the super admin queue. */
  async execute(query: ListTicketsQueryDto, orgId?: string, isSuperAdmin?: boolean, superAdminId?: string) {
    const filter: ListTicketsFilter = {
      page: query.page,
      limit: query.limit,
      status: query.status,
      category: query.category,
      priority: query.priority,
    };

    if (isSuperAdmin) {
      if (query.orgId) filter.orgId = query.orgId;
      if (query.assignee === 'me') filter.assignedToId = superAdminId;
      else if (query.assignee === 'unassigned') filter.assignedToId = null;
      else if (query.assignee) filter.assignedToId = query.assignee;
      return this.ticketRepo.findAll(filter);
    }

    return this.ticketRepo.findByOrg(orgId!, filter);
  }
}

@Injectable()
export class AssignTicketUseCase {
  constructor(
    private readonly ticketRepo: HelpTicketRepository,
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  /** Assign to a super admin, or unassign with null. */
  async execute(ticketId: string, assigneeId: string | null, ctx: SuperAdminAuditContext) {
    const ticket = await this.ticketRepo.findById(ticketId, true);
    if (!ticket) throw new NotFoundException('Ticket not found');

    let assigneeEmail: string | null = null;
    if (assigneeId) {
      const assignee = await this.superAdminRepo.findById(assigneeId);
      if (!assignee) throw new BadRequestException('Assignee is not a super admin');
      assigneeEmail = assignee.email;
    }

    if ((ticket.assignedToId ?? null) === assigneeId) return ticket.assignedTo ?? null;

    const updated = await this.ticketRepo.assign(ticketId, assigneeId);
    await this.audit.record({
      action: PlatformAuditAction.TICKET_ASSIGNED,
      actor: ctx.actor,
      targetType: 'HelpTicket',
      targetId: ticketId,
      orgId: ticket.orgId,
      metadata: {
        title: ticket.title,
        before: { assignee: ticket.assignedTo?.email ?? null },
        after: { assignee: assigneeEmail },
      },
      meta: ctx.meta,
    });
    return updated.assignedTo;
  }
}

@Injectable()
export class ReplyToTicketUseCase {
  constructor(
    private readonly ticketRepo: HelpTicketRepository,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(
    ticketId: string,
    dto: ReplyToTicketDto,
    userId?: string,
    superAdminId?: string,
    orgId?: string,
    audit?: SuperAdminAuditContext,
  ) {
    const ticket = await this.ticketRepo.findById(ticketId);
    // Org users can only reply to their own org's tickets
    if (!ticket || (userId && ticket.orgId !== orgId)) {
      throw new NotFoundException('Ticket not found');
    }

    // Only super admins can write internal notes (the tenant DTO rejects the field)
    const isInternal = !!superAdminId && (dto as SuperAdminReplyDto).internal === true;
    const reply = await this.ticketRepo.addReply(ticketId, dto.body, userId, superAdminId, isInternal);

    // A visible super admin reply notifies the ticket owner; internal notes don't
    if (superAdminId && !isInternal) {
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

    if (audit) {
      await this.audit.record({
        action: PlatformAuditAction.TICKET_REPLIED,
        actor: audit.actor,
        targetType: 'HelpTicket',
        targetId: ticketId,
        orgId: ticket.orgId,
        metadata: { title: ticket.title, replyLength: dto.body.length, internal: isInternal },
        meta: audit.meta,
      });
    }

    return reply;
  }
}

@Injectable()
export class UpdateTicketStatusUseCase {
  constructor(
    private readonly ticketRepo: HelpTicketRepository,
    private readonly audit: PlatformAuditService,
  ) {}

  async execute(
    id: string,
    dto: UpdateTicketStatusDto,
    orgId?: string,
    isSuperAdmin?: boolean,
    audit?: SuperAdminAuditContext,
  ) {
    const ticket = await this.ticketRepo.findById(id);
    if (!ticket || (!isSuperAdmin && ticket.orgId !== orgId)) {
      throw new NotFoundException('Ticket not found');
    }
    const updated = await this.ticketRepo.updateStatus(id, dto.status);
    if (audit && ticket.status !== dto.status) {
      await this.audit.record({
        action: PlatformAuditAction.TICKET_STATUS_CHANGED,
        actor: audit.actor,
        targetType: 'HelpTicket',
        targetId: id,
        orgId: ticket.orgId,
        metadata: { title: ticket.title, before: { status: ticket.status }, after: { status: dto.status } },
        meta: audit.meta,
      });
    }
    return updated;
  }
}
