import { IsBoolean, IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Connect (or update) the workspace's business email */
export class SaveEmailAccountDto {
  @IsIn(['GMAIL', 'OUTLOOK', 'ZOHO', 'CUSTOM'])
  provider!: 'GMAIL' | 'OUTLOOK' | 'ZOHO' | 'CUSTOM';

  /** Needed for CUSTOM; filled from the provider otherwise */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  /** Usually the email address itself */
  @IsOptional()
  @IsString()
  @MaxLength(320)
  username?: string;

  /** App password. Leave out when updating to keep the saved one. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  password?: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter the name people see' })
  @MaxLength(255)
  fromName!: string;

  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(320)
  fromAddress!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Enter a valid reply-to address' })
  @MaxLength(320)
  replyTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  dailyLimit?: number;
}

export class TestEmailDto {
  /** Where to send the test (defaults to the account's own address) */
  @IsOptional()
  @IsEmail()
  to?: string;
}

/** Write with AI: what the email should say */
export class GenerateEmailTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Say what the email should be about' })
  @MaxLength(500)
  prompt!: string;
}

export class SaveEmailTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Name the template' })
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Write a subject' })
  @MaxLength(255)
  subject!: string;

  @IsString()
  @IsNotEmpty({ message: 'Write the message' })
  @MaxLength(20000)
  body!: string;
}
