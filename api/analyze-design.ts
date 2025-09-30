import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, getEnv } from './_env.js';
import { rateLimiters } from '../src/lib/rate-limiter.js';
import { ApiResponse, ApiError, ApiErrorCode, logRequest, logError } from '../src/lib/api-response.js';
import formidable from 'formidable';
import fs from 'node:fs';
import pdfParse from 'pdf-parse';
import OpenAI from 'openai';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

// Supported file types
const IMAGE_FORMATS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const DOCUMENT_FORMATS = ['.pdf', '.txt', '.md'];

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

function getFileExtension(filename: string): string {
  return filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
}

function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return IMAGE_FORMATS.includes(ext);
}

function isDocumentFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return DOCUMENT_FORMATS.includes(ext);
}

async function extractTextFromFile(filePath: string, originalName: string): Promise<string> {
  const ext = getFileExtension(originalName);

  if (ext === '.pdf') {
    const dataBuffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else if (ext === '.txt' || ext === '.md') {
    return await fs.promises.readFile(filePath, 'utf-8');
  }

  throw new Error(`Unsupported document format: ${ext}`);
}

async function fileToBase64(filePath: string, originalName: string): Promise<string> {
  const buffer = await fs.promises.readFile(filePath);
  const b64 = buffer.toString('base64');

  // Determine MIME type
  let mime = 'application/octet-stream';
  const ext = getFileExtension(originalName);
  if (ext === '.png') mime = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
  else if (ext === '.webp') mime = 'image/webp';
  else if (ext === '.gif') mime = 'image/gif';

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

    let prompt: string = '';
    const contentType = req.headers['content-type'] || '';

    // Initialize OpenAI client with timeout
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 50000,
      maxRetries: 2,
    });

    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads - route based on file type
      const { file, prompt: filePrompt } = await parseFileUpload(req);
      prompt = filePrompt;
      const filename = file.originalFilename || '';

      try {
        // Check if it's a document file (PDF, TXT, MD)
        if (isDocumentFile(filename)) {
          // Extract text and use text generation endpoint logic
          const extractedText = await extractTextFromFile(file.filepath, filename);

          // Clean up temp file
          await fs.promises.unlink(file.filepath).catch(() => {});

          // Use the same logic as generate-user-stories endpoint
          return await handleTextGeneration(openai, extractedText, prompt, env, apiResponse);
        }
        // Check if it's an image file
        else if (isImageFile(filename)) {
          const base64Image = await fileToBase64(file.filepath, filename);

          // Clean up temp file
          await fs.promises.unlink(file.filepath).catch(() => {});

          // Use vision API
          return await handleVisionAnalysis(openai, base64Image, prompt, apiResponse);
        }
        else {
          // Unsupported format
          await fs.promises.unlink(file.filepath).catch(() => {});
          return apiResponse.error(new ApiError(
            ApiErrorCode.BAD_REQUEST,
            `Unsupported file format. Supported: PNG, JPG, WEBP, GIF (images) or PDF, TXT, MD (documents)`
          ));
        }
      } catch (err) {
        // Clean up temp file on error
        await fs.promises.unlink(file.filepath).catch(() => {});
        throw err;
      }
    } else {
      // Handle JSON requests (backwards compatibility) - images only
      const { image, prompt: jsonPrompt } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {};

      if (!image || typeof image !== 'string') {
        return apiResponse.error(new ApiError(
          ApiErrorCode.BAD_REQUEST,
          'Provide file upload or JSON with base64 image'
        ));
      }

      // Support base64 data URLs (existing functionality)
      if (!image.startsWith('data:')) {
        return apiResponse.error(new ApiError(
          ApiErrorCode.BAD_REQUEST,
          'JSON mode only supports base64 data URLs'
        ));
      }

      prompt = jsonPrompt || '';

      // Use vision API for JSON uploads (always images)
      return await handleVisionAnalysis(openai, image, prompt, apiResponse);
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

// Handler for text-based documents (PDF, TXT, MD)
async function handleTextGeneration(
  openai: OpenAI,
  text: string,
  context: string,
  env: ReturnType<typeof getEnv>,
  apiResponse: ApiResponse
) {
  // Load prompt (same as generate-user-stories)
  const basePrompt = `You are a senior Product Owner. From the following text, identify all relevant user stories, covering both primary actions and secondary interactions. For each user story, generate at least 3–5 detailed acceptance criteria using the Gherkin format (Given / When / Then). Extract EVERY distinct issue, bug, feature, or requirement mentioned.`;

  const fullPrompt = `${basePrompt}\n\n${context ? `Context: ${context}\n\n` : ''}Text to analyze:\n${text}`;

  const response = await openai.chat.completions.create({
    model: env.JSON_MODEL || 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a senior Product Owner. Output only valid JSON.' },
      { role: 'user', content: fullPrompt }
    ],
    temperature: 0.2,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || '';

  try {
    const parsed = JSON.parse(content);
    return apiResponse.success(parsed);
  } catch (parseError) {
    // Fallback response
    const fallbackResponse = {
      user_stories: [{
        title: 'Document Analysis',
        story: String(content).slice(0, 300),
        acceptance_criteria: ['Review extracted content for user stories']
      }],
      edge_cases: []
    };
    return apiResponse.success(fallbackResponse);
  }
}

// Handler for vision-based analysis (PNG, JPG, WEBP, GIF)
async function handleVisionAnalysis(
  openai: OpenAI,
  base64Image: string,
  context: string,
  apiResponse: ApiResponse
) {
  try {
    // Call OpenAI Vision API
    const systemPrompt = 'You are a senior Product Owner and UX analyst. Analyze the ACTUAL CONTENT of the image. Focus only on visible objects, colors, UI elements, text, and layout. Always respond with valid JSON in the exact format specified.';

    const userPrompt = [
      context ? `Context: ${context}` : '',
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
    ].join('\n');

    // Use OpenAI client for vision API
    const response = await openai.chat.completions.create({
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
    });

    const content = response.choices?.[0]?.message?.content ?? '';

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
      error instanceof Error ? error : new Error('Unknown error in vision analysis'),
      apiResponse['correlationId'],
      { endpoint: 'analyze-design', subHandler: 'vision' }
    );
    return apiResponse.error(error instanceof Error ? error : new Error('Vision analysis failed'));
  }
}