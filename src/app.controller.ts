import { Controller, Get, Param, Res, Inject, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppService } from './app.service';
import { UrlsService } from './modules/urls/domain/urls.service';
import { Public } from './shared/validators/decorators';
import { RedirectToOriginalUrlDocs } from './http/docs';
import { Logger } from 'winston';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly urlsService: UrlsService,

    @Inject('winston')
    private readonly logger: Logger,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('r/:shortCode')
  @Public()
  @RedirectToOriginalUrlDocs()
  async redirect(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.logger.info(
      `GET /r/${shortCode} - Redirect requested for short code: ${shortCode}`,
      { context: AppController.name },
    );

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const origin = await this.urlsService.getByShortCode(
      shortCode,
      ip,
      userAgent,
    );

    this.logger.info(`GET /r/${shortCode} - Redirecting to origin: ${origin}`, {
      context: AppController.name,
    });

    return res.redirect(origin);
  }
}
