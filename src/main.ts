import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { instance } from './config/winston-logger';
import { enableSwaggerConfig } from './config/swagger-config';
import { CustomValidationPipe } from './shared/pipes';
import { HttpExceptionFilter } from './shared/exceptions';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance }),
  });

  app.enableCors({ origin: '*' });

  enableSwaggerConfig(app);

  const httpExceptionFilter = app.get(HttpExceptionFilter);
  app.useGlobalFilters(httpExceptionFilter);

  app.useGlobalPipes(CustomValidationPipe);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
