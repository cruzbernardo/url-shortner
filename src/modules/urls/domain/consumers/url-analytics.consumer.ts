import { Injectable, Inject } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Url } from 'src/database/entities';
import { UrlAccessedEvent } from '../events/url-accessed.event';
import { Logger } from 'winston';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/shared/validators/decorators/public-endpoint.decorator';

@Injectable()
export class UrlAnalyticsConsumer {
  constructor(
    @InjectRepository(Url)
    private readonly urlRepository: Repository<Url>,

    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  @SkipThrottle()
  @Public()
  @RabbitSubscribe({
    exchange: 'analytics',
    routingKey: 'url.accessed',
    queue: 'url-analytics',
  })
  async handleUrlAccessed(event: UrlAccessedEvent): Promise<void> {
    try {
      this.logger.info(
        `Processing url.accessed event for short code: ${event.shortCode}`,
        {
          context: UrlAnalyticsConsumer.name,
          event,
        },
      );

      await this.urlRepository.increment(
        { shortCode: event.shortCode },
        'count',
        1,
      );

      this.logger.info(
        `Counter incremented for short code: ${event.shortCode}`,
        {
          context: UrlAnalyticsConsumer.name,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to process url.accessed event for short code: ${event.shortCode}`,
        {
          context: UrlAnalyticsConsumer.name,
          error: error.message,
          stack: error.stack,
        },
      );
    }
  }
}