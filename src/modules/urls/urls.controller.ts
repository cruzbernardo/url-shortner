import {
  Controller,
  Post,
  HttpCode,
  Body,
  Req,
  Get,
  Query,
  Put,
  Param,
  Delete,
  UseGuards,
  Inject,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type {
  PaginationParams,
  UserRequestWithData,
} from 'src/shared/interfaces';
import { UrlsService } from './domain/urls.service';
import {
  RegisterUrlDocs,
  ListUrlsDocs,
  UpdateUrlDocs,
  DeleteUrlDocs,
  GetUrlByIdDocs,
} from './http/docs';
import { RegisterUrlModel, UpdateUrlModel } from './http/models/urls.model';
import { Public } from 'src/shared/validators/decorators';
import { TokenAuthGuard } from 'src/shared/guards/toke-auth.guard';
import { Logger } from 'winston';

@ApiTags('URLs')
@Controller('urls')
export class UrlsController {
  constructor(
    private readonly urlsService: UrlsService,

    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  @Post()
  @RegisterUrlDocs()
  @HttpCode(201)
  @Public()
  @UseGuards(TokenAuthGuard)
  async register(
    @Body() body: RegisterUrlModel,
    @Req() request: UserRequestWithData,
  ) {
    this.logger.info(
      `POST /urls - Register request from user ${request?.user?.id}`,
      { context: UrlsController.name },
    );

    const baseUrl = `${request.protocol}://${request.get('host')}`;
    const result = await this.urlsService.register(
      body,
      baseUrl,
      request?.user?.id,
    );

    this.logger.info(
      `POST /urls - Register successful for user ${request?.user?.id}, new url id: ${result.id}`,
      { context: UrlsController.name },
    );

    return result;
  }

  @Get()
  @ListUrlsDocs()
  async list(
    @Query() query: PaginationParams,
    @Req() request: UserRequestWithData,
  ) {
    this.logger.info(`GET /urls - List request from user ${request.user.id}`, {
      context: UrlsController.name,
    });

    const result = await this.urlsService.list(query, request.user.id);

    this.logger.info(
      `GET /urls - List completed for user ${request.user.id}, returned ${result.items.length} items`,
      { context: UrlsController.name },
    );

    return result;
  }

  @Put(':id')
  @UpdateUrlDocs()
  async update(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
    @Body() body: UpdateUrlModel,
    @Req() request: UserRequestWithData,
  ) {
    this.logger.info(
      `PUT /urls/${id} - Update request from user ${request.user.id}`,
      { context: UrlsController.name },
    );

    const baseUrl = `${request.protocol}://${request.get('host')}`;
    const result = await this.urlsService.update(
      id,
      body,
      baseUrl,
      request.user.id,
    );

    this.logger.info(
      `PUT /urls/${id} - Update successful for user ${request.user.id}`,
      { context: UrlsController.name },
    );

    return result;
  }

  @Get(':id')
  @GetUrlByIdDocs()
  async getById(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
    @Req() request: UserRequestWithData,
  ) {
    this.logger.info(
      `GET /urls/${id} - GetById requested from user ${request.user.id}`,
      { context: UrlsController.name },
    );

    const result = await this.urlsService.getById(id, request.user.id);

    this.logger.info(
      `GET /urls/${id} - GetById successful for user ${request.user.id}`,
      { context: UrlsController.name },
    );

    return result;
  }

  @Delete(':id')
  @DeleteUrlDocs()
  @HttpCode(204)
  async delete(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 400 })) id: string,
    @Req() request: UserRequestWithData,
  ): Promise<void> {
    this.logger.info(
      `DELETE /urls/${id} - Delete request from user ${request.user.id}`,
      { context: UrlsController.name },
    );

    await this.urlsService.delete(id, request.user.id);

    this.logger.info(
      `DELETE /urls/${id} - Delete successful for user ${request.user.id}`,
      { context: UrlsController.name },
    );
  }
}
