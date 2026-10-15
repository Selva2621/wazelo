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
import { searchTerm } from '../../domain/services/search-term';
import { ticketSla, TicketSla } from '../../domain/services/ticket-sla';
import { listOrderBy } from '../../domain/services/list-sort';
import { buildCsvExport, CSV_EXPORT_MAX_ROWS, CsvColumn, CsvExport } from '../../domain/services/csv';
import { PlatformAuditAction, TicketStatus } from '@prisma/client';
import { AuditActor, PlatformAuditService, RequestMeta } from '../services/platform-audit.service';
import { SuperAdminTicketNotifier } from '../services/super-admin-ticket-notifier.service';

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
    private readonly notifier: SuperAdminTicketNotifier,
  ) {}

  async execute(orgId: string, userId: string, dto: CreateTicketDto, audit?: SuperAdminAuditContext) {
    // Super admins pass both ids by hand: the user must really belong to that (live) org.
    // Tenant callers take both from their own token, so this always holds for them.
    if (audit && !(await this.ticketRepo.userBelongsToOrg(userId, orgId))) {
      throw new BadRequestException('That user does not belong to this organization');
    }
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
    } else {
      // Opened by the tenant: tell support (best effort — never fails the request)
      await this.notifier.notify('created', ticket, ticket.description);
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

function baseTicketFilter(query: ListTicketsQueryDto): ListTicketsFilter {
  return {
    page: query.page,
    limit: query.limit,
    status: query.status,
    category: query.category,
    priority: query.priority,
  };
}

/** Super admin queue filters: org, search, needs-reply, assignee ("me" → `superAdminId`) and sort. */
function queueFilter(query: ListTicketsQueryDto, superAdminId?: string): ListTicketsFilter {
  const filter = baseTicketFilter(query);
  if (query.orgId) filter.orgId = query.orgId;
  filter.search = searchTerm(query.search);
  filter.needsReply = query.needsReply === true;
  if (query.assignee === 'me') filter.assignedToId = superAdminId;
  else if (query.assignee === 'unassigned') filter.assignedToId = null;
  else if (query.assignee) filter.assignedToId = query.assignee;
  filter.orderBy = listOrderBy('tickets', query.sort, query.order);
  return filter;
}

type QueueTicket = Awaited<ReturnType<HelpTicketRepository['findAllForExport']>>[number] & { sla: TicketSla };

function personName(p: { firstName: string | null; lastName: string | null }): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ');
}

const TICKET_COLUMNS: CsvColumn<QueueTicket>[] = [
  { header: 'Ticket ID', value: (t) => t.id },
  { header: 'Title', value: (t) => t.title },
  { header: 'Organization', value: (t) => t.organization.name },
  { header: 'Status', value: (t) => t.status },
  { header: 'Priority', value: (t) => t.priority },
  { header: 'Category', value: (t) => t.category },
  { header: 'Requester', value: (t) => personName(t.user) },
  { header: 'Requester email', value: (t) => t.user.email },
  { header: 'Assignee', value: (t) => t.assignedTo?.name ?? '' },
  { header: 'Assignee email', value: (t) => t.assignedTo?.email ?? '' },
  { header: 'Replies', value: (t) => t._count.replies },
  { header: 'Last reply by', value: (t) => t.lastReplyBy },
  { header: 'First response at', value: (t) => t.firstResponseAt },
  { header: 'SLA', value: (t) => t.sla.state },
  { header: 'SLA due at', value: (t) => t.sla.dueAt },
  { header: 'Created at', value: (t) => t.createdAt },
  { header: 'Updated at', value: (t) => t.updatedAt },
  { header: 'Closed at', value: (t) => t.closedAt },
];

@Injectable()
export class ListTicketsUseCase {
  constructor(private readonly ticketRepo: HelpTicketRepository) {}

  /** `superAdminId` resolves the "me" assignee filter on the super admin queue. */
  async execute(query: ListTicketsQueryDto, orgId?: string, isSuperAdmin?: boolean, superAdminId?: string) {
    if (isSuperAdmin) {
      const result = await this.ticketRepo.findAll(queueFilter(query, superAdminId));
      const now = new Date();
      return { ...result, tickets: result.tickets.map((t) => ({ ...t, sla: ticketSla(t, now) })) };
    }

    return this.ticketRepo.findByOrg(orgId!, baseTicketFilter(query));
  }

  /** Super admin queue as CSV: same filters and sort, no paging; capped at CSV_EXPORT_MAX_ROWS. */
  async exportCsv(query: ListTicketsQueryDto, superAdminId: string): Promise<CsvExport> {
    const tickets = await this.ticketRepo.findAllForExport(queueFilter(query, superAdminId), CSV_EXPORT_MAX_ROWS + 1);
    const now = new Date();
    return buildCsvExport(
      'tickets',
      tickets.map((t) => ({ ...t, sla: ticketSla(t, now) })),
      TICKET_COLUMNS,
    );
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
    private readonly notifier: SuperAdminTicketNotifier,
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
    // A closed ticket is final for the customer; support can still add notes or replies
    if (userId && ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('This ticket is closed. Please open a new ticket.');
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

    // A customer reply notifies the assignee (or the whole team when unassigned)
    if (userId && !superAdminId && !isInternal) {
      await this.notifier.notify('customer_reply', ticket, dto.body);
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
