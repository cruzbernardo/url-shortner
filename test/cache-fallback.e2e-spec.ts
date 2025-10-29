import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from 'src/app.module';
import { Repository } from 'typeorm';
import { Url } from 'src/database/entities';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

describe('Cache and Fallback System (e2e)', () => {
  let app: INestApplication;
  let urlRepository: Repository<Url>;
  let cacheManager: any;
  let amqpConnection: AmqpConnection;
  let authToken: string;
  let testUrlId: string;
  let testShortCode: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    urlRepository = moduleFixture.get<Repository<Url>>(
      getRepositoryToken(Url),
    );
    cacheManager = moduleFixture.get(CACHE_MANAGER);
    amqpConnection = moduleFixture.get(AmqpConnection);

    // Create test user and get auth token
    const signUpResponse = await request(app.getHttpServer())
      .post('/authentication/sign-up')
      .send({
        name: 'Fallback Test User',
        email: `fallback-test-${Date.now()}@example.com`,
        password: 'Test@1234',
      });

    authToken = signUpResponse.body.accessToken;

    // Create a test URL
    const urlResponse = await request(app.getHttpServer())
      .post('/urls')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        origin: 'https://www.fallback-test.com',
      });

    testUrlId = urlResponse.body.id;
    testShortCode = urlResponse.body.shortCode;
  });

  afterAll(async () => {
    // Cleanup
    if (testUrlId) {
      await urlRepository.delete(testUrlId);
    }
    await app.close();
  });

  describe('Level 1: Normal Operation (RabbitMQ + Cache)', () => {
    it('should cache URL on first access', async () => {
      const cacheKey = `url:${testShortCode}`;

      // Clear cache first
      await cacheManager.del(cacheKey);

      // Access URL
      const response = await request(app.getHttpServer())
        .get(`/r/${testShortCode}`)
        .expect(302);

      expect(response.headers.location).toBe('https://www.fallback-test.com');

      // Verify it's now in cache
      const cachedValue = await cacheManager.get(cacheKey);
      expect(cachedValue).toBe('https://www.fallback-test.com');
    });

    it('should return from cache on subsequent accesses', async () => {
      const cacheKey = `url:${testShortCode}`;

      // First access to populate cache
      await request(app.getHttpServer()).get(`/r/${testShortCode}`).expect(302);

      // Verify cache hit
      const cachedValue = await cacheManager.get(cacheKey);
      expect(cachedValue).toBe('https://www.fallback-test.com');

      // Second access should use cache
      const response = await request(app.getHttpServer())
        .get(`/r/${testShortCode}`)
        .expect(302);

      expect(response.headers.location).toBe('https://www.fallback-test.com');
    });
  });

  describe('Level 2: RabbitMQ Fallback (Redis Queue)', () => {
    it('should queue events in Redis when RabbitMQ publish times out', async () => {
      const queueKey = 'rabbitmq:fallback:events';
      const store = (cacheManager as any).store;

      // Clear Redis queue
      if (store && store.getClient) {
        const redisClient = await store.getClient();
        await redisClient.del(queueKey);
      }

      // Mock RabbitMQ publish to simulate timeout
      const originalPublish = amqpConnection.publish;
      let publishCalled = false;

      amqpConnection.publish = jest.fn().mockImplementation(async () => {
        publishCalled = true;
        // Simulate timeout by delaying beyond the 2 second timeout
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return originalPublish.apply(amqpConnection, arguments);
      });

      // Access URL (this should trigger fallback to Redis queue)
      await request(app.getHttpServer()).get(`/r/${testShortCode}`).expect(302);

      // Verify publish was attempted
      expect(publishCalled).toBe(true);

      // Check if event was queued in Redis
      if (store && store.getClient) {
        const redisClient = await store.getClient();
        const queueLength = await redisClient.llen(queueKey);

        expect(queueLength).toBeGreaterThan(0);

        // Verify event structure
        const eventJson = await redisClient.rpop(queueKey);
        const event = JSON.parse(eventJson);

        expect(event).toHaveProperty('shortCode', testShortCode);
        expect(event).toHaveProperty('timestamp');
      }

      // Restore original publish
      amqpConnection.publish = originalPublish;
    });
  });

  describe('Level 3: Direct DB Fallback', () => {
    it('should increment counter directly when both RabbitMQ and Redis fail', async () => {
      const url = await urlRepository.findOne({
        where: { shortCode: testShortCode },
      });

      const initialCount = url.count;

      // Mock both RabbitMQ and Redis to fail
      const originalPublish = amqpConnection.publish;
      const originalCacheManager = cacheManager;

      amqpConnection.publish = jest.fn().mockImplementation(async () => {
        throw new Error('RabbitMQ unavailable');
      });

      // Mock Redis store to fail
      const mockStore = {
        getClient: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
      };

      Object.defineProperty(cacheManager, 'store', {
        value: mockStore,
        configurable: true,
      });

      // Access URL (should fall back to direct DB increment)
      await request(app.getHttpServer()).get(`/r/${testShortCode}`).expect(302);

      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify counter was incremented directly in DB
      const updatedUrl = await urlRepository.findOne({
        where: { shortCode: testShortCode },
      });

      expect(updatedUrl.count).toBe(initialCount + 1);

      // Restore mocks
      amqpConnection.publish = originalPublish;
      Object.defineProperty(cacheManager, 'store', {
        value: originalCacheManager.store,
        configurable: true,
      });
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when URL is updated', async () => {
      const cacheKey = `url:${testShortCode}`;

      // Access URL to populate cache
      await request(app.getHttpServer()).get(`/r/${testShortCode}`).expect(302);

      // Verify it's cached
      let cachedValue = await cacheManager.get(cacheKey);
      expect(cachedValue).toBe('https://www.fallback-test.com');

      // Update URL
      await request(app.getHttpServer())
        .put(`/urls/${testUrlId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: 'https://www.updated-fallback-test.com',
        })
        .expect(200);

      // Old cache key should be invalidated
      cachedValue = await cacheManager.get(cacheKey);
      expect(cachedValue).toBeUndefined();
    });

    it('should invalidate cache when URL is deleted', async () => {
      // Create a new URL for deletion test
      const urlResponse = await request(app.getHttpServer())
        .post('/urls')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: 'https://www.delete-test.com',
        });

      const deleteUrlId = urlResponse.body.id;
      const deleteShortCode = urlResponse.body.shortCode;
      const cacheKey = `url:${deleteShortCode}`;

      // Access to populate cache
      await request(app.getHttpServer()).get(`/r/${deleteShortCode}`).expect(302);

      // Verify cached
      let cachedValue = await cacheManager.get(cacheKey);
      expect(cachedValue).toBe('https://www.delete-test.com');

      // Delete URL
      await request(app.getHttpServer())
        .delete(`/urls/${deleteUrlId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Cache should be invalidated
      cachedValue = await cacheManager.get(cacheKey);
      expect(cachedValue).toBeUndefined();
    });
  });
});
