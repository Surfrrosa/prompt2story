import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCorsHeaders } from './_env.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string;
  const corsHeaders = getCorsHeaders(origin);

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({ ok: true, service: "prompt2story", version: "v1" });
}