export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
  errors?: Record<string, string[]>;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}
