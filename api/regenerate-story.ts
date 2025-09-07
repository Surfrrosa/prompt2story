import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { getEnv, getCorsHeaders } from './_env';
import { safeParseApiResponse, UserStorySchema } from '../src/lib/schemas';
function setCorsHeaders(res: any, corsHeaders: any) {
  if (corsHeaders && typeof corsHeaders === 'object') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
}
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';

const RegenerateRequestSchema = z.object({
  original_input: z.string(),
  current_story: z.object({
    title: z.string(),
    description: z.string(),
    acceptance_criteria: z.array(z.string()).optional(),
    priority: z.string().optional(),
    story_points: z.number().optional()
  }),
  feedback: z.string().optional(),
  include_metadata: z.boolean().optional()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | null;
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, corsHeaders);
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    setCorsHeaders(res, corsHeaders);
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const inputValidation = safeParseApiResponse(RegenerateRequestSchema, req.body);
    if (!inputValidation.success) {
      setCorsHeaders(res, corsHeaders);
      return res.status(400).json({
        detail: `Input validation failed: ${(inputValidation as any).error || 'Unknown validation error'}`
      });
    }

    const { original_input, current_story, feedback, include_metadata } = inputValidation.data;
    const env = getEnv();
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    let userStoryPrompt: string;
    try {
      userStoryPrompt = await readFile(join(process.cwd(), 'prompts', 'user_story_prompt.md'), 'utf-8');
    } catch {
      userStoryPrompt = `Generate an improved user story based on the original input and current story.
Focus on addressing any feedback provided and improving clarity, completeness, and actionability.`;
    }

    const regenerationPrompt = `${userStoryPrompt}

REGENERATION CONTEXT:
Original Input: ${original_input}

Current Story:
Title: ${current_story.title}
Description: ${current_story.description}
${current_story.acceptance_criteria ? `Acceptance Criteria: ${current_story.acceptance_criteria.join(', ')}` : ''}

${feedback ? `Feedback to Address: ${feedback}` : 'Please improve this story for better clarity and completeness.'}

Generate ONE improved user story in JSON format. ${include_metadata ? 'Include priority and story_points.' : 'Do not include priority or story_points.'}`;

    const response = await openai.chat.completions.create({
      model: env.JSON_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert product manager who writes clear, actionable user stories.' },
        { role: 'user', content: regenerationPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      setCorsHeaders(res, corsHeaders);
      return res.status(500).json({ detail: 'No response from OpenAI' });
    }

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      setCorsHeaders(res, corsHeaders);
      return res.status(500).json({ detail: 'Could not extract JSON from response' });
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      const validation = safeParseApiResponse(UserStorySchema, result);
      
      setCorsHeaders(res, corsHeaders);
      
      if (validation.success) {
        return res.status(200).json({ regenerated_story: validation.data });
      } else {
        console.warn('Story validation failed:', validation.success ? 'Unknown error' : (validation as any).error);
        const fallbackStory: any = {
          title: result.title || current_story.title,
          description: result.description || current_story.description,
          acceptance_criteria: result.acceptance_criteria || current_story.acceptance_criteria || []
        };
        
        if (include_metadata) {
          fallbackStory.priority = result.priority || current_story.priority || 'Medium';
          fallbackStory.story_points = result.story_points || current_story.story_points || 3;
        }
        
        return res.status(200).json({ regenerated_story: fallbackStory });
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      setCorsHeaders(res, corsHeaders);
      return res.status(500).json({ detail: 'Failed to parse regenerated story' });
    }

  } catch (error) {
    console.error('Error in regenerate-story:', error);
    setCorsHeaders(res, corsHeaders);
    return res.status(500).json({ 
      detail: 'Internal server error. Check server logs for details.' 
    });
  }
}
