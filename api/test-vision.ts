import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, getEnv } from './_env.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) ?? null;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const env = getEnv();
    const { OpenAI } = await import('openai');

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Test Vision API with a simple base64 image
    const testImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What do you see in this image? Keep response brief."
              },
              {
                type: "image_url",
                image_url: {
                  url: testImage,
                  detail: "low"
                }
              }
            ]
          }
        ],
        max_tokens: 100
      });

      const content = response.choices[0]?.message?.content;

      return res.status(200).json({
        test: 'vision_api',
        result: 'SUCCESS',
        response: content,
        model_used: response.model,
        usage: response.usage
      });

    } catch (visionError) {
      return res.status(200).json({
        test: 'vision_api',
        result: 'FAIL - Vision API error',
        error: visionError instanceof Error ? visionError.message : String(visionError),
        error_type: visionError instanceof Error ? visionError.name : 'Unknown'
      });
    }

  } catch (error) {
    return res.status(500).json({
      test: 'vision_setup',
      result: 'FAIL - Setup error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}