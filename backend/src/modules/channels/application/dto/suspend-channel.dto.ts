import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SuspendChannelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
