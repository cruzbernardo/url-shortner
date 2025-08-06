import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationService } from '../domain/authentication.service';
import { AuthenticationController } from './authentication.controller';
import { SignInFlow } from './enums';
import { Response } from 'express';
import { UserRole } from '@libs/repositories/mysql';
import { REQUEST } from '@nestjs/core';
import { USER_REPOSITORY_TOKEN } from '@modules/customer/domain/repositories';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;

  const mockAuthenticationService = {
    signIn: jest.fn(),
    refreshToken: jest.fn(),
    setPasswordFirstSignIn: jest.fn(),
    forgotPassword: jest.fn(),
    confirmForgotPassword: jest.fn(),
    changePassword: jest.fn(),
    signOut: jest.fn(),
  };

  const mockExpressResponse = {
    cookie: jest.fn(),
  };

  const mockUserRepositoryService = {
    findOneByEmail: jest.fn(),
  };

  const mockJwtService = {};

  const mockRequest = {
    user: {
      id: 'any_signed_user_id',
      email: 'any@email.com',
      name: 'any_name',
      role: UserRole.ADMIN,
      claims: [{ name: 'any_claim' }],
    },
    cookies: {
      access_token: 'any_access_token',
      refresh_token: 'any_refresh_token',
    },
  };

  const mockedDate = new Date(2023, 5, 1, 0, 0, 0, 0);

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(mockedDate);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: AuthenticationService,
          useValue: mockAuthenticationService,
        },
        {
          provide: REQUEST,
          useValue: mockRequest,
        },
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: mockUserRepositoryService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();
    process.env.ENV = 'local';
    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should be able to signIn returning a AUTHORIZED signInFlow and access_token and refresh_token in body', async () => {
      const accessToken = 'any_token';
      const refreshToken = 'any_refresh_token';

      mockAuthenticationService.signIn = jest.fn().mockResolvedValue({
        accessToken,
        refreshToken,
        signInFlow: SignInFlow.AUTHORIZED,
        secureCookie: false,
      });
      mockExpressResponse.cookie = jest.fn();

      const request = {
        userName: 'any_userName',
        password: 'any_password',
      };

      const result = await controller.signIn(
        request,
        mockExpressResponse as unknown as Response,
      );

      expect(result).toStrictEqual({
        accessToken: 'any_token',
        refreshToken: 'any_refresh_token',
        signInFlow: 'AUTHORIZED',
      });
      expect(mockAuthenticationService.signIn).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.signIn).toHaveBeenCalledWith(request);
      expect(mockExpressResponse.cookie).toHaveBeenCalledTimes(0);
    });

    it('should be able to signIn returning a AUTHORIZED signInFlow and access_token and refresh_token in cookie', async () => {
      const accessToken = 'any_token';
      const refreshToken = 'any_refresh_token';
      mockAuthenticationService.signIn = jest.fn().mockResolvedValue({
        accessToken,
        refreshToken,
        signInFlow: SignInFlow.AUTHORIZED,
        secureCookie: true,
      });
      mockExpressResponse.cookie = jest.fn();

      const request = {
        userName: 'any_userName',
        password: 'any_password',
      };
      const result = await controller.signIn(
        request,
        mockExpressResponse as unknown as Response,
      );

      expect(result).toStrictEqual({
        accessToken: undefined,
        refreshToken: undefined,
        signInFlow: 'AUTHORIZED',
      });
      expect(mockAuthenticationService.signIn).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.signIn).toHaveBeenCalledWith(request);
      expect(mockExpressResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockExpressResponse.cookie).toHaveBeenNthCalledWith(
        1,
        'access_token',
        accessToken,
        {
          domain: null,
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        },
      );
      expect(mockExpressResponse.cookie).toHaveBeenNthCalledWith(
        2,
        'refresh_token',
        refreshToken,
        {
          domain: null,
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        },
      );
    });

    it('should be able to signIn returning a AUTHORIZED signInFlow and access_token and refresh_token in cookie with domain .rarolabs.com.br', async () => {
      const accessToken = 'any_token';
      const refreshToken = 'any_refresh_token';
      process.env.ENV = null;
      mockAuthenticationService.signIn = jest.fn().mockResolvedValue({
        accessToken,
        refreshToken,
        signInFlow: SignInFlow.AUTHORIZED,
        secureCookie: true,
      });
      mockExpressResponse.cookie = jest.fn();

      const request = {
        userName: 'any_userName',
        password: 'any_password',
      };
      const result = await controller.signIn(
        request,
        mockExpressResponse as unknown as Response,
      );

      expect(result).toStrictEqual({
        accessToken: undefined,
        refreshToken: undefined,
        signInFlow: 'AUTHORIZED',
      });
      expect(mockAuthenticationService.signIn).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.signIn).toHaveBeenCalledWith(request);
      expect(mockExpressResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockExpressResponse.cookie).toHaveBeenNthCalledWith(
        1,
        'access_token',
        accessToken,
        {
          domain: '.rarolabs.com.br',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        },
      );
      expect(mockExpressResponse.cookie).toHaveBeenNthCalledWith(
        2,
        'refresh_token',
        refreshToken,
        {
          domain: '.rarolabs.com.br',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        },
      );
    });

    it('should be able to signIn returning a NEW_PASSWORD_REQUIRED signInFlow', async () => {
      mockAuthenticationService.signIn = jest.fn().mockResolvedValue({
        session: 'any_session',
        signInFlow: SignInFlow.NEW_PASSWORD_REQUIRED,
      });
      mockExpressResponse.cookie = jest.fn();

      const request = {
        userName: 'any_userName',
        password: 'any_password',
      };

      const result = await controller.signIn(
        request,
        mockExpressResponse as unknown as Response,
      );

      expect(result).toHaveProperty(
        'signInFlow',
        SignInFlow.NEW_PASSWORD_REQUIRED,
      );
      expect(result).toHaveProperty('session', 'any_session');
      expect(mockAuthenticationService.signIn).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.signIn).toHaveBeenCalledWith(request);
      expect(mockExpressResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('setPasswordFirstSignIn', () => {
    it('should be able to set the new password on the first sign in and return a AUTHORIZED signInFlow', async () => {
      const accessToken = 'any_accessToken';
      const refreshToken = 'any_refresh_token';
      mockAuthenticationService.setPasswordFirstSignIn = jest
        .fn()
        .mockResolvedValue({
          accessToken,
          refreshToken,
          signInFlow: SignInFlow.AUTHORIZED,
        });
      mockExpressResponse.cookie = jest.fn();

      const request = {
        signInFlow: SignInFlow.NEW_PASSWORD_REQUIRED,
        session: 'any_session',
        newPassword: 'new_valid_password',
        confirmPassword: 'new_valid_password',
        userName: 'user@name.com',
      };

      const result = await controller.setPasswordFirstSignIn(
        request,
        mockExpressResponse as unknown as Response,
      );

      expect(result).toHaveProperty('signInFlow', SignInFlow.AUTHORIZED);
      expect(
        mockAuthenticationService.setPasswordFirstSignIn,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockAuthenticationService.setPasswordFirstSignIn,
      ).toHaveBeenCalledWith(request);
      expect(mockExpressResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockExpressResponse.cookie).toHaveBeenNthCalledWith(
        1,
        'access_token',
        accessToken,
        {
          domain: null,
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        },
      );
      expect(mockExpressResponse.cookie).toHaveBeenNthCalledWith(
        2,
        'refresh_token',
        refreshToken,
        {
          domain: null,
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        },
      );
    });

    it('should be able to set the new password on the first sign in and return a AUTHORIZED signInFlow with domain .rarolabs.com.br', async () => {
      const accessToken = 'any_accessToken';
      const refreshToken = 'any_access_token';
      process.env.ENV = null;
      mockAuthenticationService.setPasswordFirstSignIn = jest
        .fn()
        .mockResolvedValue({
          accessToken,
          refreshToken,
          signInFlow: SignInFlow.AUTHORIZED,
        });
      mockExpressResponse.cookie = jest.fn();

      const request = {
        signInFlow: SignInFlow.NEW_PASSWORD_REQUIRED,
        session: 'any_session',
        newPassword: 'new_valid_password',
        confirmPassword: 'new_valid_password',
        userName: 'user@name.com',
      };

      const result = await controller.setPasswordFirstSignIn(
        request,
        mockExpressResponse as unknown as Response,
      );

      expect(result).toHaveProperty('signInFlow', SignInFlow.AUTHORIZED);
      expect(
        mockAuthenticationService.setPasswordFirstSignIn,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockAuthenticationService.setPasswordFirstSignIn,
      ).toHaveBeenCalledWith(request);
      expect(mockExpressResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockExpressResponse.cookie).toHaveBeenNthCalledWith(
        1,
        'access_token',
        accessToken,
        {
          domain: '.rarolabs.com.br',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        },
      );
      expect(mockExpressResponse.cookie).toHaveBeenNthCalledWith(
        2,
        'refresh_token',
        refreshToken,
        {
          domain: '.rarolabs.com.br',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        },
      );
    });
  });

  describe('forgotPassword', () => {
    it('should be able to sent a email with code to change a forgotten password', async () => {
      const request = { email: 'any@email.com' };
      const response = {
        signInFlow: SignInFlow.VERIFICATION_CODE_SENT,
      };
      mockAuthenticationService.forgotPassword = jest
        .fn()
        .mockResolvedValue(response);

      const result = await controller.forgotPassword(request);
      expect(result).toStrictEqual(response);
      expect(mockAuthenticationService.forgotPassword).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.forgotPassword).toHaveBeenCalledWith(
        request,
      );
    });
  });

  describe('confirmForgotPassword', () => {
    it('should be able to confirm the password change', async () => {
      const request = {
        code: 'any_code',
        email: 'any@email.com',
        newPassword: 'password',
        confirmPassword: 'password',
      };
      const response = {
        signInFlow: SignInFlow.PASSWORD_CHANGED,
      };
      mockAuthenticationService.confirmForgotPassword = jest
        .fn()
        .mockResolvedValue(response);

      const result = await controller.confirmForgotPassword(request);
      expect(result).toStrictEqual(response);
      expect(
        mockAuthenticationService.confirmForgotPassword,
      ).toHaveBeenCalledTimes(1);
      expect(
        mockAuthenticationService.confirmForgotPassword,
      ).toHaveBeenCalledWith(request);
    });
  });

  describe('getMe', () => {
    it('should be able to return the signed in user data', async () => {
      const result = await controller.getMe();
      expect(result).toStrictEqual({
        id: 'any_signed_user_id',
        email: 'any@email.com',
        name: 'any_name',
        role: UserRole.ADMIN,
        claims: [{ name: 'any_claim' }],
      });
    });

    it('should throw an error if signed user is an application', async () => {
      const request = {
        user: {
          id: 'any_signed_user_id',
          email: 'any@email.com',
          name: 'any_name',
          role: UserRole.APPLICATION,
          claims: [{ name: 'any_claim' }],
        },
        cookies: {
          access_token: 'any_access_token',
          refresh_token: 'any_refresh_token',
        },
      };
      const controller = new AuthenticationController(
        {} as any,
        request as any,
      );
      expect(controller.getMe()).rejects.toThrow(new UnauthorizedException());
    });
  });

  describe('getMyApplication', () => {
    it('should be able to return my application', async () => {
      const request = {
        user: {
          id: 'any_signed_user_id',
          email: 'any@email.com',
          name: 'any_name',
          role: UserRole.APPLICATION,
          claims: [{ name: 'any_claim' }],
        },
        cookies: {
          access_token: 'any_access_token',
          refresh_token: 'any_refresh_token',
        },
      };
      const controller = new AuthenticationController(
        {} as any,
        request as any,
      );
      const result = await controller.getMyApplication();
      expect(result).toStrictEqual({
        claims: [
          {
            name: 'any_claim',
          },
        ],
        email: 'any@email.com',
        id: 'any_signed_user_id',
        name: 'any_name',
        role: 'application',
      });
    });
  });

  describe('signOut', () => {
    it('should be do a logout sucess', async () => {
      mockAuthenticationService.signOut = jest.fn().mockResolvedValue({});

      const res: Partial<Response> = {
        cookie: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockImplementation((cb) => cb),
      };

      await controller.signOut(res as unknown as Response);
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenNthCalledWith(1, 'access_token', '', {
        domain: null,
        expires: new Date('2023-06-01T03:00:00.000Z'),
      });
      expect(res.cookie).toHaveBeenNthCalledWith(2, 'refresh_token', '', {
        domain: null,
        expires: new Date('2023-06-01T03:00:00.000Z'),
      });
    });

    it('should be do a logout sucess with domain .rarolabs.com.br', async () => {
      process.env.ENV = null;
      const res: Partial<Response> = {
        cookie: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockImplementation((cb) => cb),
      };

      await controller.signOut(res as unknown as Response);
      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenNthCalledWith(1, 'access_token', '', {
        domain: '.rarolabs.com.br',
        expires: new Date('2023-06-01T03:00:00.000Z'),
      });
      expect(res.cookie).toHaveBeenNthCalledWith(2, 'refresh_token', '', {
        domain: '.rarolabs.com.br',
        expires: new Date('2023-06-01T03:00:00.000Z'),
      });
    });
  });

  describe('changePassword', () => {
    it('should be able to change the password', async () => {
      const response = {
        signInFlow: SignInFlow.PASSWORD_CHANGED,
      };
      const request = {
        actualPassword: 'any_passsword',
        newPassword: 'new_password',
        confirmPassword: 'new_password',
      };
      mockAuthenticationService.changePassword = jest
        .fn()
        .mockResolvedValueOnce(response);
      const result = await controller.changePassword(request);
      expect(result).toStrictEqual(response);
      expect(mockAuthenticationService.changePassword).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.changePassword).toHaveBeenCalledWith(
        request,
        mockRequest.cookies.access_token,
      );
    });
  });

  describe('refreshToken', () => {
    it('should be able to refresh a token and return the tokens in cookie', async () => {
      const accessToken = 'any_token';
      mockAuthenticationService.refreshToken = jest.fn().mockResolvedValue({
        accessToken,
        signInFlow: SignInFlow.AUTHORIZED,
        secureCookie: true,
      });

      const result = await controller.refreshToken(
        mockExpressResponse as unknown as Response,
      );
      expect(result).toStrictEqual({
        accessToken: undefined,
        signInFlow: 'AUTHORIZED',
      });
      expect(mockAuthenticationService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.refreshToken).toHaveBeenCalledWith(
        mockRequest.user,
        'any_refresh_token',
      );
      expect(mockExpressResponse.cookie).toHaveBeenCalledTimes(1);
      expect(mockExpressResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'any_token',
        {
          domain: null,
          httpOnly: true,
          sameSite: 'none',
          secure: true,
        },
      );
    });

    it('should be able to refresh a token and return the tokens in body', async () => {
      const accessToken = 'any_token';
      mockAuthenticationService.refreshToken = jest.fn().mockResolvedValue({
        accessToken,
        signInFlow: SignInFlow.AUTHORIZED,
        secureCookie: false,
      });

      const result = await controller.refreshToken(
        mockExpressResponse as unknown as Response,
      );
      expect(result).toStrictEqual({
        accessToken,
        signInFlow: 'AUTHORIZED',
      });
      expect(mockAuthenticationService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.refreshToken).toHaveBeenCalledWith(
        mockRequest.user,
        'any_refresh_token',
      );
      expect(mockExpressResponse.cookie).toHaveBeenCalledTimes(0);
    });

    it('should be to refresh a token with domain .rarolabs.com.br', async () => {
      process.env.ENV = null;
      const accessToken = 'any_token';
      mockAuthenticationService.refreshToken = jest.fn().mockResolvedValue({
        accessToken,
        signInFlow: SignInFlow.AUTHORIZED,
        secureCookie: true,
      });

      const result = await controller.refreshToken(
        mockExpressResponse as unknown as Response,
      );
      expect(result).toStrictEqual({
        accessToken: undefined,
        signInFlow: 'AUTHORIZED',
      });
      expect(mockAuthenticationService.refreshToken).toHaveBeenCalledTimes(1);
      expect(mockAuthenticationService.refreshToken).toHaveBeenCalledWith(
        mockRequest.user,
        'any_refresh_token',
      );
      expect(mockExpressResponse.cookie).toHaveBeenCalledTimes(1);
      expect(mockExpressResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'any_token',
        {
          domain: '.rarolabs.com.br',
          httpOnly: true,
          sameSite: 'none',
          secure: true,
        },
      );
    });
  });
});
