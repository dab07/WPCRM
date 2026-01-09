import type { BaseService, ServiceError, QueryOptions } from '../../types/services/base';

export abstract class AbstractBaseService<T> implements BaseService<T> {
  protected abstract tableName: string;

  abstract list(options?: QueryOptions): Promise<T[]>;
  abstract get(id: string): Promise<T>;
  abstract create(data: Partial<T>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<void>;

  protected createError(code: string, message: string, details?: any): ServiceError {
    return {
      code,
      message,
      details,
    };
  }

  protected handleError(error: any): never {
    if (error.code && error.message) {
      throw error;
    }
    
    throw this.createError(
      'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error
    );
  }
}