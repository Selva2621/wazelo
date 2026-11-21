import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  WHATSAPP_PERMISSION_METHODS,
  WhatsAppPermissionMethod,
} from '../../domain/services/whatsapp-permission.service';
import { BulkContactIdsDto } from './bulk-contacts.dto';

export class RecordWhatsAppPermissionDto {
  /** How the contact agreed to hear from the business on WhatsApp */
  @IsIn(WHATSAPP_PERMISSION_METHODS as unknown as string[])
  how: WhatsAppPermissionMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Same agreement recorded for many contacts at once (lead finder run page) */
export class BulkRecordWhatsAppPermissionDto extends BulkContactIdsDto {
  @IsIn(WHATSAPP_PERMISSION_METHODS as unknown as string[])
  how: WhatsAppPermissionMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
