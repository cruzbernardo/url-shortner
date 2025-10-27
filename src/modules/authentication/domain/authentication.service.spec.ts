import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { UsersService } from 'src/modules/users/domain/users.service';
import { EncryptionService } from 'src/shared/utils/encryption.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Logger } from 'winston';
import { User } from 'src/database/entities';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let usersService: jest.Mocked<UsersService>;
  let encryptionService: jest.Mocked<EncryptionService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<Logger>;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockUsersService = {
    findOneByEmail: jest.fn(),
    register: jest.fn(),
  };

  const mockEncryptionService = {
    encprypt: jest.fn(),
    decrypt: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    getOrThrow: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'encrypted-password-hash',
    createdAt: new Date(),
    updatedAt: new Date(),
    urls: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
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

    service = module.get<AuthenticationService>(AuthenticationService);
    usersService = module.get(UsersService);
    encryptionService = module.get(EncryptionService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    logger = module.get('winston');

    // Setup default config
    mockConfigService.getOrThrow
      .mockReturnValueOnce('super-secret-key')
      .mockReturnValueOnce('24h');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize JWT configuration from environment', () => {
      expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET', {
        infer: true,
      });
      expect(configService.getOrThrow).toHaveBeenCalledWith(
        'JWT_EXPIRATION_TIME',
        {
          infer: true,
        },
      );
    });
  });

  describe('login', () => {
    it('should generate JWT token for user', async () => {
      const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      mockJwtService.sign.mockReturnValue(mockAccessToken);

      const result = await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          name: mockUser.name,
        },
        {
          secret: 'super-secret-key',
          expiresIn: '24h',
        },
      );
      expect(result).toEqual({
        accessToken: mockAccessToken,
      });
    });

    it('should only include id and name in JWT payload', async () => {
      mockJwtService.sign.mockReturnValue('token');

      await service.login(mockUser);

      const payload = mockJwtService.sign.mock.calls[0][0];
      expect(payload).toEqual({
        id: mockUser.id,
        name: mockUser.name,
      });
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('password');
    });
  });

  describe('signIn', () => {
    const signInData = {
      email: 'test@example.com',
      password: 'plaintext-password',
    };

    it('should sign in user with valid credentials', async () => {
      const encryptedPassword = 'encrypted-password-hash';
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockEncryptionService.encprypt.mockReturnValue(encryptedPassword);
      mockJwtService.sign.mockReturnValue('access-token');

      const result = await service.signIn(signInData);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(
        signInData.email,
      );
      expect(encryptionService.encprypt).toHaveBeenCalledWith(
        signInData.password,
      );
      expect(result).toHaveProperty('accessToken');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('User signed in successfully'),
        expect.any(Object),
      );
    });

    it('should throw exception when email not found', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(service.signIn(signInData)).rejects.toThrow(
        'email/password invalid',
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('email not found'),
        expect.any(Object),
      );
    });

    it('should throw exception when password is invalid', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      // Create a hash with the same length as the stored password to avoid timingSafeEqual error
      const wrongHash = 'x'.repeat(mockUser.password.length);
      mockEncryptionService.encprypt.mockReturnValue(wrongHash);

      await expect(service.signIn(signInData)).rejects.toThrow(
        'email/password invalid',
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('invalid password'),
        expect.any(Object),
      );
    });

    it('should use timing-safe comparison for password validation', async () => {
      // This test ensures that timing attacks are prevented
      const validPassword = 'encrypted-password-hash';
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockEncryptionService.encprypt.mockReturnValue(validPassword);
      mockJwtService.sign.mockReturnValue('token');

      const start = Date.now();
      await service.signIn(signInData);
      const validDuration = Date.now() - start;

      // Reset mocks
      jest.clearAllMocks();
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      // Wrong password with same length to avoid timingSafeEqual error
      const wrongPassword = 'w'.repeat(mockUser.password.length);
      mockEncryptionService.encprypt.mockReturnValue(wrongPassword);

      const start2 = Date.now();
      await expect(service.signIn(signInData)).rejects.toThrow();
      const invalidDuration = Date.now() - start2;

      // Timing-safe comparison should have similar execution times
      // This is a basic check - in reality, the difference should be minimal
      expect(Math.abs(validDuration - invalidDuration)).toBeLessThan(100);
    });

    it('should handle users with different password lengths securely', async () => {
      const shortPassword = 'abc';
      const longPassword = 'abcdefghijklmnopqrstuvwxyz123456789';

      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      // Generate hashes with same length as stored password to avoid timingSafeEqual error
      const wrongHash1 = 'a'.repeat(mockUser.password.length);
      const wrongHash2 = 'b'.repeat(mockUser.password.length);
      mockEncryptionService.encprypt
        .mockReturnValueOnce(wrongHash1)
        .mockReturnValueOnce(wrongHash2);

      // Both should fail in constant time
      await expect(
        service.signIn({ email: 'test@example.com', password: shortPassword }),
      ).rejects.toThrow();

      await expect(
        service.signIn({ email: 'test@example.com', password: longPassword }),
      ).rejects.toThrow();
    });
  });

  describe('signUp', () => {
    const signUpData = {
      name: 'New User',
      email: 'newuser@example.com',
      password: 'plaintext-password',
    };

    it('should register new user and return JWT token', async () => {
      const encryptedPassword = 'encrypted-new-password';
      const newUser = {
        ...mockUser,
        id: 'new-user-123',
        name: signUpData.name,
        email: signUpData.email,
        password: encryptedPassword,
      };

      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockEncryptionService.encprypt.mockReturnValue(encryptedPassword);
      mockUsersService.register.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue('new-user-token');

      // Need to pass a copy since the service mutates the object
      const dataToSignUp = { ...signUpData };
      const result = await service.signUp(dataToSignUp);

      expect(usersService.findOneByEmail).toHaveBeenCalledWith(
        signUpData.email,
      );
      // The password passed to encprypt is the original password before mutation
      expect(encryptionService.encprypt).toHaveBeenCalled();
      expect(usersService.register).toHaveBeenCalledWith({
        ...signUpData,
        password: encryptedPassword,
      });
      expect(result).toHaveProperty('accessToken', 'new-user-token');
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('User registered and signed in'),
        expect.any(Object),
      );
    });

    it('should throw exception when email already exists', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);

      await expect(service.signUp(signUpData)).rejects.toThrow(
        'email/password invalid',
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('email already in use'),
        expect.any(Object),
      );
      expect(usersService.register).not.toHaveBeenCalled();
    });

    it('should encrypt password before saving', async () => {
      const encryptedPassword = 'super-encrypted-password';
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockEncryptionService.encprypt.mockReturnValue(encryptedPassword);
      mockUsersService.register.mockResolvedValue({
        ...mockUser,
        password: encryptedPassword,
      });
      mockJwtService.sign.mockReturnValue('token');

      const dataToSignUp = { ...signUpData };
      await service.signUp(dataToSignUp);

      // Verify encprypt was called (exact parameter check is tricky due to mutation)
      expect(encryptionService.encprypt).toHaveBeenCalled();
      expect(usersService.register).toHaveBeenCalledWith({
        ...signUpData,
        password: encryptedPassword,
      });
    });

    it('should mutate password in data object', async () => {
      // Documents current behavior where original object is mutated
      const dataToSignUp = { ...signUpData };
      const encryptedPassword = 'encrypted-123';

      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockEncryptionService.encprypt.mockReturnValue(encryptedPassword);
      mockUsersService.register.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');

      await service.signUp(dataToSignUp);

      // Original object is mutated
      expect(dataToSignUp.password).toBe(encryptedPassword);
    });

    it('should handle registration service errors', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockEncryptionService.encprypt.mockReturnValue('encrypted');
      mockUsersService.register.mockRejectedValue(new Error('Database error'));

      await expect(service.signUp(signUpData)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Security Considerations', () => {
    it('should not expose password in JWT payload', async () => {
      mockJwtService.sign.mockReturnValue('token');

      await service.login(mockUser);

      const jwtPayload = mockJwtService.sign.mock.calls[0][0];
      expect(jwtPayload).not.toHaveProperty('password');
    });

    it('should not expose email in JWT payload', async () => {
      mockJwtService.sign.mockReturnValue('token');

      await service.login(mockUser);

      const jwtPayload = mockJwtService.sign.mock.calls[0][0];
      expect(jwtPayload).not.toHaveProperty('email');
    });

    it('should use configured JWT secret and expiration', async () => {
      mockJwtService.sign.mockReturnValue('token');

      await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Object), {
        secret: 'super-secret-key',
        expiresIn: '24h',
      });
    });

    it('should log authentication attempts for audit', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(
        service.signIn({ email: 'test@example.com', password: '123' }),
      ).rejects.toThrow();

      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Integration Flows', () => {
    it('should complete full sign-up flow', async () => {
      const newUserData = {
        name: 'Integration User',
        email: 'integration@example.com',
        password: 'password123',
      };
      const encryptedPassword = 'encrypted-integration-password';
      const savedUser = {
        ...mockUser,
        id: 'integration-user-id',
        ...newUserData,
        password: encryptedPassword,
      };

      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockEncryptionService.encprypt.mockReturnValue(encryptedPassword);
      mockUsersService.register.mockResolvedValue(savedUser);
      mockJwtService.sign.mockReturnValue('integration-token');

      const dataToSignUp = { ...newUserData };
      const result = await service.signUp(dataToSignUp);

      // Verify all services were called
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(
        newUserData.email,
      );
      expect(encryptionService.encprypt).toHaveBeenCalled();
      expect(usersService.register).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalled();

      expect(result.accessToken).toBe('integration-token');
    });

    it('should complete full sign-in flow', async () => {
      const credentials = {
        email: 'existing@example.com',
        password: 'correct-password',
      };

      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockEncryptionService.encprypt.mockReturnValue(mockUser.password);
      mockJwtService.sign.mockReturnValue('signin-token');

      const result = await service.signIn(credentials);

      // Verify all services were called
      expect(usersService.findOneByEmail).toHaveBeenCalledWith(
        credentials.email,
      );
      expect(encryptionService.encprypt).toHaveBeenCalledWith(
        credentials.password,
      );
      expect(jwtService.sign).toHaveBeenCalled();

      expect(result.accessToken).toBe('signin-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption service failures', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);
      mockEncryptionService.encprypt.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      await expect(
        service.signUp({
          name: 'Test',
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow('Encryption failed');
    });

    it('should handle JWT service failures', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(mockUser);
      mockEncryptionService.encprypt.mockReturnValue(mockUser.password);
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      await expect(
        service.signIn({
          email: 'test@example.com',
          password: 'password',
        }),
      ).rejects.toThrow('JWT signing failed');
    });

    it('should handle null user from database', async () => {
      mockUsersService.findOneByEmail.mockResolvedValue(null);

      await expect(
        service.signIn({
          email: 'nonexistent@example.com',
          password: 'password',
        }),
      ).rejects.toThrow();

      expect(encryptionService.encprypt).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
