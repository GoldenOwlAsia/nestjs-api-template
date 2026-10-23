import { HttpStatus, RequestMethod } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { UserRole } from '@/common/enums';

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
  debugSentry: <IRouteParams>{
    path: '/debug/sentry',
    method: RequestMethod.GET,
    roles: [UserRole.ADMIN],
    swaggerInfo: {
      responses: [
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          description: 'Always: throws a test error to verify Sentry reporting',
        },
      ],
    },
  },
};
