import { Inject, Injectable } from '@nestjs/common';
import { User } from 'src/database/entities';
import { RequestSignIn, SignIn } from '../http/interfaces';
import { EncryptionService } from 'src/shared/utils/encryption.service';
import { emailOrPasswordInvalidException } from '../http/exceptions';
import { timingSafeEqual } from 'crypto';
import { PartialUser } from 'src/shared/interfaces';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IEnvironmentVariables } from 'src/config/enviorment-config.validation';
import { UsersService } from 'src/modules/users/domain/users.service';
import { RequestRegisterUser } from 'src/modules/users/http/interfaces';
import { Logger } from 'winston';

@Injectable()
export class AuthenticationService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRIATION_TIME: string;

  constructor(
    @Inject(UsersService)
    private readonly userService: UsersService,

    @Inject(EncryptionService)
    private readonly encryptionService: EncryptionService,

    @Inject(ConfigService)
    private readonly configService: ConfigService<IEnvironmentVariables>,

    @Inject(JwtService)
    private readonly jwt: JwtService,

    @Inject('winston')
    private readonly logger: Logger,
  ) {
    this.JWT_SECRET = this.configService.getOrThrow('JWT_SECRET', {
      infer: true,
    });
    this.JWT_EXPIRIATION_TIME = this.configService.getOrThrow(
      'JWT_EXPIRATION_TIME',
      {
        infer: true,
      },
    );
  }

  async login(user: User): Promise<SignIn> {
    return this.jwtFactory(user, this.JWT_SECRET, this.JWT_EXPIRIATION_TIME);
  }

  async signIn({ email, password }: RequestSignIn): Promise<SignIn> {
    const user = await this.userService.findOneByEmail(email);

    if (!user) {
      this.logger.warn(`Sign-in failed: email not found - ${email}`, {
        context: AuthenticationService.name,
      });
      throw new emailOrPasswordInvalidException();
    }

    const receivedHash = this.encryptionService.encprypt(password);

    if (
      !timingSafeEqual(Buffer.from(receivedHash), Buffer.from(user.password))
    ) {
      this.logger.warn(
        `Sign-in failed: invalid password for email - ${email}`,
        {
          context: AuthenticationService.name,
        },
      );
      throw new emailOrPasswordInvalidException();
    }

    this.logger.info(`User signed in successfully: ${email}`, {
      context: AuthenticationService.name,
    });

    return this.login(user);
  }

  async signUp(data: RequestRegisterUser): Promise<SignIn> {
    const existingUser = await this.userService.findOneByEmail(data.email);
    if (existingUser) {
      this.logger.warn(`Sign-up failed: email already in use - ${data.email}`, {
        context: AuthenticationService.name,
      });
      throw new emailOrPasswordInvalidException();
    }

    const hashedPassword = this.encryptionService.encprypt(data.password);
    data.password = hashedPassword;

    const savedNewUser = await this.userService.register(data);

    this.logger.info(`User registered and signed in: ${data.email}`, {
      context: AuthenticationService.name,
    });

    return this.login(savedNewUser as User);
  }

  private jwtFactory(user: User, jwtSecret: string, jwtExpirationTime: string) {
    const payload: PartialUser = {
      id: user.id,
      name: user.name,
    };

    return {
      accessToken: this.jwt.sign(payload as any, {
        secret: jwtSecret,
        expiresIn: jwtExpirationTime as any,
      }),
    };
  }
}
