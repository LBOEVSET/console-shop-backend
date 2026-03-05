import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  identifier!: string; // email or username

  @IsString()
  password!: string;
}