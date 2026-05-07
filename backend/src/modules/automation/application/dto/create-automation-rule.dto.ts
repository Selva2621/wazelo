import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AutomationTriggerType,
  AutomationActionType,
} from '@prisma/client';
import { AutomationConditionOperator } from '../../domain/value-objects/condition-operator.enum';

export class TriggerConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  messageKeyword?: string;

  @IsOptional()
  @IsEnum(['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'CLOSED'])
  fromStatus?: string;

  @IsOptional()
  @IsEnum(['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'CLOSED'])
  toStatus?: string;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(2592000) // max 30 days
  delaySeconds?: number;
}

export class ConditionDto {
  @IsString()
  @IsNotEmpty()
  field: string;

  @IsEnum(AutomationConditionOperator)
  operator: AutomationConditionOperator;

  @IsNotEmpty()
  value: unknown;
}

export class ActionDto {
  @IsEnum(AutomationActionType)
  actionType: AutomationActionType;

  @IsObject()
  actionConfig: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  orderIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2592000)
  delaySeconds?: number;
}

export class CreateAutomationRuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(AutomationTriggerType)
  triggerType: AutomationTriggerType;

  @ValidateNested()
  @Type(() => TriggerConfigDto)
  triggerConfig: TriggerConfigDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions: ActionDto[];

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
  cooldownSeconds?: number;

  @IsOptional()
  @IsUUID('4')
  productId?: string;
}
