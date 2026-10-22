import {
  SwaggerModule,
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerDocumentOptions,
} from '@nestjs/swagger';

import type { INestApplication } from '@nestjs/common';

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

  SwaggerModule.setup('api/documentation', app, document, customOptions);
};
