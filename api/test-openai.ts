import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, getEnv } from './_env.js';
import { rateLimiters } from '../src/lib/rate-limiter.js';
import { ApiResponse, ApiError, ApiErrorCode, logRequest, logError } from '../src/lib/api-response.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiResponse = new ApiResponse(req, res);
  const origin = (req.headers.origin as string) ?? null;

  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return apiResponse.error(new ApiError(
      ApiErrorCode.METHOD_NOT_ALLOWED,
      'Only POST method is allowed'
    ));
  }

  try {
    // Apply rate limiting for test endpoints
    const rateLimitResult = rateLimiters.standard(req);

    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(rateLimitResult.resetTime, Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000));
    }

    logRequest(req, apiResponse['correlationId'], { endpoint: 'test-openai' });

    const env = getEnv();

    // Test 1: Check if we have API key - NEVER expose actual key values
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'dummy-key-for-smoke-test') {
      return apiResponse.error(new ApiError(
        ApiErrorCode.CONFIGURATION_ERROR,
        'OPENAI_API_KEY environment variable is required'
      ));
    }

    // Test 2: Try to import and use OpenAI
    try {
      const openaiModule = await import('openai');
      const OpenAI = openaiModule.OpenAI;

      if (!OpenAI) {
        return apiResponse.error(new ApiError(
          ApiErrorCode.INTERNAL_ERROR,
          'OpenAI class not found in module'
        ));
      }

      // Test 3: Try to create OpenAI instance and make test call
      const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });

      // Test 4: Try a simple text completion
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Say 'OpenAI test successful'"
          }
        ],
        max_tokens: 10
      });

      return apiResponse.success({
        test: 'openai_api_connection',
        result: 'SUCCESS',
        model_used: response.model,
        response_preview: response.choices[0]?.message?.content?.substring(0, 50)
      });

    } catch (openaiError) {
      logError(
        openaiError instanceof Error ? openaiError : new Error('OpenAI API test failed'),
        apiResponse['correlationId'],
        { test: 'openai_api_connection' }
      );
      return apiResponse.error(new ApiError(
        ApiErrorCode.LLM_ERROR,
        'OpenAI API test failed'
      ));
    }

  } catch (error) {
    logError(
      error instanceof Error ? error : new Error('Unknown error in test-openai'),
      apiResponse['correlationId'],
      { endpoint: 'test-openai' }
    );
    return apiResponse.error(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
}