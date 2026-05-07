import { IsString, MinLength, MaxLength } from 'class-validator';

export class AddNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;
}
