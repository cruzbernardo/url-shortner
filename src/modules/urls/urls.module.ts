import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from 'src/database/entities';
import { UrlsService } from './domain/urls.service';
import { EncryptionService } from 'src/shared/utils/encryption.service';
import { JwtService } from '@nestjs/jwt';
import { UrlAnalyticsConsumer } from './domain/consumers/url-analytics.consumer';
import { RedisBacklogService } from './domain/services/redis-backlog.service';
import { RabbitMQWrapperModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [TypeOrmModule.forFeature([Url]), RabbitMQWrapperModule],
  controllers: [UrlsController],
  providers: [
    UrlsService,
    EncryptionService,
    JwtService,
    UrlAnalyticsConsumer,
    RedisBacklogService,
  ],
  exports: [UrlsService],
})
export class UrlsModule {}
