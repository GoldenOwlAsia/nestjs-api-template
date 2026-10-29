import { IsJWT } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const JWT_EXAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQGdtYWlsLmNvbSIsInJvbGUiOjAsImlhdCI6MTY2MjYzMTkzOCwiZXhwIjoxNjY1MjIzOTM4fQ.d806NRcVKaBY1cAXjiMuJvLMg0DxTYdDkd269ETKnNU';

export class TokensDto {
  @ApiProperty({ example: JWT_EXAMPLE })
  accessToken: string;

  @ApiProperty({ example: JWT_EXAMPLE })
  refreshToken: string;
}

export class RefreshTokenDto {
  @IsJWT()
  @ApiProperty({ example: JWT_EXAMPLE })
  refreshToken: string;
}
