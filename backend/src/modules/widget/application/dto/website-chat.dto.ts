import { Equals, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/** The form before the chat: first name, mobile and email are required; the consent box is optional */
export class WidgetStartDto {
  @IsString()
  @MaxLength(64)
  visitorId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your first name' })
  @MaxLength(100)
  firstName!: string;

  /** Checked and normalised by the use case (+country code, 8–15 digits) */
  @IsString()
  @IsNotEmpty({ message: 'Enter your mobile number' })
  @MaxLength(20)
  phone!: string;

  @IsString()
  @IsNotEmpty({ message: 'Enter your email' })
  @MaxLength(320)
  email!: string;

  /** "I agree to be contacted on WhatsApp and email" — unticked by default */
  @IsBoolean()
  consent!: boolean;

  // require_tld off: sites on localhost or intranet names are real pages too
  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  pageUrl?: string;
}

/** Later in the chat (nobody could take it): the visitor taps "Yes, contact me" */
export class WidgetConsentDto {
  @IsString()
  @MaxLength(64)
  visitorId!: string;

  @IsBoolean()
  @Equals(true, { message: 'Please agree to be contacted' })
  consent!: boolean;
}

/** Visitor-side actions identify the chat by the visitor's browser id */
export class WidgetVisitorDto {
  @IsString()
  @MaxLength(64)
  visitorId!: string;
}

/** The member who handled the chat decides: lead or not */
export class WebsiteLeadDecisionDto {
  @IsIn(['LEAD', 'NOT_LEAD'])
  decision!: 'LEAD' | 'NOT_LEAD';

  /** For LEAD: the WhatsApp number to save (defaults to the one the visitor gave) */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
