import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsUUID('4')
  managerId: string;
}
