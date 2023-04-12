import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiTags,
  ApiConsumes,
  ApiResponse,
  ApiBearerAuth,
  ApiResponseOptions,
} from '@nestjs/swagger';

import type { ApiBodyOptions } from '@nestjs/swagger';

export interface ISwaggerParams {
  secure: boolean;
  body?: ApiBodyOptions;
  responses?: ApiResponseOptions[];
}

export function SwaggerController(name: string) {
  return applyDecorators(ApiTags(name));
}

export function SwaggerApi({
  secure = false,
  body = {},
  responses = [],
}: ISwaggerParams) {
  const consumeTypes = [
    'application/json',
    'application/x-www-form-urlencoded',
  ];

  const decorators = [];

  decorators.push(consumeTypes.map((consumeType) => ApiConsumes(consumeType)));

  if (secure) {
    decorators.push([
      ApiBearerAuth(),
      ApiResponse({ status: 401, description: 'You are unauthorized.' }),
      ApiResponse({
        status: 403,
        description: 'You are unauthorized to use this resource.',
      }),
      ApiResponse({
        status: 404,
        description: 'The resource can not be found.',
      }),
    ]);
  }

  if (Object?.values(body || {})?.length > 0) {
    decorators.push(ApiBody(body));
  }

  if (responses.length > 0) {
    responses.forEach((responseInfo: ApiResponseOptions): void => {
      decorators.push(ApiResponse(responseInfo));
    });
  }

  return applyDecorators(...decorators.flat());
}
