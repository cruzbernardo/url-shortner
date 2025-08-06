import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { DEFAULT_PAGINATION_PAGE, DEFAULT_PAGINATION_TAKE } from '../constants';
import { PaginationMetadata, PaginationParams } from '../interfaces';

export class PaginationModel implements PaginationParams {
  @ApiPropertyOptional({
    type: 'integer',
    description: 'Page number',
    example: 1,
    default: DEFAULT_PAGINATION_PAGE,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    type: 'integer',
    description: 'Number of items per page',
    minimum: 1,
    maximum: DEFAULT_PAGINATION_TAKE,
    default: DEFAULT_PAGINATION_TAKE,
    example: 10,
  })
  @IsOptional()
  itemsPerPage?: number;
}

export class PaginationMetadataModel implements PaginationMetadata {
  @ApiProperty()
  page: number;

  @ApiProperty()
  quantityResults: number;

  @ApiProperty()
  quantityTotalItems: number;

  @ApiProperty()
  quantityTotalPages: number;

  @ApiProperty()
  hasPreviousPage: boolean;

  @ApiProperty()
  hasNextPage: boolean;
}
