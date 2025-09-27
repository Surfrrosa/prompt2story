/**
 * Standardized API response utilities
 * Provides consistent error shapes, correlation IDs, and response helpers
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// Generate correlation ID for request tracing
export function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Extract correlation ID from request headers or generate new one
export function getCorrelationId(req: VercelRequest): string {
  const existing = req.headers['x-correlation-id'] as string;
  return existing || generateCorrelationId();
}

// Standard error response schema
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(), // Error code for programmatic handling
    message: z.string(), // Human-readable error message
    details: z.record(z.any()).optional(), // Additional error context
  }),
  correlationId: z.string(),
  timestamp: z.string(),
  path: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// Standard success response wrapper
export const SuccessResponseSchema = z.object({
  data: z.any(),
  correlationId: z.string(),
  timestamp: z.string(),
});

export type SuccessResponse<T = any> = {
  data: T;
  correlationId: string;
  timestamp: string;
};

// Error types for consistent error handling
export enum ApiErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  RATE_LIMITED = 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  LLM_ERROR = 'LLM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

// HTTP status code mapping
const ERROR_STATUS_MAP: Record<ApiErrorCode, number> = {
  [ApiErrorCode.BAD_REQUEST]: 400,
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.METHOD_NOT_ALLOWED]: 405,
  [ApiErrorCode.RATE_LIMITED]: 429,
  [ApiErrorCode.PAYLOAD_TOO_LARGE]: 413,
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.LLM_ERROR]: 502,
  [ApiErrorCode.CONFIGURATION_ERROR]: 500,
};

// Custom API Error class
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get statusCode(): number {
    return ERROR_STATUS_MAP[this.code];
  }
}

// Response helper functions
export class ApiResponse {
  constructor(
    private req: VercelRequest,
    private res: VercelResponse,
    private correlationId: string = getCorrelationId(req)
  ) {}

  // Send success response
  success<T>(data: T, statusCode = 200): void {
    const response: SuccessResponse<T> = {
      data,
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
    };

    this.res.status(statusCode).json(response);
  }

  // Send error response
  error(error: ApiError | Error, statusCode?: number): void {
    let apiError: ApiError;

    if (error instanceof ApiError) {
      apiError = error;
    } else {
      // Convert generic errors to API errors
      apiError = new ApiError(
        ApiErrorCode.INTERNAL_ERROR,
        error.message || 'An unexpected error occurred'
      );
    }

    const response: ErrorResponse = {
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
      },
      correlationId: this.correlationId,
      timestamp: new Date().toISOString(),
      path: this.req.url,
    };

    const status = statusCode || apiError.statusCode;
    this.res.status(status).json(response);
  }

  // Send rate limit exceeded response
  rateLimited(resetTime: number, retryAfter: number): void {
    const error = new ApiError(
      ApiErrorCode.RATE_LIMITED,
      'Rate limit exceeded. Please try again later.',
      {
        resetTime,
        retryAfter,
      }
    );

    this.error(error);
  }

  // Send validation error response
  validationError(details: Record<string, any>): void {
    const error = new ApiError(
      ApiErrorCode.VALIDATION_ERROR,
      'Request validation failed',
      details
    );

    this.error(error);
  }
}

// Helper to safely parse JSON request body with validation
export async function safeParseJsonBody<T>(
  req: VercelRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
  try {
    // Parse JSON body
    let body: any;

    if (req.body) {
      // Body already parsed (common in Vercel)
      body = req.body;
    } else {
      // Parse raw body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks).toString();

      if (!rawBody.trim()) {
        return {
          success: false,
          error: new ApiError(ApiErrorCode.BAD_REQUEST, 'Request body is required')
        };
      }

      try {
        body = JSON.parse(rawBody);
      } catch {
        return {
          success: false,
          error: new ApiError(ApiErrorCode.BAD_REQUEST, 'Invalid JSON in request body')
        };
      }
    }

    // Validate with schema
    const result = schema.safeParse(body);

    if (!result.success) {
      const details = result.error.issues.reduce((acc, issue) => {
        const path = issue.path.join('.');
        acc[path] = issue.message;
        return acc;
      }, {} as Record<string, string>);

      return {
        success: false,
        error: new ApiError(ApiErrorCode.VALIDATION_ERROR, 'Request validation failed', details)
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: new ApiError(
        ApiErrorCode.INTERNAL_ERROR,
        error instanceof Error ? error.message : 'Failed to parse request body'
      )
    };
  }
}

// Structured logging helper (redacts sensitive data)
export function logRequest(
  req: VercelRequest,
  correlationId: string,
  additionalData?: Record<string, any>
): void {
  const logData = {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  console.log(JSON.stringify(logData));
}

export function logError(
  error: Error | ApiError,
  correlationId: string,
  additionalData?: Record<string, any>
): void {
  const logData = {
    correlationId,
    error: {
      name: error.name,
      message: error.message,
      code: error instanceof ApiError ? error.code : 'UNKNOWN',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  console.error(JSON.stringify(logData));
}