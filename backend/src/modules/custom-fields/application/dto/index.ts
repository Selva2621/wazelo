import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const FIELD_TYPES = ['text', 'number', 'date', 'select', 'multiselect', 'boolean', 'url', 'email', 'phone'];
const ENTITIES = ['contact', 'deal', 'conversation'];

export class CreateFieldDefinitionDto {
  @IsIn(ENTITIES) entity: string;
  @IsNotEmpty() @IsString() @MaxLength(100) fieldName: string;
  @IsNotEmpty() @IsString() @MaxLength(255) fieldLabel: string;
  @IsIn(FIELD_TYPES) fieldType: string;
  @IsOptional() options?: unknown;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) defaultValue?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class UpdateFieldDefinitionDto {
  @IsOptional() @IsString() @MaxLength(255) fieldLabel?: string;
  @IsOptional() options?: unknown;
  @IsOptional() @IsBoolean() isRequired?: boolean;
  @IsOptional() @IsString() @MaxLength(1000) defaultValue?: string | null;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class FieldValueDto {
  @IsUUID() fieldId: string;
  @IsString() value: string;
}

export class SetFieldValuesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValueDto)
  values: FieldValueDto[];
}
