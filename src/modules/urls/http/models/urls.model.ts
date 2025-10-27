import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { PaginationMetadata } from 'src/shared/interfaces';
import {
  RequestRegisterUrl,
  RequestUpdateUrl,
  ResponseGetUrl,
  ResponseListUrls,
} from '../interfaces/urls.interface';
import { PaginationMetadataModel } from 'src/shared/models/pagination.model';
import { IsSafeUrl } from '../validators';

export class RegisterUrlModel implements RequestRegisterUrl {
  @ApiProperty({
    description: 'URL original que será encurtada',
    example: 'https://www.exemplo.com.br/pagina-muito-longa',
  })
  @IsNotEmpty({ message: 'A URL de origem é obrigatória.' })
  @IsString({ message: 'A URL de origem deve ser uma string.' })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'A URL de origem deve ser uma URL válida (http ou https).' },
  )
  @MaxLength(2048, {
    message: 'A URL de origem não pode ter mais de 2048 caracteres.',
  })
  @IsSafeUrl({
    message:
      'A URL fornecida não é válida ou contém elementos inseguros. Use apenas URLs HTTP/HTTPS públicas.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  origin: string;
}

export class UpdateUrlModel implements RequestUpdateUrl {
  @ApiPropertyOptional({
    description: 'Nova URL original',
    example: 'https://www.exemplo.com.br/nova-pagina',
  })
  @IsOptional()
  @IsString({ message: 'A URL de origem deve ser uma string.' })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
    },
    { message: 'A URL de origem deve ser uma URL válida (http ou https).' },
  )
  @MaxLength(2048, {
    message: 'A URL de origem não pode ter mais de 2048 caracteres.',
  })
  @IsSafeUrl({
    message:
      'A URL fornecida não é válida ou contém elementos inseguros. Use apenas URLs HTTP/HTTPS públicas.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  origin?: string;

  @ApiPropertyOptional({
    description: 'URL encurtada completa (gerada automaticamente)',
  })
  @IsOptional()
  @IsString({ message: 'A URL deve ser uma string.' })
  @IsUrl({}, { message: 'A URL deve ser uma URL válida.' })
  url?: string;

  @ApiPropertyOptional({
    description: 'Contador de acessos',
    example: 0,
  })
  @IsOptional()
  @IsInt({ message: 'O contador deve ser um número inteiro.' })
  @Min(0, { message: 'O contador não pode ser negativo.' })
  count?: number;
}

export class GetUrlModel implements ResponseGetUrl {
  @ApiProperty()
  id: string;

  @ApiProperty()
  origin: string;

  @ApiProperty()
  shortCode: string;

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
      shortCode: this.shortCode,
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
