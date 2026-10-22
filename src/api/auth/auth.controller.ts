import { Body } from '@nestjs/common';

import { InjectRoute, InjectController, ReqUser } from '@/decorators';

import authRoutes from './auth.routes';

import { AuthService } from './auth.service';

import { RefreshTokenDto, RegisterDto } from './dto';

import type { LoggedInDto, RegisteredDto, TokensDto } from './dto';
import type { IJwtStrategy, ILocalStrategy } from './strategies';

@InjectController({ name: authRoutes.index, isCore: true })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @InjectRoute(authRoutes.register)
  public async register(@Body() userInfo: RegisterDto): Promise<RegisteredDto> {
    return this.authService.register(userInfo);
  }

  @InjectRoute(authRoutes.login)
  public async login(@ReqUser() user: ILocalStrategy): Promise<LoggedInDto> {
    return this.authService.login(user);
  }

  @InjectRoute(authRoutes.refresh)
  public async refresh(
    @Body() { refreshToken }: RefreshTokenDto,
  ): Promise<TokensDto> {
    return this.authService.refresh(refreshToken);
  }

  @InjectRoute(authRoutes.logout)
  public async logout(@ReqUser() user: IJwtStrategy): Promise<void> {
    await this.authService.logout(user);
  }
}
