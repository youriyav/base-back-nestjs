/**
 * API Types - Shared between all APIs
 */

// API Response Wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Sorting
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Common Filters
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// HTTP Status Codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
}

// Error Codes
export enum ErrorCode {
  // Auth Errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  TWO_FACTOR_INVALID = 'TWO_FACTOR_INVALID',
  MAGIC_LINK_EXPIRED = 'MAGIC_LINK_EXPIRED',
  MAGIC_LINK_INVALID = 'MAGIC_LINK_INVALID',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Resource Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // Permission Errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',

  // Authorization Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
}
