import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsObject,
  IsIn,
  IsBoolean,
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

  /** DEAL_STAGE_CHANGED: the stage a deal is created in or moved to (empty → any stage) */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  stageId?: string;

  /** LEAD_AD_RECEIVED: only leads from this platform (empty → any) */
  @IsOptional()
  @IsIn(['facebook', 'instagram', 'whatsapp'])
  platform?: string;

  /** LEAD_AD_RECEIVED: only leads from this Meta lead form ID (empty → any form) */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  formId?: string;

  /** LEAD_AD_RECEIVED: skip repeat leads from numbers that are already contacts */
  @IsOptional()
  @IsBoolean()
  newContactsOnly?: boolean;

  /** SHOPIFY_ORDER_CREATED / SHOPIFY_ORDER_FULFILLED */
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  /** SHOPIFY_CART_ABANDONED */
  @IsOptional()
  @IsNumber()
  @Min(0)
  minCartValue?: number;
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
