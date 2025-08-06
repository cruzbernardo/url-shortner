import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IEnvironmentVariables } from 'src/config/enviorment-config.validation';
import { Logger } from 'winston';

@Injectable()
export class TokenAuthGuard implements CanActivate {
  private readonly JWT_SECRET: string;

  constructor(
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
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    try {
      if (authHeader) {
        const jwtToken = authHeader.replace('Bearer ', '');
        const payload = this.jwt.verify(jwtToken, {
          secret: this.JWT_SECRET,
        });

        request['user'] = payload;
        return true;
      }

      return true;
    } catch (error) {
      this.logger.error(`Token verification failed`, {
        context: TokenAuthGuard.name,
        error: error?.message,
        stack: error?.stack,
      });
      throw new UnauthorizedException();
    }
  }
}
