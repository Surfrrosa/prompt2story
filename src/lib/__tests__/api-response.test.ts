import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiResponse, ApiError, ApiErrorCode, generateCorrelationId, getCorrelationId } from '../api-response.js';

// Mock VercelRequest and VercelResponse
const mockReq = {
  headers: {},
  method: 'POST',
  url: '/api/test'
} as any;

const mockRes = {
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn().mockReturnThis(),
} as any;

describe('API Response Infrastructure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Correlation ID Generation', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should extract correlation ID from request headers', () => {
      const existingId = 'req_test_12345';
      const reqWithId = { ...mockReq, headers: { 'x-correlation-id': existingId } };

      expect(getCorrelationId(reqWithId)).toBe(existingId);
    });

    it('should generate new correlation ID when none exists', () => {
      const reqWithoutId = { ...mockReq, headers: {} };
      const id = getCorrelationId(reqWithoutId);

      expect(id).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });

  describe('ApiError Class', () => {
    it('should create API error with correct properties', () => {
      const error = new ApiError(
        ApiErrorCode.BAD_REQUEST,
        'Invalid input',
        { field: 'email' }
      );

      expect(error.code).toBe(ApiErrorCode.BAD_REQUEST);
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ApiError');
    });

    it('should map error codes to correct status codes', () => {
      const testCases = [
        { code: ApiErrorCode.BAD_REQUEST, status: 400 },
        { code: ApiErrorCode.UNAUTHORIZED, status: 401 },
        { code: ApiErrorCode.FORBIDDEN, status: 403 },
        { code: ApiErrorCode.NOT_FOUND, status: 404 },
        { code: ApiErrorCode.METHOD_NOT_ALLOWED, status: 405 },
        { code: ApiErrorCode.RATE_LIMITED, status: 429 },
        { code: ApiErrorCode.INTERNAL_ERROR, status: 500 },
        { code: ApiErrorCode.LLM_ERROR, status: 502 },
      ];

      testCases.forEach(({ code, status }) => {
        const error = new ApiError(code, 'Test message');
        expect(error.statusCode).toBe(status);
      });
    });
  });

  describe('ApiResponse Class', () => {
    it('should send success response with correct structure', () => {
      const apiResponse = new ApiResponse(mockReq, mockRes);
      const testData = { message: 'Success' };

      apiResponse.success(testData, 201);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: testData,
          correlationId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        })
      );
    });

    it('should send error response with correct structure', () => {
      const apiResponse = new ApiResponse(mockReq, mockRes);
      const error = new ApiError(ApiErrorCode.BAD_REQUEST, 'Invalid data');

      apiResponse.error(error);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid data',
            details: undefined
          },
          correlationId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          path: '/api/test'
        })
      );
    });

    it('should convert generic Error to ApiError', () => {
      const apiResponse = new ApiResponse(mockReq, mockRes);
      const genericError = new Error('Something went wrong');

      apiResponse.error(genericError);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong',
            details: undefined
          }
        })
      );
    });

    it('should send rate limited response with correct headers', () => {
      const apiResponse = new ApiResponse(mockReq, mockRes);
      const resetTime = Date.now() + 60000;
      const retryAfter = 60;

      apiResponse.rateLimited(resetTime, retryAfter);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: 'RATE_LIMITED',
            message: 'Rate limit exceeded. Please try again later.',
            details: {
              resetTime,
              retryAfter
            }
          }
        })
      );
    });

    it('should send validation error response', () => {
      const apiResponse = new ApiResponse(mockReq, mockRes);
      const details = { email: 'Invalid email format', age: 'Must be a number' };

      apiResponse.validationError(details);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details
          }
        })
      );
    });
  });
});