import { HttpStatus, RequestMethod } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Time } from '@/utils/constants';

import type { IRouteParams } from '@/decorators';

import { LogInDto, LoggedInDto, RegisteredDto, TokensDto } from './dto';

/** Brute-force protection for credential endpoints: 5 requests / minute per IP. */
const strictThrottle = Throttle({
  default: { limit: 5, ttl: Time.ONE_MINUTE },
});

export default {
  index: 'auth',
  register: <IRouteParams>{
    jwtSecure: false,
    path: '/register',
    code: HttpStatus.CREATED,
    method: RequestMethod.POST,
    extraDecorators: [strictThrottle],
    swaggerInfo: {
      responses: [{ status: HttpStatus.CREATED, type: RegisteredDto }],
    },
  },
  login: <IRouteParams>{
    path: '/login',
    jwtSecure: false,
    localSecure: true,
    code: HttpStatus.OK,
    method: RequestMethod.POST,
    extraDecorators: [strictThrottle],
    swaggerInfo: {
      body: {
        type: LogInDto,
      },
      responses: [{ status: HttpStatus.OK, type: LoggedInDto }],
    },
  },
  refresh: <IRouteParams>{
    path: '/refresh',
    jwtSecure: false,
    code: HttpStatus.OK,
    method: RequestMethod.POST,
    extraDecorators: [strictThrottle],
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: TokensDto }],
    },
  },
  logout: <IRouteParams>{
    path: '/logout',
    code: HttpStatus.NO_CONTENT,
    method: RequestMethod.POST,
    swaggerInfo: {
      responses: [{ status: HttpStatus.NO_CONTENT }],
    },
  },
};
