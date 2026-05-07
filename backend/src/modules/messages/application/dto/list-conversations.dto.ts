import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListConversationsQueryDto {
  @IsOptional()
  @IsEnum(['OPEN', 'CLOSED', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;

  /** Admin/Manager drill-down: view conversations for a specific user's session */
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  /** Manager team view: show all team members' conversations */
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  teamView?: boolean;

  /** Filter by contact phone number (used to open a specific conversation) */
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
