import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { IsOnlyDate, IsValidGender } from '@/decorators';
import { enumh } from '@/utils/helpers';
import { Gender, UserRole } from '@/common/enums';

enum UserRegisterRole {
  CUSTOMER = UserRole.CUSTOMER,
}

const UserRegisterRoleRegex =
  enumh.convertToRegex<typeof UserRegisterRole>(UserRegisterRole);

export class RegisterDto {
  @IsNotEmpty()
  @Matches(UserRegisterRoleRegex, 'i', {
    message: `$property must match ${UserRegisterRoleRegex}.`,
  })
  @ApiProperty({
    enum: UserRegisterRole,
    default: enumh.getFirstKey(UserRegisterRole),
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

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Lorem' })
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'Lorem' })
  lastName: string;

  @IsOptional()
  @IsOnlyDate()
  @ApiProperty({
    format: 'date',
    required: false,
  })
  bod?: Date;

  @IsOptional()
  @IsValidGender()
  @ApiProperty({
    enum: Gender,
    required: false,
  })
  gender?: Gender;

  @IsPhoneNumber('VN')
  @IsNotEmpty()
  @ApiProperty({ example: '0123456789' })
  phoneNumber: string;
}
