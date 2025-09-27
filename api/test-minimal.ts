import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_env.js';
import { rateLimiters } from '../src/lib/rate-limiter.js';
import { ApiResponse, ApiError, ApiErrorCode } from '../src/lib/api-response.js';

// Force Node.js runtime
export const config = {
  runtime: 'nodejs',
};

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

    return apiResponse.success({
      test: 'minimal_handler',
      result: 'SUCCESS',
      runtime: 'nodejs',
      method: req.method,
      has_body: !!req.body
    });
  } catch (error) {
    return apiResponse.error(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
}