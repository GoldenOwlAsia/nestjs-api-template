import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

import { enumh } from '@/utils/helpers';
import { UserRole } from '@/common/enums';
import { IsValidUserRole } from '@/decorators';

export class LogInDto {
  @IsNotEmpty()
  @IsValidUserRole()
  @ApiProperty({
    enum: UserRole,
    default: enumh.getFirstKey<typeof UserRole>(UserRole),
  })
  role: UserRole;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    format: 'email',
  })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @ApiProperty({ format: 'password', example: 'P@ssw0rd' })
  password: string;
}
