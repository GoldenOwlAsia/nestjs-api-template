import { UserRole } from '@/common/enums';
import { IRouteParams } from '@/decorators';
import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  GotCustomerDto,
  CreatedCustomerDto,
  UpdatedCustomerDto,
  GotCustomerDetailDto,
} from './dto';

export default {
  index: 'customers',
  create: <IRouteParams>{
    path: '/',
    method: RequestMethod.POST,
    roles: [UserRole.ADMIN],
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: CreatedCustomerDto }],
    },
  },
  getAll: <IRouteParams>{
    path: '/',
    method: RequestMethod.GET,
    roles: [UserRole.ADMIN],
    swaggerInfo: {
      responses: [
        { status: HttpStatus.OK, type: GotCustomerDto, isArray: true },
      ],
    },
  },
  getMe: <IRouteParams>{
    path: '/me',
    method: RequestMethod.GET,
    roles: [UserRole.CUSTOMER],
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: GotCustomerDetailDto }],
    },
  },
  updateMe: <IRouteParams>{
    path: '/me',
    method: RequestMethod.PUT,
    roles: [UserRole.CUSTOMER],
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: UpdatedCustomerDto }],
    },
  },
  getById: <IRouteParams>{
    path: '/:id',
    method: RequestMethod.GET,
    roles: [UserRole.ADMIN],
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: GotCustomerDetailDto }],
    },
  },
  updateById: <IRouteParams>{
    path: '/:id',
    method: RequestMethod.PUT,
    roles: [UserRole.ADMIN],
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: UpdatedCustomerDto }],
    },
  },
  deleteById: <IRouteParams>{
    path: '/:id',
    method: RequestMethod.DELETE,
    roles: [UserRole.ADMIN],
    swaggerInfo: {
      responses: [
        {
          status: HttpStatus.OK,
          schema: {
            type: 'string',
            example: '353d6e1a-492b-40b1-be6e-2a08d7f782dc',
          },
        },
      ],
    },
  },
};
