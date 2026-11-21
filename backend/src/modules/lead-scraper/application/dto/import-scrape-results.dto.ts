import { IsUUID, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordWhatsAppPermissionDto } from '@/modules/contacts/application/dto/whatsapp-permission.dto';

export class ImportScrapeResultsDto {
  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  resultIds?: string[];

  /** Set when the leads agreed to WhatsApp messages: recorded for every imported lead */
  @IsOptional()
  @ValidateNested()
  @Type(() => RecordWhatsAppPermissionDto)
  whatsappPermission?: RecordWhatsAppPermissionDto;
}
