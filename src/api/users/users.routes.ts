import { HttpStatus, RequestMethod, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UserRole } from '@/common/enums';
import { IRouteParams } from '@/decorators';

import { UserResponseDto, UserDetailResponseDto } from './dto';

const adminOnly = [UserRole.ADMIN];

export default {
  index: 'users',
  create: <IRouteParams>{
    path: '/',
    method: RequestMethod.POST,
    code: HttpStatus.CREATED,
    roles: adminOnly,
    swaggerInfo: {
      responses: [{ status: HttpStatus.CREATED, type: UserResponseDto }],
    },
  },
  getAll: <IRouteParams>{
    path: '/',
    method: RequestMethod.GET,
    roles: adminOnly,
    swaggerInfo: {
      responses: [
        { status: HttpStatus.OK, type: UserResponseDto, isArray: true },
      ],
    },
  },
  getMe: <IRouteParams>{
    path: '/me',
    method: RequestMethod.GET,
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: UserDetailResponseDto }],
    },
  },
  updateMe: <IRouteParams>{
    path: '/me',
    method: RequestMethod.PUT,
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: UserResponseDto }],
    },
  },
  updateAvatar: <IRouteParams>{
    path: '/me/avatar',
    method: RequestMethod.PUT,
    swaggerInfo: {
      body: {
        description: 'Avatar file',
        required: true,
        schema: {
          type: 'object',
          properties: { file: { type: 'string', format: 'binary' } },
        },
      },
      responses: [{ status: HttpStatus.OK }],
    },
    extraDecorators: [UseInterceptors(FileInterceptor('file'))],
  },
  getById: <IRouteParams>{
    path: '/:id',
    method: RequestMethod.GET,
    roles: adminOnly,
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: UserDetailResponseDto }],
    },
  },
  updateById: <IRouteParams>{
    path: '/:id',
    method: RequestMethod.PUT,
    roles: adminOnly,
    swaggerInfo: {
      responses: [{ status: HttpStatus.OK, type: UserResponseDto }],
    },
  },
  deleteById: <IRouteParams>{
    path: '/:id',
    method: RequestMethod.DELETE,
    roles: adminOnly,
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
