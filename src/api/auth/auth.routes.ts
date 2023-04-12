import { HttpStatus, RequestMethod } from '@nestjs/common';

import type { IRouteParams } from '@/decorators';

import { LogInDto, LoggedInDto, RegisteredDto } from './dto';

export default {
  index: 'auth',
  register: <IRouteParams>{
    jwtSecure: false,
    path: '/register',
    code: HttpStatus.CREATED,
    method: RequestMethod.POST,
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
    swaggerInfo: {
      body: {
        type: LogInDto,
      },
      responses: [{ status: HttpStatus.OK, type: LoggedInDto }],
    },
  },
};
