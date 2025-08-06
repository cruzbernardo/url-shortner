import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const enableSwaggerConfig = (app: INestApplication) => {
  const options = new DocumentBuilder()
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .setTitle('Url Shortner Api')
    .setDescription('Url Shortner')
    .setVersion('1.0.0')
    .build();

  const document = SwaggerModule.createDocument(app, options, {});
  SwaggerModule.setup('api-docs', app, document);
};
