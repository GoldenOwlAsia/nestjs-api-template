import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

import { enumh } from '@/utils/helpers';
import { UserRole } from '@/common/enums';

export class CreateTokenDto {
  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  @ApiProperty({ enum: UserRole, default: enumh.getFirstKey(UserRole) })
  userRole: UserRole;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjAsImlhdCI6MTY2MjYzMTkzOCwiZXhwIjoxNjY1MjIzOTM4fQ.d806NRcVKaBY1cAXjiMuJvLMg0DxTYdDkd269ETKnNU',
  })
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjAsImlhdCI6MTY2MjYzMTkzOCwiZXhwIjoxNjY1MjIzOTM4fQ.d806NRcVKaBY1cAXjiMuJvLMg0DxTYdDkd269ETKnNU',
  })
  refreshToken: string;
}
