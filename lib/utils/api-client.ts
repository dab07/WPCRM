// API client utilities with validation
import { ValidationError } from './type-validation';
import type { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '../types/api/responses';

// HTTP client configuration
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
  validateResponses?: boolean;
}

// HTTP client error
export class ApiClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// Generic API client with validation
export class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      validateResponses: config.validateResponses ?? true
    };
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    validator?: (data: unknown) => T
  ): Promise<T> {
    const fullUrl = this.config.baseUrl + url;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...options.headers
      }
    };

    // Add timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await fetch(fullUrl, requestOptions);
      clearTimeout(timeoutId);

      let data: unknown;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new ApiClientError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        );
      }

      // Validate response if validator provided and validation enabled
      if (this.config.validateResponses && validator) {
        try {
          return validator(data);
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new ApiClientError(
              `Response validation failed: ${error.message}`,
              response.status,
              data
            );
          }
          throw error;
        }
      }

      return data as T;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError(`Request timeout after ${this.config.timeout}ms`);
      }
      
      throw new ApiClientError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  async get<T>(url: string, validator?: (data: unknown) => T): Promise<T> {
    return this.makeRequest(url, { method: 'GET' }, validator);
  }

  async post<T>(
    url: string, 
    body?: unknown, 
    validator?: (data: unknown) => T
  ): Promise<T> {
    const requestOptions: RequestInit = {
      method: 'POST'
    };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }
    
    return this.makeRequest(url, requestOptions, validator);
  }

  async put<T>(
    url: string, 
    body?: unknown, 
    validator?: (data: unknown) => T
  ): Promise<T> {
    const requestOptions: RequestInit = {
      method: 'PUT'
    };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }
    
    return this.makeRequest(url, requestOptions, validator);
  }

  async patch<T>(
    url: string, 
    body?: unknown, 
    validator?: (data: unknown) => T
  ): Promise<T> {
    const requestOptions: RequestInit = {
      method: 'PATCH'
    };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }
    
    return this.makeRequest(url, requestOptions, validator);
  }

  async delete<T>(url: string, validator?: (data: unknown) => T): Promise<T> {
    return this.makeRequest(url, { method: 'DELETE' }, validator);
  }
}

// Utility functions for common API patterns
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> => {
  if (success) {
    return {
      success: true,
      data: data!,
      message
    } as ApiSuccessResponse<T>;
  } else {
    return {
      success: false,
      error: error || 'Unknown error'
    } as ApiErrorResponse;
  }
};

export const handleApiError = (error: unknown): ApiErrorResponse => {
  if (error instanceof ApiClientError) {
    const details = error.response && error.status ? 
      { response: error.response, status: error.status } : 
      undefined;
    
    return {
      success: false,
      error: error.message,
      ...(details && { details })
    };
  }
  
  if (error instanceof ValidationError) {
    const details = error.field ? { field: error.field } : undefined;
    
    return {
      success: false,
      error: `Validation error: ${error.message}`,
      ...(details && { details })
    };
  }
  
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message
    };
  }
  
  return {
    success: false,
    error: 'Unknown error occurred'
  };
};

// Type-safe fetch wrapper with validation
export const safeFetch = async <T>(
  url: string,
  _options: RequestInit = {},
  validator?: (data: unknown) => T
): Promise<ApiResponse<T>> => {
  try {
    const client = new ApiClient();
    // Use a public method instead of private makeRequest
    const data = await client.get(url, validator);
    return createApiResponse(true, data);
  } catch (error) {
    return handleApiError(error);
  }
};

// Supabase response wrapper with validation
export const validateSupabaseResponse = <T>(
  response: { data: T | null; error: any },
  validator?: (data: unknown) => T
): ApiResponse<T> => {
  if (response.error) {
    return {
      success: false,
      error: response.error.message || 'Database error'
    };
  }

  if (response.data === null) {
    return {
      success: false,
      error: 'No data returned'
    };
  }

  try {
    const validatedData = validator ? validator(response.data) : response.data;
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    return handleApiError(error);
  }
};

// External API response wrapper
export const validateExternalApiResponse = <T>(
  response: unknown,
  validator: (data: unknown) => T
): ApiResponse<T> => {
  try {
    const validatedData = validator(response);
    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    return handleApiError(error);
  }
};