import { IsUUID } from 'class-validator';

export class MergeContactsDto {
  @IsUUID()
  primaryContactId: string;

  @IsUUID()
  secondaryContactId: string;
}
