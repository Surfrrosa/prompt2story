import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';

// Mock OpenAI module
vi.mock('openai', () => {
  const mockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({
                user_stories: [{
                  title: 'Test User Story',
                  story: 'As a test user, I want to test functionality',
                  acceptance_criteria: ['Given test conditions', 'When action occurs', 'Then result happens']
                }],
                edge_cases: ['Test edge case']
              })
            }
          }],
          model: 'gpt-4o-mini'
        })
      }
    }
  }));

  return { OpenAI: mockOpenAI };
});

// Import handlers after mocking
const healthzHandler = await import('../../api/healthz');
const generateHandler = await import('../../api/generate-user-stories');

describe('API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test-key-for-integration-tests';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000,https://test.vercel.app';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ALLOWED_ORIGINS;
  });

  describe('Health Check Endpoint', () => {
    it('should return health status with rate limiting headers', async () => {
      const req = createRequest({
        method: 'POST',
        headers: {
          'origin': 'http://localhost:3000',
          'content-type': 'application/json'
        }
      });
      const res = createResponse();

      await healthzHandler.default(req, res);

      expect(res.statusCode).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            ok: true,
            service: 'prompt2story',
            version: 'v1',
            timestamp: expect.any(String)
          }),
          correlationId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: expect.any(String)
        })
      );

      // Check rate limiting headers
      expect(res.getHeader('X-RateLimit-Limit')).toBe('60');
      expect(res.getHeader('X-RateLimit-Remaining')).toBe('59');
      expect(res.getHeader('X-RateLimit-Reset')).toBeDefined();
    });

    it('should handle OPTIONS requests correctly', async () => {
      const req = createRequest({
        method: 'OPTIONS',
        headers: { 'origin': 'http://localhost:3000' }
      });
      const res = createResponse();

      await healthzHandler.default(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getData()).toBe('');
    });

    it('should reject invalid HTTP methods', async () => {
      const req = createRequest({
        method: 'GET',
        headers: { 'origin': 'http://localhost:3000' }
      });
      const res = createResponse();

      await healthzHandler.default(req, res);

      expect(res.statusCode).toBe(405);

      const responseData = JSON.parse(res._getData());
      expect(responseData.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  describe('Generate User Stories Endpoint', () => {
    it('should generate user stories successfully', async () => {
      const req = createRequest({
        method: 'POST',
        headers: {
          'origin': 'http://localhost:3000',
          'content-type': 'application/json'
        },
        body: {
          prompt: 'Create a login feature for mobile app',
          context: 'Mobile application',
          requirements: 'Must be secure and user-friendly'
        }
      });
      const res = createResponse();

      await generateHandler.default(req, res);

      expect(res.statusCode).toBe(200);

      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            user_stories: expect.arrayContaining([
              expect.objectContaining({
                title: expect.any(String),
                story: expect.any(String),
                acceptance_criteria: expect.any(Array)
              })
            ]),
            edge_cases: expect.any(Array)
          }),
          correlationId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: expect.any(String)
        })
      );

      // Check rate limiting headers (generation endpoints have 10/min limit)
      expect(res.getHeader('X-RateLimit-Limit')).toBe('10');
      expect(res.getHeader('X-RateLimit-Remaining')).toBe('9');
    });

    it('should reject requests with missing prompt', async () => {
      const req = createRequest({
        method: 'POST',
        headers: {
          'origin': 'http://localhost:3000',
          'content-type': 'application/json'
        },
        body: {
          context: 'Mobile application'
          // Missing required prompt field
        }
      });
      const res = createResponse();

      await generateHandler.default(req, res);

      expect(res.statusCode).toBe(400);

      const responseData = JSON.parse(res._getData());
      expect(responseData.error.code).toBe('VALIDATION_ERROR');
      expect(responseData.error.message).toContain('validation failed');
      expect(responseData.correlationId).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should reject requests without API key', async () => {
      delete process.env.OPENAI_API_KEY;

      const req = createRequest({
        method: 'POST',
        headers: {
          'origin': 'http://localhost:3000',
          'content-type': 'application/json'
        },
        body: {
          prompt: 'Create a login feature'
        }
      });
      const res = createResponse();

      await generateHandler.default(req, res);

      expect(res.statusCode).toBe(500);

      const responseData = JSON.parse(res._getData());
      expect(responseData.error.code).toBe('CONFIGURATION_ERROR');
    });

    it('should enforce rate limiting', async () => {
      const requests = [];

      // Create 11 requests (limit is 10/min for generation endpoints)
      for (let i = 0; i < 11; i++) {
        const req = createRequest({
          method: 'POST',
          headers: {
            'origin': 'http://localhost:3000',
            'content-type': 'application/json'
          },
          body: {
            prompt: `Test prompt ${i}`
          }
        });
        const res = createResponse();

        requests.push({ req, res });
      }

      // Execute all requests
      for (const { req, res } of requests) {
        await generateHandler.default(req, res);
      }

      // Last request should be rate limited
      const lastResponse = requests[10].res;
      expect(lastResponse.statusCode).toBe(429);

      const responseData = JSON.parse(lastResponse._getData());
      expect(responseData.error.code).toBe('RATE_LIMITED');
      expect(lastResponse.getHeader('Retry-After')).toBeDefined();
    });

    it('should handle CORS properly', async () => {
      const req = createRequest({
        method: 'POST',
        headers: {
          'origin': 'https://test.vercel.app', // Allowed origin
          'content-type': 'application/json'
        },
        body: {
          prompt: 'Test prompt'
        }
      });
      const res = createResponse();

      await generateHandler.default(req, res);

      expect(res.getHeader('Access-Control-Allow-Origin')).toBe('https://test.vercel.app');
      expect(res.getHeader('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should reject disallowed origins', async () => {
      const req = createRequest({
        method: 'POST',
        headers: {
          'origin': 'https://malicious-site.com',
          'content-type': 'application/json'
        },
        body: {
          prompt: 'Test prompt'
        }
      });
      const res = createResponse();

      await generateHandler.default(req, res);

      expect(res.getHeader('Access-Control-Allow-Origin')).toBeUndefined();
      expect(res.getHeader('Access-Control-Allow-Credentials')).toBeUndefined();
    });
  });

  describe('Error Handling Consistency', () => {
    it('should return consistent error structure across endpoints', async () => {
      const req = createRequest({
        method: 'PUT', // Invalid method
        headers: { 'origin': 'http://localhost:3000' }
      });

      // Test both endpoints
      const healthRes = createResponse();
      const generateRes = createResponse();

      await healthzHandler.default(req, healthRes);
      await generateHandler.default(req, generateRes);

      const healthError = JSON.parse(healthRes._getData());
      const generateError = JSON.parse(generateRes._getData());

      // Both should have the same error structure
      const expectedStructure = {
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: expect.any(String),
          details: undefined
        },
        correlationId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
        timestamp: expect.any(String),
        path: expect.any(String)
      };

      expect(healthError).toEqual(expectedStructure);
      expect(generateError).toEqual(expectedStructure);
      expect(healthRes.statusCode).toBe(405);
      expect(generateRes.statusCode).toBe(405);
    });
  });
});