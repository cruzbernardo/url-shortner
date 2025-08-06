import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ExceptionModel, HttpExceptionModel } from './';
import { Logger } from 'winston';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : exception?.response
        ? HttpStatus.UNPROCESSABLE_ENTITY
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorMessage =
      isHttpException && exception.message
        ? exception.message
        : exception?.message || 'Unhandled error';

    this.logger.error(
      `Exception occurred at ${request.method} ${request.url}`,
      {
        context: 'HttpExceptionFilter',
        status,
        error: errorMessage,
        stack: exception?.stack,
      },
    );

    const responsePayload = isHttpException
      ? new HttpExceptionModel(status, exception, request.url)
      : new ExceptionModel(status, exception, request.url);

    response.status(status).json(responsePayload);
  }
}
