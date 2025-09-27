import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_env.js';
import { rateLimiters } from '../src/lib/rate-limiter.js';
import { ApiResponse, ApiError, ApiErrorCode, logRequest } from '../src/lib/api-response.js';

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
    // Apply rate limiting
    const rateLimitResult = rateLimiters.standard(req);

    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(rateLimitResult.resetTime, Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000));
    }

    logRequest(req, apiResponse['correlationId'], { endpoint: 'submit-feedback' });

    // TODO: Implement feedback storage (database, email, etc.)
    console.log('Feedback received:', req.body);

    return apiResponse.success({
      message: 'Feedback received successfully',
      feedback_id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    });
  } catch (error) {
    return apiResponse.error(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
}