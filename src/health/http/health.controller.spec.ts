import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from '../domain/health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthService = {
    getStatusApi: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

    mockHealthService.getStatusApi.mockResolvedValueOnce(status);

    const result = await controller.check();

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
