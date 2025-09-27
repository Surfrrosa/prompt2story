import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, getEnv } from './_env.js';
import { rateLimiters } from '../src/lib/rate-limiter.js';
import { ApiResponse, ApiError, ApiErrorCode, logRequest, logError } from '../src/lib/api-response.js';
import formidable from 'formidable';
import fs from 'node:fs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Environment validation
function validateEnvironment(): void {
  const { OPENAI_API_KEY } = getEnv();
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy-key-for-smoke-test') {
    throw new ApiError(
      ApiErrorCode.CONFIGURATION_ERROR,
      'OPENAI_API_KEY not configured properly'
    );
  }
}

async function parseFileUpload(req: VercelRequest): Promise<{ file: any; prompt: string }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      allowEmptyFiles: false,
      minFileSize: 1,
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);

      // Get uploaded file
      const fileField = files.image || files.file || files.design;
      if (!fileField) {
        return reject(new Error('No file uploaded. Use field name "image", "file", or "design".'));
      }

      const uploadedFile = Array.isArray(fileField) ? fileField[0] : fileField;
      if (!uploadedFile?.filepath) {
        return reject(new Error('Invalid file upload.'));
      }

      // Get prompt
      const promptField = fields.prompt || fields.context || '';
      const prompt = Array.isArray(promptField) ? promptField[0] : promptField;

      resolve({ file: uploadedFile, prompt: String(prompt || '') });
    });
  });
}

async function fileToBase64(filePath: string, originalName: string): Promise<string> {
  const buffer = await fs.promises.readFile(filePath);
  const b64 = buffer.toString('base64');

  // Determine MIME type
  let mime = 'application/octet-stream';
  const ext = originalName.toLowerCase();
  if (ext.includes('.png')) mime = 'image/png';
  else if (ext.includes('.jpg') || ext.includes('.jpeg')) mime = 'image/jpeg';
  else if (ext.includes('.pdf')) mime = 'application/pdf';

  return `data:${mime};base64,${b64}`;
}

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
    // Apply rate limiting for upload endpoints
    const rateLimitResult = rateLimiters.upload(req);

    // Set rate limit headers
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(rateLimitResult.resetTime, Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000));
    }

    // Log request
    logRequest(req, apiResponse['correlationId'], { endpoint: 'analyze-design' });

    // Validate environment
    validateEnvironment();
    const env = getEnv();

    let base64Image: string;
    let prompt: string = '';

    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads (new method)
      const { file, prompt: filePrompt } = await parseFileUpload(req);
      base64Image = await fileToBase64(file.filepath, file.originalFilename || '');
      prompt = filePrompt;

      // Clean up temp file
      await fs.promises.unlink(file.filepath).catch(() => {});
    } else {
      // Handle JSON requests (backwards compatibility)
      const { image, prompt: jsonPrompt } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {};

      if (!image || typeof image !== 'string') {
        return apiResponse.error(new ApiError(
          ApiErrorCode.BAD_REQUEST,
          'Provide image file upload or JSON with base64/URL'
        ));
      }

      // Support base64 data URLs (existing functionality)
      if (image.startsWith('data:')) {
        base64Image = image;
      } else {
        return apiResponse.error(new ApiError(
          ApiErrorCode.BAD_REQUEST,
          'JSON mode only supports base64 data URLs'
        ));
      }

      prompt = jsonPrompt || '';
    }

    // Call OpenAI Vision API
    const systemPrompt = 'You are a senior Product Owner and UX analyst. Analyze the ACTUAL CONTENT of the image. Focus only on visible objects, colors, UI elements, text, and layout. Always respond with valid JSON in the exact format specified.';

    const userPrompt = [
      prompt ? `Context: ${prompt}` : '',
      'Analyze this image thoroughly and generate COMPREHENSIVE user stories covering ALL visible elements.',
      '',
      'REQUIREMENTS:',
      '- Generate 5-12 user stories covering every UI component, interaction, and workflow visible',
      '- Each story must have 5-8 detailed acceptance criteria minimum',
      '- Cover normal flows, error scenarios, edge cases, validation, loading states, responsive behavior',
      '- Include stories for: form validation, navigation, data display, user interactions, accessibility, mobile responsiveness',
      '- Examine every button, form field, menu item, card, modal, dropdown, and interactive element',
      '- Consider different user roles, permissions, and states',
      '',
      'Return valid JSON with this exact structure:',
      '{"user_stories":[{"title":"Specific actionable title","story":"As a [specific user], I want [detailed goal] so that [clear benefit]","acceptance_criteria":["Given [specific context], when [detailed action], then [precise outcome]","Given [error scenario], when [action], then [error handling]","Given [edge case], when [action], then [expected behavior]","Given [validation scenario], when [input], then [validation response]","Given [loading state], when [action], then [loading behavior]","..."]}],"edge_cases":["comprehensive edge cases covering all scenarios"]}'
    ].join('\\n');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: base64Image, detail: 'high' } }
            ]
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text().catch(() => '');
      logError(
        new ApiError(ApiErrorCode.LLM_ERROR, `OpenAI API error: ${openaiResponse.status}`),
        apiResponse['correlationId'],
        { openaiError: errorText }
      );
      return apiResponse.error(new ApiError(
        ApiErrorCode.LLM_ERROR,
        `OpenAI API error: ${openaiResponse.status}`
      ));
    }

    const data = await openaiResponse.json() as any;
    const content = data.choices?.[0]?.message?.content ?? '';

    if (!content) {
      return apiResponse.error(new ApiError(
        ApiErrorCode.LLM_ERROR,
        'No content returned from OpenAI'
      ));
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return apiResponse.success(parsed);
    } catch (parseError) {
      logError(
        new ApiError(ApiErrorCode.LLM_ERROR, 'Failed to parse vision analysis response'),
        apiResponse['correlationId'],
        { parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error' }
      );

      // Fallback with actual content analysis
      const fallbackResponse = {
        user_stories: [{
          title: 'Vision Analysis (parsing failed)',
          story: String(content).slice(0, 300).replace(/\\s+/g, ' '),
          acceptance_criteria: [
            'Given an image was provided, when it is analyzed, then user stories reference visible elements',
            'Given the analysis completes, when reviewing results, then they focus on actual image content'
          ]
        }],
        edge_cases: ['JSON parsing failed - returned raw analysis']
      };
      return apiResponse.success(fallbackResponse);
    }

  } catch (error) {
    logError(
      error instanceof Error ? error : new Error('Unknown error in analyze-design'),
      apiResponse['correlationId'],
      { endpoint: 'analyze-design' }
    );
    return apiResponse.error(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
}