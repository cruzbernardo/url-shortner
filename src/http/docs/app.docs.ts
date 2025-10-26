import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { HttpExceptionModel, ExceptionModel } from 'src/shared/exceptions';

export function RedirectToOriginalUrlDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Redirect to original URL',
      description:
        'Redirects to the original URL based on the short code and increments the access counter',
    }),
    ApiParam({
      name: 'shortCode',
      description: 'The shortened URL code (6 characters)',
      example: 'aZbKq7',
    }),
    ApiOkResponse({
      description: 'Redirects to original URL (HTTP 302)',
    }),
    ApiNotFoundResponse({
      type: HttpExceptionModel,
      description: 'Short URL not found',
    }),
    ApiBadRequestResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}