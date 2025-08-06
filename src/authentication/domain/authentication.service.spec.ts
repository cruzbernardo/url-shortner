const mockBcrypt = {
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('any_hash'),
};
process.env.CONSUMER_CLIENTID = 'any_customer_client_id';
process.env.SYSTEM_CLIENTID = 'any_system_client_id';
process.env.CONSUMER_POOLID = 'client_pool_id';
process.env.SYSTEM_POOLID = 'system_pool_id';

jest.mock('bcrypt', () => mockBcrypt);

import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from './authentication.service';
import { SignInFlow } from '../http/enums';
import { USER_REPOSITORY_TOKEN } from '@modules/customer/domain/repositories';
import { UserRole } from '@libs/repositories/mysql';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CognitoAccessManagementService } from '@libs/aws-services/cognito-identity/services';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  const mockCognitoAccessService = {
    signIn: jest.fn(),
    setPasswordFirstSignIn: jest.fn(),
    forgotPassword: jest.fn(),
    confirmForgotPassword: jest.fn(),
    changePassword: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockJwtService = { decode: jest.fn() };

  const mockUserRepositoryService = {
    findOneByEmail: jest.fn(),
    validateUser: jest.fn(),
    saveRefreshToken: jest.fn(),
  };

  const mockConfigService = {
    get: (varName: string) => {
      return process.env[varName];
    },
  };

  const mockedDate = new Date(2023, 5, 1, 0, 0, 0, 0);

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(mockedDate);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: CognitoAccessManagementService,
          useValue: mockCognitoAccessService,
        },
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: mockUserRepositoryService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signIn', () => {
    const password = 'any_password';
    const userName = 'any_userName';

    const spyCustomerSignIn = jest.spyOn(
      AuthenticationService.prototype as any,
      'customerSignIn',
    );
    const spySystemSignIn = jest.spyOn(
      AuthenticationService.prototype as any,
      'systemSignIn',
    );

    it('should be able signIn a user on cognito', async () => {
      mockCognitoAccessService.signIn = jest.fn().mockResolvedValue({
        accessToken: 'any_access_token',
        refreshToken: 'any_refresh_token',
        signInFlow: SignInFlow.AUTHORIZED,
        session: undefined,
        userName: undefined,
      });

      const user = {
        id: 'user-id',
        userName: 'any_userName',
        role: UserRole.ADMIN,
      };

      mockUserRepositoryService.findOneByEmail.mockResolvedValueOnce(user);

      const result = await service.signIn({
        password,
        userName,
      });

      expect(result).toStrictEqual({
        accessToken: 'any_access_token',
        refreshToken: 'any_refresh_token',
        signInFlow: SignInFlow.AUTHORIZED,
        session: undefined,
        userName: undefined,
        secureCookie: true,
      });

      expect(spySystemSignIn).toBeCalledTimes(0);
      expect(spyCustomerSignIn).toBeCalledTimes(1);
      expect(spyCustomerSignIn).toBeCalledWith({
        password: 'any_password',
        user: {
          id: 'user-id',
          role: 'admin',
          userName: 'any_userName',
        },
      });
      expect(mockCognitoAccessService.signIn).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.signIn).toHaveBeenCalledWith(
        userName,
        password,
        'any_customer_client_id',
      );
    });

    it('should be able signIn on cognito when user is a application', async () => {
      mockCognitoAccessService.signIn = jest.fn().mockResolvedValue({
        accessToken: 'any_access_token',
        refreshToken: 'any_refresh_token',
        signInFlow: SignInFlow.AUTHORIZED,
        session: undefined,
        userName: undefined,
      });

      const user = {
        id: 'user-id',
        userName: 'any_userName',
        role: UserRole.APPLICATION,
      };

      mockUserRepositoryService.findOneByEmail.mockResolvedValueOnce(user);

      const result = await service.signIn({
        password,
        userName,
      });

      expect(result).toStrictEqual({
        accessToken: 'any_access_token',
        refreshToken: 'any_refresh_token',
        signInFlow: SignInFlow.AUTHORIZED,
        session: undefined,
        userName: undefined,
        secureCookie: false,
      });
      expect(spyCustomerSignIn).toBeCalledTimes(0);
      expect(spySystemSignIn).toBeCalledTimes(1);
      expect(spySystemSignIn).toBeCalledWith({
        password: 'any_password',
        user: {
          id: 'user-id',
          role: 'application',
          userName: 'any_userName',
        },
      });
      expect(mockCognitoAccessService.signIn).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.signIn).toHaveBeenCalledWith(
        userName,
        password,
        'any_system_client_id',
      );
    });

    it('should be able to return the session to change password if the ChallengeName is NEW_PASSWORD_REQUIRED', async () => {
      mockCognitoAccessService.signIn = jest.fn().mockResolvedValue({
        session: 'any_session',
        refreshToken: undefined,
        signInFlow: SignInFlow.NEW_PASSWORD_REQUIRED,
        accessToken: undefined,
        userName,
      });

      const user = {
        id: 'user-id',
        userName: 'any_userName',
        role: UserRole.ADMIN,
      };

      mockUserRepositoryService.findOneByEmail.mockResolvedValueOnce(user);

      const result = await service.signIn({
        password,
        userName,
      });

      expect(result).toStrictEqual({
        session: 'any_session',
        signInFlow: SignInFlow.NEW_PASSWORD_REQUIRED,
        accessToken: undefined,
        refreshToken: undefined,
        userName,
        secureCookie: true,
      });
      expect(mockCognitoAccessService.signIn).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.signIn).toHaveBeenCalledWith(
        userName,
        password,
        'any_customer_client_id',
      );
    });

    it('should be able to return a error when user not found', async () => {
      mockCognitoAccessService.signIn = jest
        .fn()
        .mockRejectedValueOnce(
          new BadRequestException('Usuário e/ou senha inválidos.'),
        );

      mockUserRepositoryService.findOneByEmail.mockResolvedValueOnce(null);

      await expect(service.signIn({ password, userName })).rejects.toThrow(
        new BadRequestException('Usuário e/ou senha inválidos.'),
      );

      expect(mockCognitoAccessService.signIn).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.signIn).toHaveBeenCalledWith(
        'usuario-not-fount',
        password,
        'any_customer_client_id',
      );
    });
  });

  describe('signOut', () => {
    it('should be able to signOut calling saveRefreshToken', async () => {
      mockJwtService.decode = jest
        .fn()
        .mockReturnValue({ username: 'any_userName' });

      await expect(service.signOut('any_token')).resolves.not.toThrow();
      expect(mockJwtService.decode).toHaveBeenCalledTimes(1);
      expect(mockJwtService.decode).toHaveBeenCalledWith('any_token');
      expect(mockUserRepositoryService.saveRefreshToken).toHaveBeenCalledTimes(
        1,
      );
      expect(mockUserRepositoryService.saveRefreshToken).toHaveBeenCalledWith(
        null,
        'any_userName',
      );
    });

    it('should not call saveRefreshToken if no token was provided', async () => {
      await expect(service.signOut(null)).resolves.not.toThrow();
      expect(mockJwtService.decode).toHaveBeenCalledTimes(0);
      expect(mockUserRepositoryService.saveRefreshToken).toHaveBeenCalledTimes(
        0,
      );
    });

    it('should not call saveRefreshToken if the decode function return a string', async () => {
      mockJwtService.decode = jest.fn().mockReturnValue('any_return');

      await expect(service.signOut('any_token')).resolves.not.toThrow();
      expect(mockJwtService.decode).toHaveBeenCalledTimes(1);
      expect(mockJwtService.decode).toHaveBeenCalledWith('any_token');
      expect(mockUserRepositoryService.saveRefreshToken).toHaveBeenCalledTimes(
        0,
      );
    });

    it('should not call saveRefreshToken if some error occours on decode', async () => {
      mockJwtService.decode = jest.fn().mockImplementation(() => {
        throw new Error();
      });

      await expect(service.signOut('any_token')).resolves.not.toThrow();
      expect(mockJwtService.decode).toHaveBeenCalledTimes(1);
      expect(mockJwtService.decode).toHaveBeenCalledWith('any_token');
      expect(mockUserRepositoryService.saveRefreshToken).toHaveBeenCalledTimes(
        0,
      );
    });
  });

  describe('setPasswordFirstSignIn', () => {
    it('should be able to set a new password on the first login', async () => {
      const request = {
        signInFlow: SignInFlow.NEW_PASSWORD_REQUIRED,
        session: 'any_session',
        newPassword: 'any_new_password',
        confirmPassword: 'any_new_password',
        userName: 'user@name.com',
      };

      mockUserRepositoryService.validateUser = jest
        .fn()
        .mockResolvedValue({ success: true });

      mockCognitoAccessService.setPasswordFirstSignIn = jest
        .fn()
        .mockResolvedValue({
          AuthenticationResult: {
            AccessToken: 'any_access_token',
            RefreshToken: 'any_refresh_token',
          },
        });

      const result = await service.setPasswordFirstSignIn(request);
      expect(result).toStrictEqual({
        signInFlow: SignInFlow.AUTHORIZED,
        accessToken: 'any_access_token',
        refreshToken: 'any_refresh_token',
      });
      expect(
        mockCognitoAccessService.setPasswordFirstSignIn,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockCognitoAccessService.setPasswordFirstSignIn,
      ).toHaveBeenCalledWith(
        request.signInFlow,
        request.session,
        request.newPassword,
        request.userName,
        'any_customer_client_id',
      );
      expect(mockUserRepositoryService.validateUser).toHaveBeenCalledTimes(1);
      expect(mockUserRepositoryService.validateUser).toHaveBeenCalledWith(
        request.userName,
        'any_hash',
      );
    });
  });

  describe('forgotPassword', () => {
    it('should be able to request a code for change password', async () => {
      const request = {
        email: 'user@name.com',
      };
      mockCognitoAccessService.forgotPassword = jest.fn().mockResolvedValue({
        message: 'code_sent',
      });

      const result = await service.forgotPassword(request);
      expect(result).toStrictEqual({
        signInFlow: SignInFlow.VERIFICATION_CODE_SENT,
      });
      expect(mockCognitoAccessService.forgotPassword).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.forgotPassword).toHaveBeenCalledWith(
        request.email,
        'any_customer_client_id',
      );
    });
  });

  describe('confirmForgotPassword', () => {
    it('should be able to request a code for change password', async () => {
      const request = {
        newPassword: 'any_new_password',
        confirmPassword: 'any_new_password',
        code: 'any_code',
        email: 'user@name.com',
      };
      mockCognitoAccessService.confirmForgotPassword = jest
        .fn()
        .mockResolvedValue({
          message: 'success',
        });

      const result = await service.confirmForgotPassword(request);
      expect(result).toStrictEqual({
        signInFlow: SignInFlow.PASSWORD_CHANGED,
      });
      expect(
        mockCognitoAccessService.confirmForgotPassword,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockCognitoAccessService.confirmForgotPassword,
      ).toHaveBeenCalledWith(
        request.email,
        request.newPassword,
        request.code,
        'any_customer_client_id',
      );
    });
  });

  describe('changePassword', () => {
    it('should be able to change password', async () => {
      mockCognitoAccessService.changePassword = jest
        .fn()
        .mockResolvedValue({ success: true });

      const result = await service.changePassword(
        {
          actualPassword: 'any_passsword',
          newPassword: 'new_password',
          confirmPassword: 'new_password',
        },
        'any_token',
      );

      expect(result).toStrictEqual({ signInFlow: SignInFlow.PASSWORD_CHANGED });
      expect(mockCognitoAccessService.changePassword).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.changePassword).toHaveBeenCalledWith(
        'any_token',
        'any_passsword',
        'new_password',
      );
    });
  });

  describe('refreshToken', () => {
    const payload = { username: 'any_user_name' } as any;

    it('should refresh a token from a admin', async () => {
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockUserRepositoryService.findOneByEmail = jest.fn().mockResolvedValue({
        role: UserRole.ADMIN,
        refreshToken: 'any_hash',
      });
      mockCognitoAccessService.refreshToken = jest.fn().mockResolvedValue({
        accessToken: 'new_access_token',
        signInFlow: SignInFlow.AUTHORIZED,
      });
      const result = await service.refreshToken(payload, 'any_refresh_token');
      expect(result).toStrictEqual({
        accessToken: 'new_access_token',
        secureCookie: true,
        signInFlow: SignInFlow.AUTHORIZED,
      });
      expect(mockCognitoAccessService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.refreshToken).toHaveBeenCalledWith(
        'any_refresh_token',
        'any_customer_client_id',
      );
      expect(mockBcrypt.compare).toHaveBeenCalledTimes(1);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'any_refresh_token',
        'any_hash',
      );
    });

    it('should refresh a token from a customer', async () => {
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockUserRepositoryService.findOneByEmail = jest.fn().mockResolvedValue({
        role: UserRole.USER,
        refreshToken: 'any_hash',
      });
      mockCognitoAccessService.refreshToken = jest.fn().mockResolvedValue({
        accessToken: 'new_access_token',
        signInFlow: SignInFlow.AUTHORIZED,
      });
      const result = await service.refreshToken(payload, 'any_refresh_token');
      expect(result).toStrictEqual({
        accessToken: 'new_access_token',
        secureCookie: true,
        signInFlow: SignInFlow.AUTHORIZED,
      });
      expect(mockCognitoAccessService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.refreshToken).toHaveBeenCalledWith(
        'any_refresh_token',
        'any_customer_client_id',
      );
      expect(mockBcrypt.compare).toHaveBeenCalledTimes(1);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'any_refresh_token',
        'any_hash',
      );
    });

    it('should refresh a token from an application', async () => {
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockUserRepositoryService.findOneByEmail = jest.fn().mockResolvedValue({
        role: UserRole.APPLICATION,
        refreshToken: 'any_hash',
      });
      mockCognitoAccessService.refreshToken = jest.fn().mockResolvedValue({
        accessToken: 'new_access_token',
        signInFlow: SignInFlow.AUTHORIZED,
      });
      const result = await service.refreshToken(payload, 'any_refresh_token');
      expect(result).toStrictEqual({
        accessToken: 'new_access_token',
        secureCookie: false,
        signInFlow: SignInFlow.AUTHORIZED,
      });
      expect(mockCognitoAccessService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mockCognitoAccessService.refreshToken).toHaveBeenCalledWith(
        'any_refresh_token',
        'any_system_client_id',
      );
      expect(mockBcrypt.compare).toHaveBeenCalledTimes(1);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'any_refresh_token',
        'any_hash',
      );
    });

    it('should throw an UnauthorizedException if refresh token is invalid', async () => {
      mockBcrypt.compare = jest.fn().mockResolvedValue(false);
      mockUserRepositoryService.findOneByEmail = jest.fn().mockResolvedValue({
        role: UserRole.ADMIN,
        refreshToken: 'any_hash',
      });
      mockCognitoAccessService.refreshToken = jest.fn().mockResolvedValue({
        accessToken: 'new_access_token',
        signInFlow: SignInFlow.AUTHORIZED,
      });
      await expect(
        service.refreshToken(payload, 'any_refresh_token'),
      ).rejects.toThrow(new UnauthorizedException());
      expect(mockBcrypt.compare).toHaveBeenCalledTimes(1);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'any_refresh_token',
        'any_hash',
      );
    });

    it('should throw an UnauthorizedException if refresh token was not provided', async () => {
      await expect(service.refreshToken(payload, undefined)).rejects.toThrow(
        new UnauthorizedException(),
      );
    });
  });
});
