import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { Logger } from 'winston';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: jest.Mocked<ConfigService>;
  let logger: jest.Mocked<Logger>;

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const MOCK_CONFIG = {
    ALGORITHM: 'aes-256-cbc',
    SECRET_KEY:
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    IV: '0123456789abcdef0123456789abcdef',
  };

  beforeEach(async () => {
    mockConfigService.get
      .mockReturnValueOnce(MOCK_CONFIG.ALGORITHM)
      .mockReturnValueOnce(MOCK_CONFIG.SECRET_KEY)
      .mockReturnValueOnce(MOCK_CONFIG.IV);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
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

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get(ConfigService);
    logger = module.get('winston');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Definition', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with configuration', () => {
      expect(configService.get).toHaveBeenCalledTimes(3);
      expect(logger.info).toHaveBeenCalledWith(
        'Initializing Encryption service',
        expect.any(Object),
      );
    });
  });

  describe('encprypt', () => {
    it('should encrypt plaintext string', () => {
      const plaintext = 'my-secret-password';
      const encrypted = service.encprypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('should produce deterministic encryption for same input', () => {
      const plaintext = 'test-password';
      const encrypted1 = service.encprypt(plaintext);
      const encrypted2 = service.encprypt(plaintext);

      expect(encrypted1).toBe(encrypted2);
    });

    it('should produce different ciphertext for different inputs', () => {
      const plaintext1 = 'password1';
      const plaintext2 = 'password2';

      const encrypted1 = service.encprypt(plaintext1);
      const encrypted2 = service.encprypt(plaintext2);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty strings', () => {
      const encrypted = service.encprypt('');
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-={}[]|:;<>?,./~`';
      const encrypted = service.encprypt(specialChars);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(specialChars);
    });

    it('should handle unicode characters', () => {
      const unicode = '密码 пароль Пароль 🔒';
      const encrypted = service.encprypt(unicode);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(unicode);
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      const encrypted = service.encprypt(longString);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(longString);
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted string', () => {
      const plaintext = 'my-secret-password';
      const encrypted = service.encprypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw BadRequestException for invalid ciphertext', () => {
      const invalidCiphertext = 'invalid-encrypted-data';

      expect(() => service.decrypt(invalidCiphertext)).toThrow(
        BadRequestException,
      );
      expect(() => service.decrypt(invalidCiphertext)).toThrow(
        'Something went wrong decrypting',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw for empty string', () => {
      expect(() => service.decrypt('')).toThrow(BadRequestException);
    });

    it('should throw for tampered ciphertext', () => {
      const plaintext = 'password';
      const encrypted = service.encprypt(plaintext);
      const tampered = encrypted.slice(0, -2) + 'xx';

      expect(() => service.decrypt(tampered)).toThrow(BadRequestException);
    });

    it('should handle round-trip encryption/decryption', () => {
      const testCases = [
        'simple',
        'with spaces',
        '123456789',
        '!@#$%^&*()',
        'emoji 🔒',
        'a'.repeat(1000),
      ];

      testCases.forEach((testCase) => {
        const encrypted = service.encprypt(testCase);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(testCase);
      });
    });

    it('should log errors when decryption fails', () => {
      expect(() => service.decrypt('invalid')).toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error decrypting'),
        expect.objectContaining({
          context: 'EncryptionService',
          stack: expect.any(String),
        }),
      );
    });
  });

  describe('generateMd5Hash', () => {
    it('should generate MD5 hash', () => {
      const data = 'test-data';
      const hash = service.generateMd5Hash(data);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(32); // MD5 produces 32 hex characters
    });

    it('should produce consistent hashes', () => {
      const data = 'consistent-data';
      const hash1 = service.generateMd5Hash(data);
      const hash2 = service.generateMd5Hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const data1 = 'data1';
      const data2 = 'data2';

      const hash1 = service.generateMd5Hash(data1);
      const hash2 = service.generateMd5Hash(data2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = service.generateMd5Hash('');
      expect(hash).toBeDefined();
      expect(hash.length).toBe(32);
    });

    it('should generate hash for URLs', () => {
      const url = 'https://example.com/very/long/url/path?param=value';
      const hash = service.generateMd5Hash(url);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(32);
      expect(/^[a-f0-9]{32}$/.test(hash)).toBe(true);
    });

    it('should handle special characters in hash input', () => {
      const specialData = '!@#$%^&*()_+-={}[]|:;<>?,./~`';
      const hash = service.generateMd5Hash(specialData);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(32);
    });

    it('should produce lowercase hexadecimal output', () => {
      const data = 'test';
      const hash = service.generateMd5Hash(data);

      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should handle very long inputs', () => {
      const longData = 'a'.repeat(100000);
      const hash = service.generateMd5Hash(longData);

      expect(hash).toBeDefined();
      expect(hash.length).toBe(32);
    });
  });

  describe('Security Properties', () => {
    it('encrypted data should not contain plaintext', () => {
      const plaintext = 'very-secret-password';
      const encrypted = service.encprypt(plaintext);

      expect(encrypted).not.toContain(plaintext);
      expect(encrypted.toLowerCase()).not.toContain(plaintext.toLowerCase());
    });

    it('should use hex encoding for ciphertext', () => {
      const plaintext = 'test';
      const encrypted = service.encprypt(plaintext);

      // Hex encoding only contains 0-9 and a-f
      expect(/^[a-f0-9]+$/.test(encrypted)).toBe(true);
    });

    it('different plaintexts should have different lengths after encryption', () => {
      const short = 'a';
      const long = 'a'.repeat(100);

      const encryptedShort = service.encprypt(short);
      const encryptedLong = service.encprypt(long);

      expect(encryptedShort.length).toBeLessThan(encryptedLong.length);
    });

    it('MD5 hashes should be irreversible', () => {
      const data = 'secret-data';
      const hash = service.generateMd5Hash(data);

      // MD5 is one-way; cannot decrypt a hash
      expect(() => service.decrypt(hash)).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null byte in plaintext', () => {
      const plaintext = 'text\0with\0null';
      const encrypted = service.encprypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle newlines and tabs', () => {
      const plaintext = 'line1\nline2\tindented';
      const encrypted = service.encprypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle JSON strings', () => {
      const jsonString = JSON.stringify({
        key: 'value',
        nested: { data: 123 },
      });
      const encrypted = service.encprypt(jsonString);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(jsonString);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonString));
    });
  });
});
