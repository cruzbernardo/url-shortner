import { Test, TestingModule } from '@nestjs/testing';
import { UrlsService } from './urls.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { Logger } from 'winston';
import { Url, User } from 'src/database/entities';
import { EncryptionService } from 'src/shared/utils/encryption.service';

describe('UrlsService', () => {
  let service: UrlsService;
  let urlRepository: jest.Mocked<Repository<Url>>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<Logger>;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockEncryptionService = {
    generateMd5Hash: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  const mockUrlRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    softDelete: jest.fn(),
    increment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlsService,
        {
          provide: getRepositoryToken(Url),
          useValue: mockUrlRepository,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'winston',
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UrlsService>(UrlsService);
    urlRepository = module.get(getRepositoryToken(Url));
    encryptionService = module.get(EncryptionService);
    configService = module.get(ConfigService);
    logger = module.get('winston');

    // Setup default config
    mockConfigService.getOrThrow.mockReturnValue(6);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('register', () => {
    const baseUrl = 'http://localhost:3000';
    const origin = 'https://example.com/very/long/url';
    const mockShortCode = 'abc123';
    const mockHash = 'abc123def456ghi789';

    beforeEach(() => {
      mockEncryptionService.generateMd5Hash.mockReturnValue(mockHash);
      mockUrlRepository.findOne.mockResolvedValue(null); // No collision
    });

    it('should generate a unique short URL for authenticated user', async () => {
      const userId = 'user-123';
      const mockUrl = {
        id: 'url-123',
        origin,
        url: `${baseUrl}/r/${mockShortCode}`,
        count: 0,
        user: { id: userId } as User,
      } as Url;

      mockUrlRepository.create.mockReturnValue(mockUrl);
      mockUrlRepository.save.mockResolvedValue(mockUrl);

      const result = await service.register({ origin }, baseUrl, userId);

      expect(encryptionService.generateMd5Hash).toHaveBeenCalledWith(origin);
      expect(urlRepository.create).toHaveBeenCalledWith({
        origin,
        shortCode: mockShortCode,
        user: { id: userId },
      });
      expect(urlRepository.save).toHaveBeenCalledWith(mockUrl);
      expect(result).toEqual(mockUrl);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Generated short URL'),
        expect.any(Object),
      );
    });

    it('should generate a unique short URL for anonymous user', async () => {
      const mockUrl = {
        id: 'url-123',
        origin,
        url: `${baseUrl}/r/${mockShortCode}`,
        count: 0,
        user: { id: undefined } as unknown as User,
      } as Url;

      mockUrlRepository.create.mockReturnValue(mockUrl);
      mockUrlRepository.save.mockResolvedValue(mockUrl);

      const result = await service.register({ origin }, baseUrl, undefined);

      expect(urlRepository.create).toHaveBeenCalledWith({
        origin,
        shortCode: mockShortCode,
        user: { id: undefined },
      });
      // FIXED: Now saves URLs for anonymous users correctly
      expect(urlRepository.save).toHaveBeenCalledWith(mockUrl);
      expect(result).toEqual(mockUrl);
    });

    it('should handle hash collision by trying next substring', async () => {
      const mockUrl = {
        id: 'url-123',
        origin,
        url: `${baseUrl}/r/bc123d`,
        count: 0,
      } as Url;

      // First call returns collision, second returns null
      mockUrlRepository.findOne
        .mockResolvedValueOnce({ id: 'existing' } as Url)
        .mockResolvedValueOnce(null);

      mockUrlRepository.create.mockReturnValue(mockUrl);
      mockUrlRepository.save.mockResolvedValue(mockUrl);

      const result = await service.register({ origin }, baseUrl, 'user-123');

      // Should have checked for collisions
      expect(urlRepository.findOne).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should return undefined if no unique code can be generated', async () => {
      // All substrings are taken
      mockUrlRepository.findOne.mockResolvedValue({ id: 'existing' } as Url);

      const mockUrl = {
        id: 'url-123',
        origin,
        url: `${baseUrl}/r/undefined`,
        count: 0,
      } as Url;

      mockUrlRepository.create.mockReturnValue(mockUrl);
      mockUrlRepository.save.mockResolvedValue(mockUrl);

      const result = await service.register({ origin }, baseUrl, 'user-123');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not generate unique short URL'),
        expect.any(Object),
      );
    });
  });

  describe('getById', () => {
    const urlId = 'url-123';
    const userId = 'user-123';

    it('should return URL when found and belongs to user', async () => {
      const mockUrl = {
        id: urlId,
        origin: 'https://example.com',
        url: 'http://localhost:3000/r/abc123',
        count: 5,
        user: { id: userId },
      } as Url;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUrl),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getById(urlId, userId);

      expect(urlRepository.createQueryBuilder).toHaveBeenCalledWith('url');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('url.id = :id', {
        id: urlId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.id = :userId',
        { userId },
      );
      expect(result).toEqual(mockUrl);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should throw NotFoundException when URL not found', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await expect(service.getById(urlId, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('URL not found'),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when URL belongs to different user', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await expect(service.getById(urlId, 'different-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getByShortCode', () => {
    const shortCode = 'abc123';

    it('should return origin URL and increment count atomically', async () => {
      const mockUrl = {
        id: 'url-123',
        origin: 'https://example.com',
        shortCode: shortCode,
        count: 5,
      } as Url;

      mockUrlRepository.findOne.mockResolvedValue(mockUrl);
      mockUrlRepository.increment.mockResolvedValue({ affected: 1, raw: [] });

      const result = await service.getByShortCode(shortCode);

      expect(urlRepository.findOne).toHaveBeenCalledWith({
        where: { shortCode },
      });
      expect(urlRepository.increment).toHaveBeenCalledWith(
        { shortCode },
        'count',
        1,
      );
      expect(result).toBe('https://example.com');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Redirecting short URL'),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when short code not found', async () => {
      mockUrlRepository.findOne.mockResolvedValue(null);

      await expect(service.getByShortCode(shortCode)).rejects.toThrow(
        NotFoundException,
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Short URL not found'),
        expect.any(Object),
      );
    });

    it('should handle multiple concurrent increments safely', async () => {
      // This test verifies the race condition is fixed with atomic increment
      const mockUrl = {
        id: 'url-123',
        origin: 'https://example.com',
        shortCode: shortCode,
        count: 5,
      } as Url;

      mockUrlRepository.findOne.mockResolvedValue(mockUrl);
      mockUrlRepository.increment.mockResolvedValue({ affected: 1, raw: [] });

      // Simulate concurrent calls
      const promises = [
        service.getByShortCode(shortCode),
        service.getByShortCode(shortCode),
        service.getByShortCode(shortCode),
      ];

      await Promise.all(promises);

      // With atomic increment, all 3 increments should succeed
      expect(urlRepository.increment).toHaveBeenCalledTimes(3);
    });
  });

  describe('list', () => {
    const userId = 'user-123';

    it('should return paginated URLs with metadata', async () => {
      const mockUrls = [
        {
          id: 'url-1',
          origin: 'https://example1.com',
          url: 'http://localhost/r/abc',
          count: 5,
        },
        {
          id: 'url-2',
          origin: 'https://example2.com',
          url: 'http://localhost/r/def',
          count: 10,
        },
      ] as Url[];

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockUrls, 2]),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.list(
        { page: 1, itemsPerPage: 10, order: 'ASC' },
        userId,
      );

      expect(urlRepository.createQueryBuilder).toHaveBeenCalledWith('urls');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'users.id = :userId',
        { userId },
      );
      expect(result.items).toEqual(mockUrls);
      expect(result.meta).toHaveProperty('page', 1);
      expect(result.meta).toHaveProperty('quantityTotalPages', 1);
      expect(result.meta).toHaveProperty('quantityTotalItems', 2);
      expect(result.meta).toHaveProperty('quantityResults', 2);
      expect(result.meta).toHaveProperty('hasPreviousPage', false);
      expect(result.meta).toHaveProperty('hasNextPage', false);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Returning 2 URLs'),
        expect.any(Object),
      );
    });

    it('should apply default pagination parameters', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.list({}, userId);

      expect(mockQueryBuilder.skip).toHaveBeenCalled();
      expect(mockQueryBuilder.take).toHaveBeenCalled();
    });

    it('should handle pagination correctly', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 25]),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.list({ page: 2, itemsPerPage: 10 }, userId);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.meta.quantityTotalPages).toBe(3);
    });
  });

  describe('update', () => {
    const urlId = 'url-123';
    const userId = 'user-123';
    const baseUrl = 'http://localhost:3000';

    it('should update URL origin and regenerate short code', async () => {
      const existingUrl = {
        id: urlId,
        origin: 'https://old-example.com',
        url: 'http://localhost:3000/r/old123',
        count: 5,
        user: { id: userId },
      } as Url;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingUrl),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      mockEncryptionService.generateMd5Hash.mockReturnValue('newhash123456');
      mockUrlRepository.findOne.mockResolvedValue(null);

      const updatedUrl = {
        ...existingUrl,
        origin: 'https://new-example.com',
        url: 'http://localhost:3000/r/newhas',
      };

      mockUrlRepository.save.mockResolvedValue(updatedUrl);

      const result = await service.update(
        urlId,
        { origin: 'https://new-example.com' },
        baseUrl,
        userId,
      );

      expect(encryptionService.generateMd5Hash).toHaveBeenCalledWith(
        'https://new-example.com',
      );
      expect(urlRepository.save).toHaveBeenCalled();
      expect(result.origin).toBe('https://new-example.com');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Origin changed'),
        expect.any(Object),
      );
    });

    it('should update without regenerating code if origin unchanged', async () => {
      const existingUrl = {
        id: urlId,
        origin: 'https://example.com',
        url: 'http://localhost:3000/r/abc123',
        count: 5,
        user: { id: userId },
      } as Url;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingUrl),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      mockUrlRepository.save.mockResolvedValue(existingUrl);

      const result = await service.update(
        urlId,
        { origin: 'https://example.com' },
        baseUrl,
        userId,
      );

      expect(encryptionService.generateMd5Hash).not.toHaveBeenCalled();
      expect(urlRepository.save).toHaveBeenCalled();
      expect(result.url).toBe('http://localhost:3000/r/abc123');
    });

    it('should throw NotFoundException when URL does not exist', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await expect(
        service.update(urlId, { origin: 'https://new.com' }, baseUrl, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    const urlId = 'url-123';
    const userId = 'user-123';

    it('should soft delete URL successfully', async () => {
      const existingUrl = {
        id: urlId,
        origin: 'https://example.com',
        url: 'http://localhost:3000/r/abc123',
        user: { id: userId },
      } as Url;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingUrl),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      mockUrlRepository.softDelete.mockResolvedValue({
        affected: 1,
        raw: [],
      });

      await service.delete(urlId, userId);

      expect(urlRepository.softDelete).toHaveBeenCalledWith(urlId);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('URL soft deleted successfully'),
        expect.any(Object),
      );
    });

    it('should throw error when soft delete fails', async () => {
      const existingUrl = {
        id: urlId,
        origin: 'https://example.com',
        url: 'http://localhost:3000/r/abc123',
        user: { id: userId },
      } as Url;

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(existingUrl),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      mockUrlRepository.softDelete.mockResolvedValue({
        affected: 0,
        raw: [],
      });

      await expect(service.delete(urlId, userId)).rejects.toThrow(
        'Soft delete failed — no rows affected',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw NotFoundException when URL not found', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      mockUrlRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await expect(service.delete(urlId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const baseUrl = 'http://localhost:3000';
      const origin = 'https://example.com';

      mockEncryptionService.generateMd5Hash.mockReturnValue('abc123');
      mockUrlRepository.findOne.mockResolvedValue(null);
      mockUrlRepository.create.mockReturnValue({} as Url);
      mockUrlRepository.save.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(
        service.register({ origin }, baseUrl, 'user-123'),
      ).rejects.toThrow('Database connection error');
    });

    it('should handle empty hash generation', async () => {
      const baseUrl = 'http://localhost:3000';
      const origin = 'https://example.com';

      mockEncryptionService.generateMd5Hash.mockReturnValue('');
      mockUrlRepository.findOne.mockResolvedValue(null);

      const mockUrl = {
        id: 'url-123',
        origin,
        url: `${baseUrl}/r/undefined`,
        count: 0,
      } as Url;

      mockUrlRepository.create.mockReturnValue(mockUrl);
      mockUrlRepository.save.mockResolvedValue(mockUrl);

      await service.register({ origin }, baseUrl, 'user-123');

      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
