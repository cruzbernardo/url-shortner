import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { HealthCheckService, MemoryHealthIndicator } from '@nestjs/terminus';
import { isArray } from 'class-validator';

describe('HealthService', () => {
  let service: HealthService;
  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn(),
    checkRSS: jest.fn(),
  };
  const mockHealthCheckService = { check: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    mockMemoryHealthIndicator.checkHeap.mockReset();
    mockMemoryHealthIndicator.checkRSS.mockReset();
    mockHealthCheckService.check.mockReset();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be return all status ok', async () => {
    const status = {
      status: 'ok',
      info: {
        memory_heap: {
          status: 'up',
        },
        memory_rss: {
          status: 'up',
        },
      },
      error: {},
      details: {
        memory_heap: {
          status: 'up',
        },
        memory_rss: {
          status: 'up',
        },
      },
    };

    mockHealthCheckService.check.mockResolvedValueOnce(status);

    const result = await service.getStatusApi();

    expect(result).toStrictEqual({
      status: 'ok',
      info: {
        memory_heap: {
          status: 'up',
        },
        memory_rss: {
          status: 'up',
        },
      },
      error: {},
      details: {
        memory_heap: {
          status: 'up',
        },
        memory_rss: {
          status: 'up',
        },
      },
    });
  });

  it('should be return all status ok when  checkHeap  and checkRSS is healthy', async () => {
    mockMemoryHealthIndicator.checkHeap.mockResolvedValueOnce({
      memory_heap: {
        status: 'up',
      },
    });

    mockMemoryHealthIndicator.checkRSS.mockResolvedValueOnce({
      memory_rss: {
        status: 'up',
      },
    });

    mockHealthCheckService.check.mockImplementationOnce(
      jest.fn(async (cb) => {
        if (isArray(cb)) {
          const result = await Promise.all(cb.map((f) => f()));
          return {
            status: 'ok',
            info: {
              ...result[0],
              ...result[1],
            },
            error: {},
            details: {
              ...result[0],
              ...result[1],
            },
          };
        }
        return this;
      }),
    );

    const result = await service.getStatusApi();

    expect(result).toStrictEqual({
      status: 'ok',
      info: {
        memory_heap: {
          status: 'up',
        },
        memory_rss: {
          status: 'up',
        },
      },
      error: {},
      details: {
        memory_heap: {
          status: 'up',
        },
        memory_rss: {
          status: 'up',
        },
      },
    });
  });
});
