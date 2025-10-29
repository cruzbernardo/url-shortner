import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ClsService } from 'nestjs-cls';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: ClsService,
    @Inject('winston') private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextType = context.getType();

    // Skip trace interception for non-HTTP contexts (RabbitMQ, WebSockets, etc.)
    if (contextType !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    const traceId = request.headers['x-trace-id']?.toString() || uuidv4();
    const ip =
      request.headers['x-forwarded-for']?.toString() ||
      request.ip ||
      request.socket.remoteAddress ||
      'unknown';

    return this.cls.run(() => {
      this.cls.set('x-trace-id', traceId);
      this.cls.set('ip', ip);

      this.logger.info(`Incoming request: ${request.method} ${request.url}`, {
        traceId,
        ip,
        context: TraceInterceptor.name,
      });

      return next.handle().pipe(
        tap({
          next: () => {
            this.logger.info(
              `Request completed: ${request.method} ${request.url}`,
              {
                traceId,
                context: TraceInterceptor.name,
              },
            );
          },
          error: (err) => {
            this.logger.error(
              `Request failed: ${request.method} ${request.url}`,
              {
                traceId,
                error: err.message,
                stack: err.stack,
                context: TraceInterceptor.name,
              },
            );
          },
        }),
      );
    });
  }
}
