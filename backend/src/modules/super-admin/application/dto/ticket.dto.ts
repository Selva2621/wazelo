import {
  IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, MaxLength, IsUUID, IsUrl,
  IsBoolean, Matches, ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';

export class CreateTicketDto {
  @IsOptional() @IsUUID()
  orgId?: string;

  @IsOptional() @IsUUID()
  userId?: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  title: string;

  @IsString() @IsNotEmpty() @MaxLength(5000)
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsOptional() @IsEnum(TicketPriority)
  priority?: TicketPriority;

  /** https only — rendered as a link in the admin UI, so javascript:/data: must never get through */
  @IsOptional() @MaxLength(2048) @IsUrl({ protocols: ['https'], require_protocol: true })
  attachmentUrl?: string;
}

export class ReplyToTicketDto {
  @IsString() @IsNotEmpty() @MaxLength(10000)
  body: string;
}

/** Super admin reply — can be a staff-only internal note. Tenants use ReplyToTicketDto (no `internal`). */
export class SuperAdminReplyDto extends ReplyToTicketDto {
  @IsOptional() @IsBoolean()
  internal?: boolean;
}

export class AssignTicketDto {
  /** Super admin id, or null to unassign */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsUUID()
  assigneeId: string | null;
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}

export class ListTicketsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;

  @IsOptional() @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional() @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional() @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional() @IsUUID()
  orgId?: string;

  /** Super admin queue: only open tickets waiting on a support reply. Ignored for tenants. */
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean()
  needsReply?: boolean;

  /** Super admin queue: matches the title or the org name. Ignored for tenants. */
  @IsOptional() @IsString() @MaxLength(100)
  search?: string;

  /** Super admin queue: 'me', 'unassigned', or a super admin id. Ignored for tenants. */
  @IsOptional() @Matches(/^(me|unassigned|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
  assignee?: string;

  /** Super admin queue: createdAt, priority, status or updatedAt; anything else means newest first. Ignored for tenants. */
  @IsOptional() @IsString() @MaxLength(50)
  sort?: string;

  /** Super admin queue: asc | desc. Ignored for tenants. */
  @IsOptional() @IsString() @MaxLength(10)
  order?: string;
}
