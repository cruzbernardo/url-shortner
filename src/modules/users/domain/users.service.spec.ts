import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/database/entities';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Logger } from 'winston';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let logger: jest.Mocked<Logger>;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'encrypted-password',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    urls: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: 'winston',
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    logger = module.get('winston');
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
    const registerData = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'encrypted-password',
    };

    it('should register a new user successfully', async () => {
      const createdUser = { ...mockUser, ...registerData };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);

      const result = await service.register(registerData);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
      expect(userRepository.create).toHaveBeenCalledWith(registerData);
      expect(userRepository.save).toHaveBeenCalledWith(createdUser);
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', createdUser.id);
      expect(result).toHaveProperty('email', createdUser.email);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('User registered successfully'),
        expect.any(Object),
      );
    });

    it('should exclude password from response', async () => {
      const createdUser = { ...mockUser, ...registerData };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue(createdUser);

      const result = await service.register(registerData);

      expect(result).toEqual({
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        created_at: createdUser.created_at,
        updated_at: createdUser.updated_at,
        deleted_at: createdUser.deleted_at,
        urls: createdUser.urls,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerData)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerData)).rejects.toThrow(
        'Email already in use',
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('email already in use'),
        expect.any(Object),
      );
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should log registration attempt', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await service.register(registerData);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Registering user'),
        expect.any(Object),
      );
    });

    it('should handle database errors', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockRejectedValue(
        new Error('Database connection error'),
      );

      await expect(service.register(registerData)).rejects.toThrow(
        'Database connection error',
      );
    });
  });

  describe('get', () => {
    const userId = 'user-123';

    it('should return user by id without password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.get(userId);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', mockUser.id);
      expect(result).toHaveProperty('email', mockUser.email);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('User found'),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.get(userId)).rejects.toThrow(NotFoundException);
      await expect(service.get(userId)).rejects.toThrow('User not found');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('User not found'),
        expect.any(Object),
      );
    });

    it('should log user fetch attempt', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await service.get(userId);

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Fetching user by id'),
        expect.any(Object),
      );
    });
  });

  describe('findOneByEmail', () => {
    const email = 'test@example.com';

    it('should return user when found', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOneByEmail(email);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
      expect(result).toEqual(mockUser);
      expect(result).toHaveProperty('password');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('User found by email'),
        expect.any(Object),
      );
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findOneByEmail(email);

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('User not found by email'),
        expect.any(Object),
      );
    });
  });
});
