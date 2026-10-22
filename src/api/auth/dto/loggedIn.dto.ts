import { ApiProperty } from '@nestjs/swagger';

import { UserResponseDto } from '@/api/users/dto';

import { TokensDto } from './tokens.dto';

export class LoggedInDto extends TokensDto {
  @ApiProperty()
  userInfo: UserResponseDto;
}
