import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';

export class AssignContactDto {
  @IsUUID()
  ownerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
