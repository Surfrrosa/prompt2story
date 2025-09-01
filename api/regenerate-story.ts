import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  // TODO: Implement story regeneration with OpenAI
  console.log('Regenerate story request:', req.body);
  
  // For now, return the current story unchanged
  const { current_story } = req.body;
  return res.status(200).json(current_story || {
    title: 'Story regeneration not yet implemented',
    story: 'This endpoint needs to be implemented with OpenAI integration',
    acceptance_criteria: ['Feature is not yet available']
  });
}