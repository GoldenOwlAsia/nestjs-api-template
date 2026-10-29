import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerDocumentOptions,
} from '@nestjs/swagger';

import { apiReference } from '@scalar/nestjs-api-reference';

import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { configuration } from '@/config';

import type { TConfig } from '@/config';

export const genAPIDocument = (app: INestApplication): void => {
  const config: TConfig = configuration();

  const documentConfig = new DocumentBuilder()
    .setTitle(config.swagger.title)
    .setVersion(config.swagger.version)
    .setDescription(config.swagger.description)
    .addBearerAuth()
    .build();

  const documentOptions: SwaggerDocumentOptions = {
    deepScanRoutes: true,
  };

  const document = SwaggerModule.createDocument(
    app,
    documentConfig,
    documentOptions,
  );

  const customOptions: SwaggerCustomOptions = {
    customSiteTitle: config.swagger.siteTitle,
  };

  // Two UIs over the same OpenAPI document (JSON at /api/documentation-json).
  SwaggerModule.setup('api/documentation', app, document, customOptions);

  app.use(
    '/api/reference',
    // Scalar loads its UI from a CDN, which helmet's CSP blocks. Docs are
    // served outside production only, so drop the CSP for this route alone.
    (_req: Request, res: Response, next: NextFunction) => {
      res.removeHeader('Content-Security-Policy');
      next();
    },
    apiReference({ content: document, pageTitle: config.swagger.siteTitle }),
  );
};
