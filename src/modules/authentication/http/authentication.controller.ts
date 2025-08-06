import {
  Body,
  Controller,
  HttpCode,
  Post,
  Get,
  Req,
  Inject,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticationService } from '../domain/authentication.service';
import { Public } from 'src/shared/validators/decorators';
import { SignInDocs, GetMeDocs } from './docs';
import { SignIn } from './interfaces';
import { RequestSignInModel } from './models';

import type { PartialUser, UserRequestWithData } from 'src/shared/interfaces';
import { RegisterUserModel } from 'src/modules/users/http/models';
import { Logger } from 'winston';

@ApiTags('Authentication')
@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,

    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  @Post('sign-in')
  @Public()
  @HttpCode(200)
  @SignInDocs()
  async signIn(@Body() body: RequestSignInModel): Promise<SignIn> {
    this.logger.info(`Sign-in attempt for email: ${body.email}`, {
      context: AuthenticationController.name,
    });

    const response = await this.authenticationService.signIn(body);

    this.logger.info(`Sign-in successful for email: ${body.email}`, {
      context: AuthenticationController.name,
    });

    return response;
  }

  @Post('sign-up')
  @Public()
  @HttpCode(201)
  @SignInDocs()
  async signUp(@Body() body: RegisterUserModel): Promise<SignIn> {
    this.logger.info(`Sign-up attempt for email: ${body.email}`, {
      context: AuthenticationController.name,
    });

    const response = await this.authenticationService.signUp(body);

    this.logger.info(`Sign-up successful for email: ${body.email}`, {
      context: AuthenticationController.name,
    });

    return response;
  }

  @Get('me')
  @HttpCode(200)
  @GetMeDocs()
  getMe(@Req() request: UserRequestWithData): PartialUser {
    this.logger.info(`Fetching info for user: ${request.user.id}`, {
      context: AuthenticationController.name,
    });

    return request.user;
  }
}
