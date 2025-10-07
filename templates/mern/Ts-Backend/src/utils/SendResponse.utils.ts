import { Response } from 'express';

export type ErrorType = {
  // Basic error info
  message: string;
  name?: string;
  
  // HTTP related
  status?: number;
  statusCode?: number;
  
  // Application specific
  code?: string | number;
  
  // Error chaining
  cause?: Error | ErrorType | unknown;
  
  // Debugging
  stack?: string;
  
  // For validation errors
  errors?: Array<{field?: string; message: string}> | Record<string, string[]>;
  
  // Allow for any additional properties
  [key: string]: unknown;
}

export class AppError extends Error implements Omit<ErrorType, 'message'> {
  name: string = 'AppError';
  status: number;
  code?: string | number;
  errors?: Array<{field?: string; message: string}> | Record<string, string[]>;
  cause?: Error | ErrorType | unknown;
  [key: string]: unknown;

  constructor(message: string, options?: Partial<ErrorType>) {
    super(message);
    
    Object.assign(this, options);
    this.status = options?.status || options?.statusCode || 500;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    const errorObject: ErrorType = {
      message: this.message,
      name: this.name,
    };

    // Add all other properties
    Object.entries(this).forEach(([key, value]) => {
      if (key !== 'message' && key !== 'name') {
        errorObject[key] = value;
      }
    });

    return errorObject;
  }
}

export class SendResponse {
  static success(res: Response, message: string, data: unknown, status = 200) {
    return res.status(status).json({
      success: true,
      message,
      data,
    });
  }

  static error(res: Response, messageOrError: string | ErrorType | Error, status = 500) {
    // Handle when first argument is an error object
    if (typeof messageOrError !== 'string') {
      const error = messageOrError;
      const statusCode = 
        (error as ErrorType).status || 
        (error as ErrorType).statusCode || 
        status;
      
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'An error occurred',
        error: error instanceof AppError ? error.toJSON() : error,
      });
    }
    
    // Handle string message
    return res.status(status).json({
      success: false,
      message: messageOrError,
    });
  }
}