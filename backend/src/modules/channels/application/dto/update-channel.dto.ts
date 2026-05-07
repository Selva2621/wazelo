import {
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  rateLimitPerMin?: number;

  /**
   * Config update triggers re-verification of credentials.
   * Cannot change channel type after creation.
   */
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
