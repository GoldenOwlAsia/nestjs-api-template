import { HttpStatus, RequestMethod } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import type { IRouteParams } from '@/decorators';

export default {
  health: <IRouteParams>{
    path: '/health',
    method: RequestMethod.GET,
    jwtSecure: false,
    // Probes from a load balancer or Docker must never be rate-limited.
    extraDecorators: [SkipThrottle()],
    swaggerInfo: {
      responses: [
        {
          status: HttpStatus.OK,
          schema: { example: { data: { status: 'ok', db: 'up' } } },
        },
        {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          description: 'Database is unreachable',
        },
      ],
    },
  },
};
