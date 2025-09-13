import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_env.js';
import formidable from 'formidable';
import fs from 'node:fs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function json(res: VercelResponse, code: number, data: any) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
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
  const origin = (req.headers.origin as string) ?? null;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { detail: 'Method not allowed' });

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy-key-for-smoke-test') {
      return json(res, 400, { error_type: 'missing_api_key', detail: 'OPENAI_API_KEY not configured.' });
    }

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
        return json(res, 400, { error_type: 'invalid_image', detail: 'Provide image file upload or JSON with base64/URL' });
      }

      // Support base64 data URLs (existing functionality)
      if (image.startsWith('data:')) {
        base64Image = image;
      } else {
        return json(res, 400, { error_type: 'invalid_image', detail: 'JSON mode only supports base64 data URLs' });
      }

      prompt = jsonPrompt || '';
    }

    // Call OpenAI Vision API
    const systemPrompt = 'You are a senior Product Owner and UX analyst. Analyze the ACTUAL CONTENT of the image. Focus only on visible objects, colors, UI elements, text, and layout. Always respond with valid JSON in the exact format specified.';

    const userPrompt = [
      prompt ? `Context: ${prompt}` : '',
      'Analyze this image and generate user stories about the visible content.',
      'Return valid JSON with this exact structure:',
      '{"user_stories":[{"title":"...","story":"As a ...","acceptance_criteria":["Given/When/Then statements"]}],"edge_cases":["potential issues"]}'
    ].join('\\n');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
      return json(res, 502, { error_type: 'openai_error', detail: errorText || `OpenAI ${openaiResponse.status}` });
    }

    const data = await openaiResponse.json() as any;
    const content = data.choices?.[0]?.message?.content ?? '';

    if (!content) {
      return json(res, 502, { error_type: 'openai_empty', detail: 'No content returned from OpenAI' });
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(content);
      return json(res, 200, parsed);
    } catch (parseError) {
      // Fallback with actual content analysis
      return json(res, 200, {
        user_stories: [{
          title: 'Vision Analysis (parsing failed)',
          story: String(content).slice(0, 300).replace(/\\s+/g, ' '),
          acceptance_criteria: [
            'Given an image was provided, when it is analyzed, then user stories reference visible elements',
            'Given the analysis completes, when reviewing results, then they focus on actual image content'
          ]
        }],
        edge_cases: ['JSON parsing failed - returned raw analysis']
      });
    }

  } catch (error) {
    console.error('Vision handler error:', error);
    return json(res, 500, {
      error_type: 'handler_error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}