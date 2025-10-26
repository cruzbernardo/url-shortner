import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GetUserDocs } from './docs/user.docs';
import { UsersService } from '../domain/users.service';
import { RegisterUserModel } from './models';
import { ResponseGetUserWithoutPassword } from './interfaces';
import { Logger } from 'winston';

@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: UsersService,

    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  @Post('register')
  @GetUserDocs()
  async register(
    @Body() dto: RegisterUserModel,
  ): Promise<ResponseGetUserWithoutPassword> {
    this.logger.info(`Register user request for email: ${dto.email}`, {
      context: UsersController.name,
    });

    const user = await this.userService.register(dto);

    this.logger.info(`User registered successfully with id: ${user.id}`, {
      context: UsersController.name,
    });

    return user;
  }

  @Get(':id')
  @GetUserDocs()
  async get(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
  ): Promise<ResponseGetUserWithoutPassword> {
    this.logger.info(`Get user request for id: ${id}`, {
      context: UsersController.name,
    });

    const user = await this.userService.get(id);

    this.logger.info(`User retrieved successfully for id: ${id}`, {
      context: UsersController.name,
    });

    return user;
  }
}
