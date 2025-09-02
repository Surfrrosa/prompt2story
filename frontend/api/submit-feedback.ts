import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  // TODO: Implement feedback storage (database, email, etc.)
  console.log('Feedback received:', req.body);
  
  return res.status(200).json({ message: 'Feedback received' });
}