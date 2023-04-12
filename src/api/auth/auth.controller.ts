import { Body } from '@nestjs/common';

import { InjectRoute, InjectController, ReqUser } from '@/decorators';

import authRoutes from './auth.routes';

import { AuthService } from './auth.service';

import { RegisterDto } from './dto';

import type { LoggedInDto, RegisteredDto } from './dto';
import { ILocalStrategy } from './strategies';

@InjectController({ name: authRoutes.index, isCore: true })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @InjectRoute(authRoutes.register)
  public async register(@Body() userInfo: RegisterDto): Promise<RegisteredDto> {
    const registeredUser = await this.authService.register(userInfo);

    return registeredUser;
  }

  @InjectRoute(authRoutes.login)
  public async login(@ReqUser() user: ILocalStrategy): Promise<LoggedInDto> {
    const loggedInUser = await this.authService.login(user);

    return loggedInUser;
  }
}
