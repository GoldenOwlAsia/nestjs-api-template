import { ApiProperty } from '@nestjs/swagger';

import { enumh } from '@/utils/helpers';
import { ActionedBaseDto } from '@/common/dto';
import { Gender, UserRole } from '@/common/enums';

export class UpdatedAdminDto extends ActionedBaseDto {
  @ApiProperty({
    enum: UserRole,
    default: enumh.getFirstKey<typeof UserRole>(UserRole),
  })
  role: UserRole;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty({ example: 'Lorem' })
  firstName: string;

  @ApiProperty({ example: 'Lorem' })
  lastName: string;

  @ApiProperty({
    enum: Gender,
    required: false,
  })
  gender?: Gender;

  @ApiProperty({
    format: 'date',
    required: false,
  })
  bod?: Date;

  @ApiProperty({ example: '0123456789' })
  phoneNumber: string;
}
