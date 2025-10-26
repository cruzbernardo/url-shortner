import { PaginationResponse } from 'src/shared/interfaces';

export interface RequestRegisterUrl {
  origin: string;
}

export interface RequestUpdateUrl {
  origin?: string;
  url?: string;
  count?: number;
}

export interface ResponseGetUrl {
  id: string;
  origin?: string;
  shortCode?: string;
  url?: string;
  count?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export type ResponseListUrls = PaginationResponse<ResponseGetUrl>;
