import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ExceptionModel, HttpExceptionModel } from 'src/shared/exceptions';
import { UserRequestModel } from 'src/shared/models';
import { SignInModel } from '../models';

export function SignInDocs() {
  return applyDecorators(
    ApiOkResponse({
      type: SignInModel,
    }),
    ApiBadRequestResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}

export function GetMeDocs() {
  return applyDecorators(
    ApiOkResponse({
      type: UserRequestModel,
    }),
    ApiUnauthorizedResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}
