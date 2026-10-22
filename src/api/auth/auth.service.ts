import { randomUUID } from 'node:crypto';
import { compareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { hash } from '@/utils/helpers';
import { UserRole } from '@/common/enums';
import { AdminService } from '@/api/admin/admin.service';
import { TokenService } from '@/api/token/token.service';
import { CustomerService } from '@/api/customer/customer.service';

import type { Admin } from '@/api/admin/entities';
import type { Customer } from '@/api/customer/entities';

import { WrongCredentialsException } from './auth.exceptions';

import type { TokensDto, RegisterDto, LoggedInDto, RegisteredDto } from './dto';
import type {
  ITokenPayload,
  IValidateUserParams,
  IValidateJwtUserParams,
} from './auth.interface';
import type { IJwtStrategy, ILocalStrategy } from './strategies';

export type TUser = Admin | Customer;

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private adminService: AdminService,
    private tokenService: TokenService,
    private configService: ConfigService,
    private customerService: CustomerService,
  ) {}

  /** Throws instead of returning `undefined` so an unknown role can never reach a lookup. */
  private getUserService(role: UserRole | string) {
    const services = {
      [UserRole[UserRole.ADMIN]]: this.adminService,
      [UserRole[UserRole.CUSTOMER]]: this.customerService,
    };

    const userService = services[role];

    if (!userService) {
      throw new WrongCredentialsException();
    }

    return userService;
  }

  private signTokens({ sid, email, role }: ITokenPayload): TokensDto {
    const payload: ITokenPayload = { sid, email, role };

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

  public async register(userInfo: RegisterDto): Promise<RegisteredDto> {
    // RegisterDto only allows CUSTOMER; create() rejects duplicates.
    return this.customerService.create(userInfo);
  }

  public async login({ element, role }: ILocalStrategy): Promise<LoggedInDto> {
    const sid = randomUUID();
    const tokens = this.signTokens({ sid, email: element.email, role });

    await this.tokenService.create({
      id: sid,
      userId: element.id,
      userRole: role,
      ...tokens,
    });

    return { ...tokens, userInfo: element.toResponse() };
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

    const tokens = this.signTokens(payload);

    await this.tokenService.rotate(session.id, tokens);

    return tokens;
  }

  public async logout({ sid }: IJwtStrategy): Promise<void> {
    await this.tokenService.deleteById(sid);
  }

  /** Throws unless the session exists and `accessToken` is its current access token. */
  public async validateSession(
    sid: string,
    accessToken: string,
  ): Promise<void> {
    const session = sid ? await this.tokenService.findById(sid) : null;

    if (session?.accessToken !== hash.sha256(accessToken)) {
      throw new UnauthorizedException();
    }
  }

  public async validateUser({
    email,
    role,
    password,
  }: IValidateUserParams): Promise<TUser> {
    const user = await this.getUserService(role).findOneByEmail(email);

    if (!(user && compareSync(password, user.password))) {
      throw new WrongCredentialsException();
    }

    return user;
  }

  public async validateJwtUser({
    email,
    role,
  }: IValidateJwtUserParams): Promise<TUser> {
    const user = await this.getUserService(role).findOneByEmail(email);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
