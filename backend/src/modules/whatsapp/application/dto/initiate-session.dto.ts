import { IsOptional, IsString, MaxLength } from 'class-validator';

export class InitiateSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
