import {
  IsEnum,
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';

import { IsOnlyDate } from '@/decorators';
import { ActionedBaseDto } from '@/common/dto';
import { Gender, UserRole } from '@/common/enums';

export class CreateUserDto {
  @IsEmail()
  @ApiProperty({ format: 'email' })
  email: string;

  @IsString()
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
  @IsEnum(Gender)
  @ApiProperty({ enum: Gender, required: false })
  gender?: Gender;

  @IsOptional()
  @IsOnlyDate()
  @ApiProperty({ format: 'date', required: false })
  bod?: Date;

  @IsPhoneNumber('VN')
  @ApiProperty({ example: '0123456789' })
  phoneNumber: string;

  @IsOptional()
  @IsEnum(UserRole)
  @ApiProperty({ enum: UserRole, default: UserRole.CUSTOMER, required: false })
  role?: UserRole;
}

/** Self-service sign-up: always a CUSTOMER. */
export class RegisterDto extends OmitType(CreateUserDto, ['role'] as const) {}

/** Email and role are not changeable through updates. */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'role'] as const),
) {}

export class UserResponseDto extends ActionedBaseDto {
  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty({ example: 'Lorem' })
  firstName: string;

  @ApiProperty({ example: 'Lorem' })
  lastName: string;

  @ApiProperty({ enum: Gender, required: false, nullable: true })
  gender?: Gender;

  @ApiProperty({ format: 'date', required: false, nullable: true })
  bod?: Date;

  @ApiProperty({ example: '0123456789' })
  phoneNumber: string;
}

export class UserDetailResponseDto extends UserResponseDto {
  @ApiProperty({ type: [ActionedBaseDto] })
  sessions: ActionedBaseDto[];
}
