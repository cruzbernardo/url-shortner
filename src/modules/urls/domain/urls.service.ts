import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Url, User } from 'src/database/entities';
import { Logger } from 'winston';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { UrlAccessedEvent } from './events/url-accessed.event';

import { PaginationResponse, PaginationParams } from 'src/shared/interfaces';
import {
  RequestRegisterUrl,
  RequestUpdateUrl,
  ResponseGetUrl,
} from '../http/interfaces/urls.interface';
import {
  DEFAULT_PAGINATION_ORDER,
  DEFAULT_PAGINATION_PAGE,
  DEFAULT_PAGINATION_TAKE,
} from 'src/shared/constants';
import { DEFAULT_ORDER_COLUMN_URL } from '../constants';
import { Utils } from 'src/shared/utils';
import { EncryptionService } from 'src/shared/utils/encryption.service';
import { ConfigService } from '@nestjs/config';
import { IEnvironmentVariables } from 'src/config/enviorment-config.validation';

@Injectable()
export class UrlsService {
  private SHORT_URL_CHAR_SIZE: number;

  constructor(
    @InjectRepository(Url)
    private readonly urlRepository: Repository<Url>,

    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,

    @Inject(ConfigService)
    private readonly configService: ConfigService<IEnvironmentVariables>,

    @Inject('winston')
    private readonly logger: Logger,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    @Inject(AmqpConnection)
    private readonly amqpConnection: AmqpConnection,
  ) {
    this.SHORT_URL_CHAR_SIZE = this.configService.getOrThrow(
      'SHORT_URL_CHAR_SIZE',
      { infer: true },
    );
  }

  async register(
    data: RequestRegisterUrl,
    baseUrl: string,
    userId?: string,
  ): Promise<ResponseGetUrl> {
    this.logger.debug(`Registering new URL for origin: ${data.origin}`, {
      context: UrlsService.name,
    });

    const shortCode = await this.generateRandomShortUrl(data.origin);
    const shortUrl = `${baseUrl}/r/${shortCode}`;

    const url = this.urlRepository.create({
      origin: data.origin,
      shortCode,
      ...(userId && { user: { id: userId } as User }),
    });

    this.logger.info(
      `Generated short URL ${shortUrl} for user ${userId ?? 'anonymous'}`,
      {
        context: UrlsService.name,
      },
    );

    const saved = (await this.urlRepository.save(url)) as Url;
    saved.url = shortUrl;

    const cacheKey = `url:${shortCode}`;
    await this.cacheManager.set(cacheKey, saved.origin, 3600000);

    this.logger.debug(`Cached new URL for short code: ${shortCode}`, {
      context: UrlsService.name,
    });

    return saved;
  }

  async getById(id: string, userId: string): Promise<ResponseGetUrl> {
    this.logger.debug(`Fetching URL by id: ${id} for user ${userId}`, {
      context: UrlsService.name,
    });

    const found = await this.urlRepository
      .createQueryBuilder('url')
      .leftJoinAndSelect('url.user', 'user')
      .where('url.id = :id', { id })
      .andWhere('user.id = :userId', { userId })
      .getOne();

    if (!found) {
      this.logger.warn(`URL not found: id=${id} userId=${userId}`, {
        context: UrlsService.name,
      });
      throw new NotFoundException('URL not found');
    }

    this.logger.debug(`URL found: id=${id} for user ${userId}`, {
      context: UrlsService.name,
    });

    return found;
  }

  async getByShortCode(
    shortCode: string,
    ip?: string,
    userAgent?: string,
  ): Promise<string> {
    const cacheKey = `url:${shortCode}`;

    this.logger.debug(`Fetching URL for short code: ${shortCode}`, {
      context: UrlsService.name,
    });

    const cachedUrl = await this.cacheManager.get<string>(cacheKey);

    if (cachedUrl) {
      this.logger.debug(`Cache HIT for short code: ${shortCode}`, {
        context: UrlsService.name,
      });

      await this.publishUrlAccessedEvent(shortCode, ip, userAgent);

      return cachedUrl;
    }

    this.logger.debug(`Cache MISS for short code: ${shortCode}`, {
      context: UrlsService.name,
    });

    const url = await this.urlRepository.findOne({
      where: { shortCode: shortCode },
    });

    if (!url) {
      this.logger.warn(`Short URL not found: ${shortCode}`, {
        context: UrlsService.name,
      });
      throw new NotFoundException('Short URL not found');
    }

    await this.cacheManager.set(cacheKey, url.origin, 3600000);

    this.logger.info(`Cached URL for short code: ${shortCode}`, {
      context: UrlsService.name,
    });

    await this.publishUrlAccessedEvent(shortCode, ip, userAgent);

    return url.origin;
  }

  private async publishUrlAccessedEvent(
    shortCode: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const event = new UrlAccessedEvent(shortCode, new Date(), ip, userAgent);

    if (this.amqpConnection) {
      try {
        const publishPromise = this.amqpConnection.publish(
          this.configService.get('RABBITMQ_EXCHANGE_ANALYTICS', 'analytics'),
          'url.accessed',
          event,
        );

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('RabbitMQ publish timeout')), 2000);
        });

        await Promise.race([publishPromise, timeoutPromise]);

        this.logger.debug(`Event published via RabbitMQ: ${shortCode}`, {
          context: UrlsService.name,
        });
        return;
      } catch (error) {
        this.logger.warn(
          `RabbitMQ publish failed, trying fallback: ${error.message}`,
          { context: UrlsService.name },
        );
      }
    }

    try {
      const queueKey = 'rabbitmq:fallback:events';
      const redisClient = await (this.cacheManager as any).store.getClient();

      await redisClient.lpush(queueKey, JSON.stringify(event));

      this.logger.info(`Event queued in Redis fallback: ${shortCode}`, {
        context: UrlsService.name,
      });
      return;
    } catch (redisError) {
      this.logger.error(
        `Redis queue failed, using direct DB fallback: ${redisError.message}`,
        { context: UrlsService.name },
      );
    }

    try {
      await this.urlRepository.increment({ shortCode }, 'count', 1);

      this.logger.warn(`Counter incremented directly: ${shortCode}`, {
        context: UrlsService.name,
      });
    } catch (dbError) {
      this.logger.error(
        `All fallbacks failed for ${shortCode}: ${dbError.message}`,
        { context: UrlsService.name },
      );
    }
  }

  async list(
    data: PaginationParams,
    userId: string,
  ): Promise<PaginationResponse<ResponseGetUrl>> {
    this.logger.debug(
      `Listing URLs for user ${userId} with pagination: page=${data.page} itemsPerPage=${data.itemsPerPage}`,
      { context: UrlsService.name },
    );

    const { itemsPerPage } = data;
    const order = data.order || DEFAULT_PAGINATION_ORDER;
    const page = data.page || DEFAULT_PAGINATION_PAGE;
    const take = itemsPerPage || DEFAULT_PAGINATION_TAKE;
    const skip = (page - 1) * take;

    const queryBuilder = this.urlRepository
      .createQueryBuilder('urls')
      .leftJoin('urls.user', 'users')
      .where('users.id = :userId', { userId });

    Utils.applyDefaultPaginationQueryOptions<Url>({
      queryBuilder,
      orderProperty: DEFAULT_ORDER_COLUMN_URL,
      skip,
      take,
      orderBy: order,
    });

    const [urls, urlsCount] = await queryBuilder.getManyAndCount();

    this.logger.info(
      `Returning ${urls.length} URLs out of ${urlsCount} total for user ${userId}`,
      { context: UrlsService.name },
    );

    return {
      meta: Utils.buildPaginationMetadata({
        count: urlsCount,
        page,
        resultsAmount: urls.length,
        take,
      }),
      items: urls,
    };
  }

  async update(
    id: string,
    data: RequestUpdateUrl,
    baseUrl: string,
    userId: string,
  ): Promise<ResponseGetUrl> {
    this.logger.debug(`Updating URL id=${id} for user ${userId}`, {
      context: UrlsService.name,
    });

    const url = await this.getById(id, userId);

    let newShortUrl: string | undefined;
    if (data.origin && data.origin !== url.origin) {
      this.logger.info(
        `Origin changed from ${url.origin} to ${data.origin}, regenerating short URL`,
        { context: UrlsService.name },
      );

      const shortCode = await this.generateRandomShortUrl(data.origin);
      newShortUrl = `${baseUrl}/r/${shortCode}`;
      data.shortCode = shortCode;
    }

    const oldCacheKey = `url:${url.shortCode}`;
    await this.cacheManager.del(oldCacheKey);

    const updated = { ...url, ...data };
    const saved = await this.urlRepository.save(updated);

    const newCacheKey = `url:${saved.shortCode}`;
    await this.cacheManager.set(newCacheKey, saved.origin, 3600000);

    this.logger.info(`URL updated successfully: id=${id} user=${userId}`, {
      context: UrlsService.name,
    });

    if (newShortUrl) {
      saved.url = newShortUrl;
    } else if (!saved.url) {
      saved.url = `${baseUrl}/r/${saved.shortCode}`;
    }

    return saved;
  }

  async delete(id: string, userId: string): Promise<void> {
    this.logger.debug(`Deleting URL id=${id} for user ${userId}`, {
      context: UrlsService.name,
    });

    const url = await this.getById(id, userId);

    const cacheKey = `url:${url.shortCode}`;
    await this.cacheManager.del(cacheKey);

    const result = await this.urlRepository.softDelete(url.id);

    if (result.affected === 0) {
      this.logger.error(
        `Soft delete failed — no rows affected for URL id=${id} user=${userId}`,
        { context: UrlsService.name },
      );
      throw new Error('Soft delete failed — no rows affected');
    }

    this.logger.info(`URL soft deleted successfully: id=${id} user=${userId}`, {
      context: UrlsService.name,
    });
  }

  private async generateRandomShortUrl(
    longUrl: string,
  ): Promise<string | undefined> {
    this.logger.debug(`Generating random short URL from longUrl: ${longUrl}`, {
      context: UrlsService.name,
    });

    const hash = this.encryptionService.generateMd5Hash(longUrl);
    const numberOfCharsInHash = hash.length;
    const sliceLength = this.SHORT_URL_CHAR_SIZE ?? 6;

    for (let i = 0; i <= numberOfCharsInHash - sliceLength; i++) {
      const candidate = hash.substring(i, i + sliceLength);

      const exists = await this.urlRepository.findOne({
        where: { shortCode: candidate },
      });

      if (!exists) {
        this.logger.debug(`Short URL candidate generated: ${candidate}`, {
          context: UrlsService.name,
        });
        return candidate;
      }
    }

    this.logger.warn(
      `Could not generate unique short URL candidate for ${longUrl}`,
      { context: UrlsService.name },
    );
  }
}
