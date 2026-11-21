import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
  IsArray,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Send Message DTO ──

export class DevInteractiveButton {
  @IsString()
  @MaxLength(256)
  id: string;

  @IsString()
  @MaxLength(20)
  title: string;
}

export class DevInteractiveListRow {
  @IsString()
  @MaxLength(256)
  id: string;

  @IsString()
  @MaxLength(24)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(72)
  description?: string;
}

export class DevInteractiveListSection {
  @IsOptional()
  @IsString()
  @MaxLength(24)
  title?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevInteractiveListRow)
  rows: DevInteractiveListRow[];
}

export class DevInteractivePayload {
  @IsEnum(['button', 'list'])
  type: 'button' | 'list';

  @IsOptional()
  @IsString()
  @MaxLength(60)
  header?: string;

  @IsString()
  @MaxLength(1024)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  footer?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevInteractiveButton)
  buttons?: DevInteractiveButton[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DevInteractiveListSection)
  sections?: DevInteractiveListSection[];

  @IsOptional()
  @IsString()
  @MaxLength(20)
  buttonText?: string;
}

export class DevSendMessageDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'to must be a valid E.164 phone number (e.g., +919876543210)',
  })
  to: string;

  @IsEnum(['text', 'image', 'video', 'document', 'audio', 'interactive'])
  type: string = 'text';

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  body?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DevInteractivePayload)
  interactive?: DevInteractivePayload;
}

// ── Send Bulk Message DTO ──

export class DevSendBulkMessageDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  to: string[];

  @IsEnum(['text', 'image', 'video', 'document', 'audio'])
  type: string = 'text';

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  body?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}

// ── Create Template DTO ──

export class DevCreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  body: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

// ── Send Template Message DTO ──

export class DevSendTemplateDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'to must be a valid E.164 phone number',
  })
  to: string;

  @IsString()
  @IsNotEmpty()
  templateName: string;

  @IsOptional()
  @IsString()
  languageCode?: string;

  @IsOptional()
  variables?: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}

// ── Create Contact DTO ──

export class DevCreateContactDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'phone must be a valid E.164 phone number',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ── Update Contact DTO ──

export class DevUpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

// ── Shared cursor paging ──

export class DevPageQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsUUID()
  cursor?: string;
}

// ── List Contacts Query DTO ──

export class DevListContactsQueryDto extends DevPageQueryDto {
  /** Matches name, phone or email (partial, case-insensitive). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Exact phone number, e.g. +919876543210. */
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'phone must be a valid E.164 phone number' })
  phone?: string;

  @IsOptional()
  @IsEnum(['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'CLOSED'])
  leadStatus?: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'CONVERTED' | 'CLOSED';
}

// ── Contact notes / tags / lead status ──

export class DevAddNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}

export class DevAddTagDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'Tag name must only contain letters, numbers, spaces, hyphens, and underscores',
  })
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color must be a hex color like #FF5733' })
  color?: string;
}

export class DevChangeLeadStatusDto {
  @IsEnum(['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'CLOSED'])
  status: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'CONVERTED' | 'CLOSED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ── Conversations ──

export class DevListConversationsQueryDto extends DevPageQueryDto {
  @IsOptional()
  @IsEnum(['OPEN', 'CLOSED', 'ARCHIVED'])
  status?: 'OPEN' | 'CLOSED' | 'ARCHIVED';

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'contactPhone must be a valid E.164 phone number' })
  contactPhone?: string;

  @IsOptional()
  @IsUUID()
  contactId?: string;
}

// ── Deals ──

export class DevListDealsQueryDto extends DevPageQueryDto {
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsOptional()
  @IsUUID()
  pipelineId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsEnum(['OPEN', 'WON', 'LOST'])
  status?: 'OPEN' | 'WON' | 'LOST';
}

export class DevMoveDealDto {
  @IsUUID()
  stageId: string;
}

// ── List Messages Query DTO ──

export class DevListMessagesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsEnum(['INBOUND', 'OUTBOUND'])
  direction?: string;

  @IsOptional()
  @IsEnum(['QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED'])
  status?: string;
}
