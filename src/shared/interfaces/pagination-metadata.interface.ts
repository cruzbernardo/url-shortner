import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { OrderENUM } from '../constants';

export interface PaginationMetadata {
  page: number;
  quantityResults: number;
  quantityTotalItems: number;
  quantityTotalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type BuildPaginationMetadataInput = {
  page: number;
  count: number;
  take: number;
  resultsAmount: number;
};

export interface PaginationParams {
  page?: number;
  itemsPerPage?: number;
  order?: OrderENUM;
}

export interface PaginationResponse<T> {
  meta: PaginationMetadata;
  items: T[];
}

export type ApplyDefaultPaginationQueryOptionsInput<T extends ObjectLiteral> = {
  queryBuilder: SelectQueryBuilder<T>;
  skip: number;
  take: number;
  orderProperty?: string;
  orderBy?: OrderENUM;
  forcePagination?: boolean;
};
