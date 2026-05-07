import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AutomationTriggerType } from '@prisma/client';
import { TriggerConfigDto, ConditionDto, ActionDto } from './create-automation-rule.dto';

export class UpdateAutomationRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(AutomationTriggerType)
  triggerType?: AutomationTriggerType;

  @IsOptional()
  @ValidateNested()
  @Type(() => TriggerConfigDto)
  triggerConfig?: TriggerConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions?: ActionDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxExecutionsPerContact?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2592000)
  cooldownSeconds?: number;
}
