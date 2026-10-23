import { randomUUID } from 'node:crypto';
import { compareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { hash } from '@/utils/helpers';
import { UserRole } from '@/common/enums';
import { MailService } from '@/mail/mail.service';
import { TokenService } from '@/api/token/token.service';
import { UsersService } from '@/api/users/users.service';

import type { User } from '@/api/users/entities';
import type { UserResponseDto } from '@/api/users/dto';

import { WrongCredentialsException } from './auth.exceptions';

import type { TokensDto, RegisterDto, LoggedInDto } from './dto';
import type { ITokenPayload } from './auth.interface';
import type { IJwtStrategy } from './strategies';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private tokenService: TokenService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  private signTokens(sid: string): TokensDto {
    const payload: ITokenPayload = { sid };

    // `jwtid` makes every token unique, so a rotated token never equals the previous one
    // (same payload + same second would otherwise sign to the identical string).
    return {
      accessToken: this.jwtService.sign(payload, { jwtid: randomUUID() }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('token.refresh.lifetime') / 1000,
        jwtid: randomUUID(),
      }),
    };
  }

  public async register(userInfo: RegisterDto): Promise<UserResponseDto> {
    const user = await this.usersService.create({
      ...userInfo,
      role: UserRole.CUSTOMER,
    });

    // Queued, not sent inline: sign-up doesn't wait on the mail provider.
    await this.mailService.sendWelcome({
      email: user.email,
      firstName: user.firstName,
    });

    return user;
  }

  public async login(user: User): Promise<LoggedInDto> {
    const sid = randomUUID();
    const tokens = this.signTokens(sid);

    await this.tokenService.create({ id: sid, userId: user.id, ...tokens });

    return { ...tokens, userInfo: user.toResponse() };
  }

  public async refresh(refreshToken: string): Promise<TokensDto> {
    let payload: ITokenPayload;

    try {
      payload = this.jwtService.verify<ITokenPayload>(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException();
    }

    const session = payload.sid
      ? await this.tokenService.findById(payload.sid)
      : null;

    if (!session) {
      throw new UnauthorizedException();
    }

    // A valid but already-rotated token means it leaked: kill the whole session.
    if (session.refreshToken !== hash.sha256(refreshToken)) {
      await this.tokenService.deleteById(session.id);
      throw new UnauthorizedException();
    }

    const tokens = this.signTokens(session.id);

    await this.tokenService.rotate(session.id, tokens);

    return tokens;
  }

  public async logout({ sid }: IJwtStrategy): Promise<void> {
    await this.tokenService.deleteById(sid);
  }

  /**
   * Resolves a bearer token to its session and user. Throws unless the session
   * exists and `accessToken` is its current access token. The role comes from
   * the user row, so a role change applies to existing sessions immediately.
   */
  public async authenticate(
    sid: string,
    accessToken: string,
  ): Promise<IJwtStrategy> {
    const session = sid ? await this.tokenService.findById(sid) : null;

    if (session?.accessToken !== hash.sha256(accessToken)) {
      throw new UnauthorizedException();
    }

    const user = await this.usersService.findOneById(session.userId);

    if (!user) {
      throw new UnauthorizedException();
    }

    return { sid, role: user.role, element: user };
  }

  public async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findOneByEmail(email);

    if (!(user && compareSync(password, user.password))) {
      throw new WrongCredentialsException();
    }

    return user;
  }
}
