import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders } from './_env.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) ?? null;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  // TODO: Implement feedback storage (database, email, etc.)
  console.log('Feedback received:', req.body);
  
  return res.status(200).json({ message: 'Feedback received' });
}