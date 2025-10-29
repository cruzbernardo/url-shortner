import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const contextType = context.getType();

    // Skip throttling for RabbitMQ (RPC) and WebSocket contexts
    if (
      contextType === 'rpc' ||
      contextType === 'ws' ||
      (contextType as string) === 'rabbitmq'
    ) {
      return true;
    }

    // Only apply throttling for HTTP contexts
    if (contextType === 'http') {
      return super.canActivate(context);
    }

    // For unknown context types, allow by default
    return true;
  }
}
