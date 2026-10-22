import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '@/api/auth/auth.service';

import type { UserRole } from '@/common/enums';
import type { TUser } from '@/api/auth/auth.service';

import type { ITokenPayload } from '@/api/auth/auth.interface';

export interface IJwtStrategy {
  sid: string;
  element: TUser;
  role: UserRole;
}

const extractToken = ExtractJwt.fromAuthHeaderAsBearerToken();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      ignoreExpiration: false,
      jwtFromRequest: extractToken,
      secretOrKey: configService.get('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    { sid, email, role }: ITokenPayload,
  ): Promise<IJwtStrategy> {
    await this.authService.validateSession(sid, extractToken(req));

    const user = await this.authService.validateJwtUser({ email, role });

    return { sid, role, element: user };
  }
}
