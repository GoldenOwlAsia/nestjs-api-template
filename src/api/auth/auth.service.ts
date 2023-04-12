import { compareSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AdminService } from '@/api/admin/admin.service';
import { CustomerService } from '@/api/customer/customer.service';

import { TokenService } from '@/api/token/token.service';

import type { Admin } from '@/api/admin/entities';
import type { Customer } from '@/api/customer/entities';

import {
  UserAlreadyException,
  WrongCredentialsException,
} from './auth.exceptions';

import type { RegisterDto, LoggedInDto, RegisteredDto } from './dto';

import type {
  ITokenPayload,
  IValidateUserParams,
  IValidateJwtUserParams,
} from './auth.interface';
import { UserRole } from '@/common/enums';
import { ILocalStrategy } from './strategies';

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

  public async register(userInfo: RegisterDto): Promise<RegisteredDto> {
    const services = {
      [UserRole[UserRole.CUSTOMER]]: this.customerService,
    };

    const userService = services[userInfo.role];

    const { email, phoneNumber } = userInfo;

    const user = await userService.findOneByEmailOrPhoneNumber({
      email,
      phoneNumber,
    });

    if (user) {
      throw new UserAlreadyException();
    }

    const registeredUser = await userService.create(userInfo);

    return registeredUser;
  }

  public async login(user: ILocalStrategy): Promise<LoggedInDto> {
    const { element, role } = user;

    const payload: ITokenPayload = {
      role,
      email: element?.email,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn:
        (this.configService.get('token.authentication.lifetime') / 1000) *
        this.configService.get('token.authentication.renewedTimes'), // access token will be only renewed n times with refresh token
    });

    await this.tokenService.create({
      accessToken,
      refreshToken,
      userRole: role,
      userId: element?.id,
    });

    return {
      accessToken,
      refreshToken,
      userInfo: element.toResponse(),
    };
  }

  public async validateUser({
    email,
    role,
    password,
  }: IValidateUserParams): Promise<TUser> {
    const services = {
      [UserRole[UserRole.ADMIN]]: this.adminService,
      [UserRole[UserRole.CUSTOMER]]: this.customerService,
    };

    const userService = services[role];

    const user = await userService.findOneByEmail(email);

    if (!(user && compareSync(password, user?.password))) {
      throw new WrongCredentialsException();
    }

    return user;
  }

  public async validateJwtUser({
    email,
    role,
  }: IValidateJwtUserParams): Promise<TUser> {
    const services = {
      [UserRole[UserRole.ADMIN]]: this.adminService,
      [UserRole[UserRole.CUSTOMER]]: this.customerService,
    };

    const userService = services[role];

    const user = await userService.findOneByEmail(email);

    if (!user) {
      throw new WrongCredentialsException();
    }

    return user;
  }
}
