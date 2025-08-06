import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import {
  DEFAULT_PAGINATION_ORDER,
  DEFAULT_PAGINATION_PAGE,
} from '../constants';
import {
  ApplyDefaultPaginationQueryOptionsInput,
  BuildPaginationMetadataInput,
  PaginationMetadata,
} from '../interfaces';

import * as requestIp from 'request-ip';

export class Utils {
  static getNewDate(value?: number | string | Date) {
    return value ? new Date(value) : new Date();
  }

  static buildPaginationMetadata = ({
    count,
    page,
    take,
    resultsAmount,
  }: BuildPaginationMetadataInput): PaginationMetadata => {
    const quantityTotalPages =
      Math.ceil(count / take) || DEFAULT_PAGINATION_PAGE;

    return {
      page,
      quantityTotalPages,
      quantityResults: resultsAmount,
      quantityTotalItems: count,
      hasPreviousPage: page > DEFAULT_PAGINATION_PAGE,
      hasNextPage: page < quantityTotalPages,
    };
  };

  static applyDefaultPaginationQueryOptions = <T extends ObjectLiteral>({
    queryBuilder,
    skip,
    take,
    orderProperty,
    orderBy = DEFAULT_PAGINATION_ORDER,
    forcePagination = false,
  }: ApplyDefaultPaginationQueryOptionsInput<T>): SelectQueryBuilder<T> => {
    queryBuilder.distinct(true);

    if (orderProperty) {
      queryBuilder.orderBy(orderProperty, orderBy);
    }

    queryBuilder.skip(skip).take(take);

    if (forcePagination) {
      queryBuilder.offset(skip).limit(take);
    }

    return queryBuilder;
  };

  static getClientIpAddress = (request) => {
    return requestIp.getClientIp(request);
  };
}
