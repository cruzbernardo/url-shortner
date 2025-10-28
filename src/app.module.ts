import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './config/typeorm-config.service';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health';
import { UrlsModule } from './modules/urls/urls.module';
import { AuthenticationModule } from './modules/authentication';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtGuard } from './shared/guards/jwt.guard';
import { JwtStrategy } from './modules/authentication/constants/jwt.strategy';
import { ClsModule } from 'nestjs-cls';
import { TraceInterceptor } from './shared/interceptors/trace.interceptor';
import { HttpExceptionFilter } from './shared/exceptions';
import { LoggingModule } from './shared/modules/logging.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),

    // Rate Limiting Global
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 3, // 3 requisições por segundo
      },
      {
        name: 'medium',
        ttl: 10000, // 10 segundos
        limit: 20, // 20 requisições por 10 segundos
      },
      {
        name: 'long',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requisições por minuto
      },
    ]),

    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),

    UsersModule,
    HealthModule,
    UrlsModule,
    AuthenticationModule,
    LoggingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    HttpExceptionFilter,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: TraceInterceptor,
    },
  ],
  exports: [],
})
export class AppModule {}
