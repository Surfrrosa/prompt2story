import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { setCorsHeaders, getEnv } from './_env.js';
import { safeParseApiResponse, UserStorySchema } from '../src/lib/schemas.js';
import { rateLimiters } from '../src/lib/rate-limiter.js';
import { ApiResponse, ApiError, ApiErrorCode, logRequest, logError } from '../src/lib/api-response.js';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';

const RegenerateRequestSchema = z.object({
  original_input: z.string(),
  current_story: z.object({
    title: z.string(),
    story: z.string().optional(),
    description: z.string().optional(),
    acceptance_criteria: z.array(z.string()).optional(),
    priority: z.string().optional(),
    story_points: z.number().optional()
  }).refine(data => data.story || data.description, {
    message: "Either 'story' or 'description' field is required"
  }),
  feedback: z.string().optional(),
  include_metadata: z.boolean().optional()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiResponse = new ApiResponse(req, res);
  const origin = (req.headers.origin as string) ?? null;

  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return apiResponse.error(new ApiError(
      ApiErrorCode.METHOD_NOT_ALLOWED,
      'Only POST method is allowed'
    ));
  }

  try {
    // Apply rate limiting
    const rateLimitResult = rateLimiters.generation(req);

    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (!rateLimitResult.allowed) {
      return apiResponse.rateLimited(rateLimitResult.resetTime, Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000));
    }

    logRequest(req, apiResponse['correlationId'], { endpoint: 'regenerate-story' });

    const inputValidation = safeParseApiResponse(RegenerateRequestSchema, req.body);
    if (!inputValidation.success) {
      return apiResponse.validationError({
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

REGENERATION TASK: Create a SIGNIFICANTLY ENHANCED and MORE DETAILED version of this user story.

ORIGINAL CONTEXT:
Input: ${original_input}

CURRENT STORY TO IMPROVE:
Title: ${current_story.title}
Story: ${current_story.story || current_story.description}
Acceptance Criteria: ${current_story.acceptance_criteria ? current_story.acceptance_criteria.join(', ') : 'None provided'}

ENHANCEMENT REQUIREMENTS:
${feedback ? `- Address this feedback: ${feedback}` : ''}
- Make the story title much more specific and actionable
- Expand the story description with concrete details and specific use cases
- Add comprehensive acceptance criteria (minimum 5-8 detailed criteria)
- Include edge cases, error handling, validation scenarios, and user experience considerations
- Use precise Given/When/Then format for all acceptance criteria
- Add performance requirements, accessibility features, and responsive design considerations
- Include specific error messages, loading states, success indicators, and user feedback mechanisms
- Consider mobile/desktop differences, offline scenarios, and integration requirements

Return enhanced JSON in this exact format:
{"title": "Very specific enhanced title", "story": "As a [specific user type], I want [detailed specific goal with context] so that [clear specific measurable benefit]", "acceptance_criteria": ["Given [specific detailed context], when [precise detailed action], then [exact expected outcome with specifics]", "Given [another specific context], when [detailed user interaction], then [precise system behavior]", "..."]}

Generate ONE dramatically enhanced user story with extensive details and comprehensive acceptance criteria.`;

    const response = await openai.chat.completions.create({
      model: env.JSON_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an expert product manager who writes clear, actionable user stories. Always respond with valid JSON in the exact format specified.' },
        { role: 'user', content: regenerationPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return apiResponse.error(new ApiError(
        ApiErrorCode.LLM_ERROR,
        'No response from OpenAI'
      ));
    }

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return apiResponse.error(new ApiError(
        ApiErrorCode.LLM_ERROR,
        'Could not extract JSON from response'
      ));
    }

    try {
      const result = JSON.parse(jsonMatch[0]);
      const validation = safeParseApiResponse(UserStorySchema, result);

      if (validation.success) {
        return apiResponse.success({ regenerated_story: validation.data });
      } else {
        logError(
          new ApiError(ApiErrorCode.LLM_ERROR, 'Story validation failed'),
          apiResponse['correlationId'],
          { validationError: validation.success ? 'Unknown error' : (validation as any).error }
        );
        const fallbackStory: any = {
          title: result.title || current_story.title,
          description: result.description || current_story.description,
          acceptance_criteria: result.acceptance_criteria || current_story.acceptance_criteria || []
        };

        if (include_metadata) {
          fallbackStory.priority = result.priority || current_story.priority || 'Medium';
          fallbackStory.story_points = result.story_points || current_story.story_points || 3;
        }

        return apiResponse.success({ regenerated_story: fallbackStory });
      }
    } catch (parseError) {
      logError(
        new ApiError(ApiErrorCode.LLM_ERROR, 'Failed to parse regenerated story'),
        apiResponse['correlationId'],
        { parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error' }
      );
      return apiResponse.error(new ApiError(
        ApiErrorCode.LLM_ERROR,
        'Failed to parse regenerated story'
      ));
    }

  } catch (error) {
    logError(
      error instanceof Error ? error : new Error('Unknown error in regenerate-story'),
      apiResponse['correlationId'],
      { endpoint: 'regenerate-story' }
    );
    return apiResponse.error(error instanceof Error ? error : new Error('Unknown error occurred'));
  }
}