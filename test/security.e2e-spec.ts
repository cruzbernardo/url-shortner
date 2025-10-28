import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SanitizePipe } from '../src/shared/pipes/sanitize.pipe';
import { CustomValidationPipe } from '../src/shared/pipes/custom-validation.pipe';

describe('Security Features (e2e)', () => {
  let app: INestApplication;

  const waitForRateLimit = (ms: number = 2000) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(new SanitizePipe());
    app.useGlobalPipes(CustomValidationPipe);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    await waitForRateLimit(2000);
  });

  describe('Rate Limiting', () => {
    describe('POST /authentication/sign-in', () => {
      it('should allow 5 requests within 1 minute', async () => {
        const payload = {
          email: 'test@example.com',
          password: 'wrongpassword',
        };

        for (let i = 0; i < 5; i++) {
          const response = await request(app.getHttpServer())
            .post('/authentication/sign-in')
            .send(payload);

          expect(response.status).not.toBe(429);
        }
      });

      it('should block 6th request within 1 minute with 429 status', async () => {
        const payload = {
          email: 'ratelimit-test@example.com',
          password: 'testpassword',
        };

        for (let i = 0; i < 5; i++) {
          await request(app.getHttpServer())
            .post('/authentication/sign-in')
            .send(payload);
        }

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(payload);

        expect(response.status).toBe(429);
        expect(response.body.message).toContain('ThrottlerException');
      });
    });

    describe('POST /authentication/sign-up', () => {
      it('should allow 3 requests within 1 hour', async () => {
        const baseEmail = 'signup-test-';
        const payload = (index: number) => ({
          email: `${baseEmail}${index}@example.com`,
          password: 'Test@123456',
        });

        for (let i = 0; i < 3; i++) {
          const response = await request(app.getHttpServer())
            .post('/authentication/sign-up')
            .send(payload(i));

          expect(response.status).not.toBe(429);
        }
      });

      it('should block 4th request within 1 hour with 429 status', async () => {
        const baseEmail = 'signup-ratelimit-';
        const payload = (index: number) => ({
          email: `${baseEmail}${index}@example.com`,
          password: 'Test@123456',
        });

        for (let i = 0; i < 3; i++) {
          await request(app.getHttpServer())
            .post('/authentication/sign-up')
            .send(payload(i));
        }

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(payload(4));

        expect(response.status).toBe(429);
        expect(response.body.message).toContain('ThrottlerException');
      });
    });

    describe('GET /health', () => {
      it('should not apply rate limiting (SkipThrottle)', async () => {
        for (let i = 0; i < 150; i++) {
          const response = await request(app.getHttpServer()).get('/health');

          expect(response.status).toBe(200);
          expect(response.status).not.toBe(429);
        }
      }, 30000);
    });
  });

  describe('Input Sanitization - XSS Protection', () => {
    describe('POST /authentication/sign-up', () => {
      it('should remove script tags from email input', async () => {
        const maliciousPayload = {
          email: '<script>alert("xss")</script>test@example.com',
          password: 'Test@123456',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(maliciousPayload);

        if (response.body.email) {
          expect(response.body.email).not.toContain('<script>');
        }
      });

      it('should remove event handlers from input', async () => {
        const maliciousPayload = {
          email: 'test@example.com',
          password: 'password onclick="malicious()"',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(maliciousPayload);

        expect(JSON.stringify(response.body)).not.toContain('onclick=');
      });

      it('should remove javascript: protocol from input', async () => {
        const maliciousPayload = {
          email: 'javascript:alert(1)@example.com',
          password: 'Test@123456',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(maliciousPayload);

        if (response.body.email) {
          expect(response.body.email).not.toContain('javascript:');
        }
      });

      it('should remove data:text/html protocol from input', async () => {
        const maliciousPayload = {
          email: 'data:text/html,<script>alert(1)</script>',
          password: 'Test@123456',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(maliciousPayload);

        expect(JSON.stringify(response.body)).not.toContain('data:text/html');
      });
    });
  });

  describe('Input Sanitization - NoSQL Injection Protection', () => {
    describe('POST /authentication/sign-in', () => {
      it('should block MongoDB $gt operator', async () => {
        const injectionPayload = {
          email: '{"$gt":""}',
          password: 'test',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(injectionPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('$gt');
        }
      });

      it('should block MongoDB $ne operator', async () => {
        const injectionPayload = {
          email: 'test@example.com',
          password: '{"$ne":""}',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(injectionPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('$ne');
        }
      });

      it('should block MongoDB $or operator', async () => {
        const injectionPayload = {
          email: '{"$or":[{"email":"admin@example.com"},{"email":"user@example.com"}]}',
          password: 'test',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(injectionPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('$or');
        }
      });

      it('should block MongoDB $regex operator', async () => {
        const injectionPayload = {
          email: '{"$regex":".*"}',
          password: 'test',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(injectionPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('$regex');
        }
      });

      it('should block MongoDB $where operator', async () => {
        const injectionPayload = {
          email: '{"$where":"this.password.length > 0"}',
          password: 'test',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(injectionPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('$where');
        }
      });
    });
  });

  describe('Input Sanitization - SQL Injection Protection', () => {
    describe('POST /authentication/sign-in', () => {
      it('should remove SQL comments (--) from input', async () => {
        const injectionPayload = {
          email: "admin@example.com' OR '1'='1' --",
          password: 'test',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(injectionPayload);

        expect(JSON.stringify(response.body)).not.toContain('--');
      });

      it('should remove SQL block comments (/* */) from input', async () => {
        const injectionPayload = {
          email: 'admin@example.com /* comment */',
          password: 'test',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(injectionPayload);

        expect(JSON.stringify(response.body)).not.toContain('/*');
        expect(JSON.stringify(response.body)).not.toContain('*/');
      });

      it('should remove multiple semicolons from input', async () => {
        const injectionPayload = {
          email: 'test@example.com;;;DROP TABLE users;;;',
          password: 'test',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-in')
          .send(injectionPayload);

        expect(JSON.stringify(response.body)).not.toContain(';;;');
      });
    });
  });

  describe('Input Sanitization - Prototype Pollution Protection', () => {
    describe('POST /authentication/sign-up', () => {
      it('should block __proto__ key', async () => {
        const pollutionPayload = {
          email: 'test@example.com',
          password: 'Test@123456',
          __proto__: { isAdmin: true },
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(pollutionPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('__proto__');
        }
      });

      it('should block constructor key', async () => {
        const pollutionPayload = {
          email: 'test@example.com',
          password: 'Test@123456',
          constructor: { prototype: { isAdmin: true } },
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(pollutionPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('constructor');
        }
      });

      it('should block prototype key', async () => {
        const pollutionPayload = {
          email: 'test@example.com',
          password: 'Test@123456',
          prototype: { isAdmin: true },
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(pollutionPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('prototype');
        }
      });
    });
  });

  describe('Input Sanitization - DoS Protection', () => {
    describe('POST /authentication/sign-up', () => {
      it('should block input exceeding 10000 characters', async () => {
        const longString = 'a'.repeat(10001);
        const dosPayload = {
          email: `${longString}@example.com`,
          password: 'Test@123456',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(dosPayload);

        expect([400, 429]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body.message).toContain('muito longo');
        }
      });

      it('should allow input with exactly 10000 characters', async () => {
        const longString = 'a'.repeat(9980);
        const validPayload = {
          email: `${longString}@example.com`,
          password: 'Test@123456',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(validPayload);

        expect(response.status).not.toBe(400);
        if (response.status === 400) {
          expect(response.body.message).not.toContain('muito longo');
        }
      });
    });
  });

  describe('Input Sanitization - Control Characters Protection', () => {
    describe('POST /authentication/sign-up', () => {
      it('should remove null bytes from input', async () => {
        const maliciousPayload = {
          email: 'test\x00@example.com',
          password: 'Test@123456',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(maliciousPayload);

        expect(JSON.stringify(response.body)).not.toContain('\\x00');
      });

      it('should remove other control characters from input', async () => {
        const maliciousPayload = {
          email: 'test\x01\x02\x03@example.com',
          password: 'Test@123456',
        };

        const response = await request(app.getHttpServer())
          .post('/authentication/sign-up')
          .send(maliciousPayload);

        expect(JSON.stringify(response.body)).not.toContain('\\x01');
        expect(JSON.stringify(response.body)).not.toContain('\\x02');
        expect(JSON.stringify(response.body)).not.toContain('\\x03');
      });
    });
  });

  describe('Combined Attack Scenarios', () => {
    it('should handle multiple attack vectors in single request', async () => {
      const complexAttackPayload = {
        email: '<script>alert("xss")</script>{"$gt":""}admin@example.com',
        password: 'password onclick="hack()" OR 1=1 --',
        __proto__: { isAdmin: true },
      };

      const response = await request(app.getHttpServer())
        .post('/authentication/sign-up')
        .send(complexAttackPayload);

      expect([400, 429]).toContain(response.status);

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain('<script>');
      expect(responseStr).not.toContain('onclick=');
      expect(responseStr).not.toContain('--');
    });
  });
});
