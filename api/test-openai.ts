import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, getEnv } from './_env.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) ?? null;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const env = getEnv();

    // Test 1: Check if we have API key
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'dummy-key-for-smoke-test') {
      return res.status(200).json({
        test: 'api_key_check',
        result: 'FAIL - No valid API key found',
        key_starts_with: env.OPENAI_API_KEY?.substring(0, 10) + '...'
      });
    }

    // Test 2: Try to import OpenAI
    let OpenAI;
    try {
      const openaiModule = await import('openai');
      OpenAI = openaiModule.OpenAI;

      if (!OpenAI) {
        return res.status(200).json({
          test: 'openai_import',
          result: 'FAIL - OpenAI class not found in module',
          module_keys: Object.keys(openaiModule)
        });
      }
    } catch (importError) {
      return res.status(200).json({
        test: 'openai_import',
        result: 'FAIL - Import error',
        error: importError instanceof Error ? importError.message : String(importError)
      });
    }

    // Test 3: Try to create OpenAI instance
    let openai;
    try {
      openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
      });
    } catch (constructorError) {
      return res.status(200).json({
        test: 'openai_constructor',
        result: 'FAIL - Constructor error',
        error: constructorError instanceof Error ? constructorError.message : String(constructorError)
      });
    }

    // Test 4: Try a simple text completion (not vision)
    try {
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

      return res.status(200).json({
        test: 'openai_text_api',
        result: 'SUCCESS',
        response: response.choices[0]?.message?.content
      });

    } catch (apiError) {
      return res.status(200).json({
        test: 'openai_text_api',
        result: 'FAIL - API call error',
        error: apiError instanceof Error ? apiError.message : String(apiError)
      });
    }

  } catch (error) {
    return res.status(500).json({
      test: 'general_error',
      result: 'FAIL - Unexpected error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}