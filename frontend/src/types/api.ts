export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<T> & {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ApiError = {
  statusCode: number;
  message: string;
  isNetworkError: boolean;
};
