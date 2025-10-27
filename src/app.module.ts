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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
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
  controllers: [AppController],
  providers: [
    AppService,
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
