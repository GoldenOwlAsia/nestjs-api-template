import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '@/api/auth/auth.service';

import type { UserRole } from '@/common/enums';
import type { User } from '@/api/users/entities';
import type { ITokenPayload } from '@/api/auth/auth.interface';

/** What `@ReqUser()` returns on JWT-protected routes. */
export interface IJwtStrategy {
  sid: string;
  role: UserRole;
  element: User;
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

  async validate(req: Request, { sid }: ITokenPayload): Promise<IJwtStrategy> {
    return this.authService.authenticate(sid, extractToken(req));
  }
}
