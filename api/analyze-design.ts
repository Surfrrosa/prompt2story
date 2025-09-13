import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_env.js';
import https from 'node:https';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function json(res: VercelResponse, code: number, data: any) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function coerceJson(text: string | null | undefined): any | null {
  if (!text) return null;

  // 1) direct parse
  try { return JSON.parse(text as string); } catch {}

  const s = String(text);

  // 2) strip ```json fences
  const fenced = s.match(/```json\s*([\s\S]*?)```/i) || s.match(/```\s*([\s\S]*?)```/);
  if (fenced?.[1]) {
    try { return JSON.parse(fenced[1]); } catch {}
  }

  // 3) grab first balanced object
  const start = s.indexOf('{');
  if (start >= 0) {
    let depth = 0;
    for (let i = start; i < s.length; i++) {
      if (s[i] === '{') depth++;
      else if (s[i] === '}') {
        depth--;
        if (depth === 0) {
          const candidate = s.slice(start, i + 1);
          try { return JSON.parse(candidate); } catch {}
          break;
        }
      }
    }
  }

  return null;
}

function parseDataUrl(dataUrl: string): { mime: string; b64: string } {
  // data:image/png;base64,AAAA...
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  return { mime: match[1], b64: match[2] };
}

async function fetchAsBase64(url: string): Promise<{ mime: string; b64: string }> {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      if (resp.statusCode && resp.statusCode >= 400) {
        reject(new Error(`Image fetch failed: ${resp.statusCode}`));
        return;
      }
      const mime = resp.headers['content-type'] || 'image/jpeg';
      const chunks: Buffer[] = [];
      resp.on('data', (c) => chunks.push(c));
      resp.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length > MAX_IMAGE_BYTES) return reject(new Error('Image too large (>6MB)'));
        resolve({ mime: String(mime), b64: buf.toString('base64') });
      });
    }).on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) ?? null;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return json(res, 405, { detail: 'Method not allowed' });

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy-key-for-smoke-test') {
      return json(res, 400, { error_type: 'missing_api_key', detail: 'OPENAI_API_KEY not configured for Vision.' });
    }

    const { image, prompt } = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) ?? {};

    if (!image || typeof image !== 'string') {
      return json(res, 400, { error_type: 'invalid_image', detail: 'Provide `image` as https URL or data URL' });
    }

    // Normalize to base64 for Responses API
    let mime = 'image/png';
    let b64 = '';
    if (image.startsWith('data:image/')) {
      const parsed = parseDataUrl(image);
      mime = parsed.mime;
      b64 = parsed.b64;
      if (Buffer.byteLength(b64, 'base64') > MAX_IMAGE_BYTES) {
        return json(res, 413, { detail: 'Image too large (>6MB).' });
      }
    } else if (image.startsWith('http://') || image.startsWith('https://')) {
      try {
        const fetched = await fetchAsBase64(image);
        mime = fetched.mime;
        b64 = fetched.b64;
      } catch (e: any) {
        return json(res, 400, { error_type: 'image_fetch_failed', detail: e?.message || 'Image fetch failed' });
      }
    } else {
      return json(res, 400, { error_type: 'invalid_image', detail: 'Unsupported image scheme' });
    }

    // Strong anti-meta guardrails
    const systemPrompt =
      'You are a senior Product Owner and UX analyst. Analyze the ACTUAL CONTENT of the image. '+
      'Do NOT describe upload tools or meta-process. Focus only on visible objects, colors, UI elements, text, and layout.';

    const userPrompt = [
      prompt ? `Context: ${prompt}` : '',
      'Return ONLY strict JSON:',
      '{ "user_stories":[{"title":"...","story":"As a ...","acceptance_criteria":["Given/When/Then", "..."]}],',
      '  "edge_cases":["..."] }'
    ].join('\n');

    // Use Chat Completions API with base64 data URL
    const dataUrl = `data:${mime};base64,${b64}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.JSON_VISION_MODEL || 'gpt-4o',
        // Force strict JSON output when supported
        response_format: { type: 'json_object' },
        max_tokens: 4000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
            ]
          }
        ]
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text().catch(() => '');
      return json(res, 502, { error_type: 'openai_error', detail: errorText || `OpenAI ${openaiResponse.status}` });
    }

    const data = await openaiResponse.json();
    // Chat Completions: try content; JSON-mode models will return pure JSON here
    const content = data.choices?.[0]?.message?.content ?? '';

    if (!content) {
      return json(res, 502, { error_type: 'openai_empty', detail: 'No content returned from OpenAI' });
    }

    // Parse JSON robustly
    const parsed = coerceJson(content);
    if (parsed) return json(res, 200, parsed);

    // Last-resort fallback (still image-focused)
    return json(res, 200, {
      user_stories: [{
        title: 'Vision Analysis (unparsed)',
        story: String(content).slice(0, 300).replace(/\s+/g, ' '),
        acceptance_criteria: [
          'Given an image was provided, when it is analyzed, then user stories reference visible elements in the image',
          'Given unique visual features, when generating criteria, then they use concrete Given/When/Then outcomes',
          'Given parsing failed, when returning text, then the response remains about image content (never upload mechanics)'
        ]
      }],
      edge_cases: ['Model returned non-JSON text output; parser fallback used']
    });

  } catch (error) {
    console.error('Vision handler error:', error);
    return json(res, 500, {
      error_type: 'handler_error',
      detail: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
