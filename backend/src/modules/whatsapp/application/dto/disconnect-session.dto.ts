import { IsOptional, IsString, IsUUID } from 'class-validator';

export class DisconnectSessionDto {
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
