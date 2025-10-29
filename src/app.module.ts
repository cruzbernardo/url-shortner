import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmConfigService } from './config/typeorm-config.service';
import { redisConfig } from './config/redis-config';
import { RabbitMQWrapperModule } from './modules/rabbitmq/rabbitmq.module';
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
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './shared/guards/custom-throttler.guard';

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
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: redisConfig,
    }),

    RabbitMQWrapperModule,

    ScheduleModule.forRoot(),

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
      useClass: CustomThrottlerGuard,
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
