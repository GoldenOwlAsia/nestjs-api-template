import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '@/api/auth/auth.service';

import type { UserRole } from '@/common/enums';
import type { TUser } from '@/api/auth/auth.service';

import type { ITokenPayload } from '@/api/auth/auth.interface';

export interface IJwtStrategy {
  element: TUser;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate({ email, role }: ITokenPayload): Promise<IJwtStrategy> {
    const user = await this.authService.validateJwtUser({ email, role });

    return {
      role,
      element: user,
    };
  }
}
