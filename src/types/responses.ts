import { TValidationResponse } from "./validators";

export type TMutationResult<T> = {
  success: boolean;
  result?: T;
  errors?: TValidationResponse;
};

export type PaginatedQueryResult<T> = {
  paginatorInfo: {
    total: number;
    count: number;
    page: number;
    perPage: number;
  },
  data: T[],
};
