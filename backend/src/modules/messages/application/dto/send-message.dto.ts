import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** A single reply button (max 3 per message). */
export class InteractiveButton {
  @IsString()
  @MaxLength(256)
  id: string;

  @IsString()
  @MaxLength(20)
  title: string;
}

/** A row inside a list section. */
export class InteractiveListRow {
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

/** A section in a list message. */
export class InteractiveListSection {
  @IsOptional()
  @IsString()
  @MaxLength(24)
  title?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractiveListRow)
  rows: InteractiveListRow[];
}

/** Payload for interactive messages (buttons or lists). */
export class InteractivePayloadDto {
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

  /** Required for type=button (max 3 buttons). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractiveButton)
  buttons?: InteractiveButton[];

  /** Required for type=list. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InteractiveListSection)
  sections?: InteractiveListSection[];

  /** Button text shown on the list menu (default: "Choose"). */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  buttonText?: string;
}

export class SendMessageDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, {
    message: 'contactPhone must be a valid E.164 phone number',
  })
  contactPhone: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactName?: string;

  @IsEnum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO', 'INTERACTIVE'])
  type: string = 'TEXT';

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
  @MaxLength(100)
  mediaMimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  priority?: number;

  /** Admin/Manager: send through another user's WhatsApp session */
  @IsOptional()
  @IsUUID()
  viaSessionUserId?: string;

  /** Send within an existing conversation (uses the conversation's session) */
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  /** Interactive message payload (buttons or list). Required when type=INTERACTIVE. */
  @IsOptional()
  @ValidateNested()
  @Type(() => InteractivePayloadDto)
  interactive?: InteractivePayloadDto;
}
