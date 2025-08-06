import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';

import * as winston from 'winston';

// Example feature module

import { TypeOrmConfigService } from './config/typeorm-config.service';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health';
import { UrlsModule } from './urls/urls.module';
import { AuthenticationModule } from './authentication';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtGuard } from './shared/guards/jwt.guard';
import { JwtStrategy } from './authentication/constants/jwt.strategy';
import { ClsModule } from 'nestjs-cls';
import { TraceInterceptor } from './shared/interceptors/trace.interceptor';
import { instance } from './config/winston-logger';
import { HttpExceptionFilter } from './shared/exceptions';
import { LoggingModule } from './shared/modules/logging.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ClsModule.forRoot({
      global: true,
      middleware: { mount: true }, // Importante!
    }),

    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),

    UsersModule,
    HealthModule,
    UrlsModule,
    AuthenticationModule,
    LoggingModule,
  ],
  controllers: [],
  providers: [
    HttpExceptionFilter,
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
