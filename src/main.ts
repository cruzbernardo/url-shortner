import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WinstonModule } from 'nest-winston';
import { instance } from './config/winston-logger';
import { enableSwaggerConfig } from './config/swagger-config';
import { CustomValidationPipe } from './shared/pipes';
import { HttpExceptionFilter } from './shared/exceptions';
import { SanitizePipe } from './shared/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance }),
  });

  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  enableSwaggerConfig(app);

  const httpExceptionFilter = app.get(HttpExceptionFilter);
  app.useGlobalFilters(httpExceptionFilter);

  // Security: Sanitize inputs first, then validate
  app.useGlobalPipes(new SanitizePipe());
  app.useGlobalPipes(CustomValidationPipe);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
