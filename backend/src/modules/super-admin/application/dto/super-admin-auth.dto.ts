import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
