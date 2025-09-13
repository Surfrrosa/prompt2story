import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, getEnv } from './_env';
import { AnalyzeDesignSchema, safeParseApiResponse } from '../src/lib/schemas';

// File size and type constraints
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf'
];

// Helper to validate base64 image data
function validateImageData(imageData: string): { valid: boolean; error?: string; mimeType?: string; sizeBytes?: number } {
  try {
    // Check if it's a data URL
    if (!imageData.startsWith('data:')) {
      return { valid: false, error: 'Invalid image data format. Expected base64 data URL.' };
    }

    // Extract MIME type and base64 data
    const [header, base64Data] = imageData.split(',');
    if (!header || !base64Data) {
      return { valid: false, error: 'Invalid data URL format' };
    }

    const mimeMatch = header.match(/data:([^;]+)/);
    if (!mimeMatch) {
      return { valid: false, error: 'Could not determine MIME type' };
    }

    const mimeType = mimeMatch[1];
    
    // Check allowed MIME types
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return { 
        valid: false, 
        error: `Unsupported file type: ${mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` 
      };
    }

    // Estimate file size from base64 (base64 is ~33% larger than binary)
    const sizeBytes = Math.floor((base64Data.length * 3) / 4);
    
    if (sizeBytes > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `File too large: ${(sizeBytes / 1024 / 1024).toFixed(1)}MB. Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }

    // Basic base64 validation
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(base64Data)) {
      return { valid: false, error: 'Invalid base64 encoding' };
    }

    return { valid: true, mimeType, sizeBytes };
  } catch (error) {
    return { valid: false, error: 'Error validating image data' };
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) ?? null;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    // Validate environment
    const env = getEnv();

    // Validate input using schema
    const inputValidation = safeParseApiResponse(AnalyzeDesignSchema, req.body);

    if (!inputValidation.success) {
      return res.status(400).json({ 
        detail: `Input validation failed: ${inputValidation.error}` 
      });
    }

    const { image, context, focus } = inputValidation.data;

    // Validate image data with size/type guards
    const imageValidation = validateImageData(image);
    if (!imageValidation.valid) {
      return res.status(400).json({
        detail: `Image validation failed: ${imageValidation.error}`
      });
    }

    console.log(`Design analysis request: ${imageValidation.mimeType}, ${(imageValidation.sizeBytes! / 1024).toFixed(1)}KB`);

    // TODO: Implement design analysis with OpenAI Vision API
    // For now, return enhanced placeholder response with validation info
    return res.status(200).json({
      user_stories: [{
        title: 'Design analysis validation completed',
        story: `Validated ${imageValidation.mimeType} file (${(imageValidation.sizeBytes! / 1024).toFixed(1)}KB). Vision API analysis pending implementation.`,
        acceptance_criteria: [
          'File type validation passes',
          'File size is within limits', 
          'Base64 encoding is valid',
          'Context and focus parameters are optional and validated'
        ]
      }],
      edge_cases: [
        'Files larger than 10MB are rejected',
        'Only image and PDF files are allowed',
        'Invalid base64 encoding is caught',
        'Malformed data URLs are rejected'
      ]
    });

  } catch (error) {
    console.error('Error in analyze-design:', error);
    return res.status(500).json({ 
      detail: 'Internal server error. Check server logs for details.' 
    });
  }
}