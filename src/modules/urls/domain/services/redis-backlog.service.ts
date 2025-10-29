import { Injectable, Inject, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Logger } from 'winston';
import { ConfigService } from '@nestjs/config';
import { UrlAccessedEvent } from '../events/url-accessed.event';

@Injectable()
export class RedisBacklogService {
  private isProcessing = false;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    @Optional()
    @Inject(AmqpConnection)
    private readonly amqpConnection: AmqpConnection,

    @Inject('winston')
    private readonly logger: Logger,

    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processBacklog(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Backlog processing already in progress, skipping', {
        context: RedisBacklogService.name,
      });
      return;
    }

    if (!this.amqpConnection) {
      this.logger.debug('RabbitMQ not available, skipping backlog processing', {
        context: RedisBacklogService.name,
      });
      return;
    }

    this.isProcessing = true;
    const queueKey = 'rabbitmq:fallback:events';
    let processedCount = 0;
    let failedCount = 0;

    try {
      const store = (this.cacheManager as any).store;

      if (!store || !store.getClient) {
        this.logger.warn('Redis store not available, skipping backlog processing', {
          context: RedisBacklogService.name,
        });
        return;
      }

      const redisClient = await store.getClient();
      const queueLength = await redisClient.llen(queueKey);

      if (queueLength === 0) {
        this.logger.debug('No events in backlog queue', {
          context: RedisBacklogService.name,
        });
        return;
      }

      this.logger.info(
        `Processing ${queueLength} events from Redis backlog queue`,
        { context: RedisBacklogService.name },
      );

      while (true) {
        const eventJson = await redisClient.rpop(queueKey);
        if (!eventJson) break;

        try {
          const event: UrlAccessedEvent = JSON.parse(eventJson);

          await this.amqpConnection.publish(
            this.configService.get(
              'RABBITMQ_EXCHANGE_ANALYTICS',
              'analytics',
            ),
            'url.accessed',
            event,
          );

          processedCount++;
          this.logger.debug(
            `Processed backlog event for: ${event.shortCode}`,
            { context: RedisBacklogService.name },
          );
        } catch (error) {
          failedCount++;
          this.logger.error(
            `Failed to process backlog event, re-queuing: ${error.message}`,
            { context: RedisBacklogService.name },
          );

          await redisClient.lpush(queueKey, eventJson);
          break;
        }
      }

      this.logger.info(
        `Backlog processing complete: ${processedCount} successful, ${failedCount} failed`,
        { context: RedisBacklogService.name },
      );
    } catch (error) {
      this.logger.error(`Backlog processing error: ${error.message}`, {
        context: RedisBacklogService.name,
        stack: error.stack,
      });
    } finally {
      this.isProcessing = false;
    }
  }
}
