import { applyDecorators } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { HttpExceptionModel, ExceptionModel } from 'src/shared/exceptions';
import { GetUrlModel, ListUrlsModel } from '../models/urls.model';

export function RegisterUrlDocs() {
  return applyDecorators(
    ApiOkResponse({
      type: GetUrlModel,
    }),
    ApiBadRequestResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}
export function ListUrlsDocs() {
  return applyDecorators(
    ApiOkResponse({
      type: ListUrlsModel,
    }),
    ApiUnauthorizedResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}

export function UpdateUrlDocs() {
  return applyDecorators(
    ApiOkResponse({
      type: GetUrlModel,
    }),
    ApiBadRequestResponse({
      type: HttpExceptionModel,
    }),
    ApiUnauthorizedResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}

export function DeleteUrlDocs() {
  return applyDecorators(
    ApiOkResponse({
      description: 'URL deleted successfully',
    }),
    ApiBadRequestResponse({
      type: HttpExceptionModel,
    }),
    ApiUnauthorizedResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}

export function GetUrlByIdDocs() {
  return applyDecorators(
    ApiOkResponse({
      type: GetUrlModel,
    }),
    ApiBadRequestResponse({
      type: HttpExceptionModel,
    }),
    ApiUnauthorizedResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}

export function GetUrlRedirectDocs() {
  return applyDecorators(
    ApiOkResponse({
      description: 'Redirects to original URL',
    }),
    ApiNotFoundResponse({
      type: HttpExceptionModel,
    }),
    ApiBadRequestResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}
