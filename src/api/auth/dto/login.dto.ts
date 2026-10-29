import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LogInDto {
  @IsEmail()
  @ApiProperty({ format: 'email' })
  email: string;

  @IsString()
  @MinLength(8)
  @ApiProperty({ format: 'password', example: 'P@ssw0rd' })
  password: string;
}
