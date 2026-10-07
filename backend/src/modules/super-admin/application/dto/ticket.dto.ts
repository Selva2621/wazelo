import {
  IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, MaxLength, IsUUID, IsUrl,
  IsBoolean, Matches, ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsOptional() @IsString()
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

  /** Super admin queue: 'me', 'unassigned', or a super admin id. Ignored for tenants. */
  @IsOptional() @Matches(/^(me|unassigned|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)
  assignee?: string;
}
