import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import type { PaginationMetadata } from 'src/shared/interfaces';
import {
  RequestRegisterUrl,
  RequestUpdateUrl,
  ResponseGetUrl,
  ResponseListUrls,
} from '../interfaces/urls.interface';
import { PaginationMetadataModel } from 'src/shared/models/pagination.model';

export class RegisterUrlModel implements RequestRegisterUrl {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  origin: string;
}

export class UpdateUrlModel implements RequestUpdateUrl {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  count?: number;
}

export class GetUrlModel implements ResponseGetUrl {
  @ApiProperty()
  id: string;

  @ApiProperty()
  origin: string;

  @ApiProperty()
  url: string;

  @ApiProperty()
  count: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  deletedAt: Date;

  json(): ResponseGetUrl {
    return {
      id: this.id,
      origin: this.origin,
      url: this.url,
      count: this.count,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }
}

export class ListUrlsModel implements ResponseListUrls {
  @ApiProperty({
    type: () => PaginationMetadataModel,
    description: 'Pagination metadata',
  })
  meta: PaginationMetadata;

  @ApiProperty({
    type: () => [GetUrlModel],
    description: 'List users returned in the search',
  })
  items: ResponseGetUrl[];
}
