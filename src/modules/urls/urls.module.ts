import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from 'src/database/entities';
import { UrlsService } from './domain/urls.service';
import { EncryptionService } from 'src/shared/utils/encryption.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Url])],
  controllers: [UrlsController],
  providers: [UrlsService, EncryptionService, JwtService],
  exports: [UrlsService],
})
export class UrlsModule {}
