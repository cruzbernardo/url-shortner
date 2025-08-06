import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SignInModel } from 'src/modules/authentication/http/models';
import { ExceptionModel, HttpExceptionModel } from 'src/shared/exceptions';
import { GetUserModel } from '../models';

export function signUpDocs() {
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

export function GetUserDocs() {
  return applyDecorators(
    ApiOkResponse({
      type: GetUserModel,
    }),
    ApiUnauthorizedResponse({
      type: HttpExceptionModel,
    }),
    ApiInternalServerErrorResponse({
      type: ExceptionModel,
    }),
  );
}
