import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { setCorsHeaders, getEnv } from './_env';
import { GenerateUserStoriesSchema, UserStoriesResponseSchema, safeParseApiResponse } from '../src/lib/schemas';

interface Metadata {
  priority: string;
  type: string;
  component: string;
  effort: string;
  persona: string;
  persona_other?: string | null;
}

interface UserStory {
  title: string;
  story: string;
  acceptance_criteria: string[];
  metadata?: Metadata;
}

interface GenerationResponse {
  user_stories: UserStory[];
  edge_cases: string[];
}

interface TextInput {
  text: string;
  include_metadata?: boolean;
  infer_edge_cases?: boolean;
  include_advanced_criteria?: boolean;
  expand_all_components?: boolean;
}

// Environment validation (now using _env.ts helper)
function validateEnvironment(): void {
  const { OPENAI_API_KEY } = getEnv();
  if (!OPENAI_API_KEY) {
    throw new Error('Missing required environment variable: OPENAI_API_KEY');
  }
}

// Load prompt templates
function loadPrompt(): string {
  try {
    // Try multiple possible locations for the prompt file
    const possiblePaths = [
      join(process.cwd(), 'prompts', 'user_story_prompt.md'),
      join(process.cwd(), '..', 'prompts', 'user_story_prompt.md'),
      join(process.cwd(), 'frontend', 'prompts', 'user_story_prompt.md'),
    ];
    
    for (const promptPath of possiblePaths) {
      try {
        return readFileSync(promptPath, 'utf-8');
      } catch (error) {
        continue;
      }
    }
    
    // If all paths fail, use comprehensive fallback matching the original
    throw new Error('Prompt file not found');
  } catch (error) {
    // Comprehensive fallback prompt for user story generation
    return `# User Story Generation Prompt

You are a senior Product Owner. From the following design or text, identify all relevant user stories, covering both primary actions and secondary interactions. For each user story, generate at least 3–5 detailed acceptance criteria using the Gherkin format (Given / When / Then). Consider UI elements, edge cases, different states, and common UX patterns. Do not limit your output arbitrarily. Be thorough, but keep language clear and consistent.

## Core Mission: EXTRACT EVERY DISTINCT ISSUE
Your primary goal is to identify and extract EVERY separate issue, bug, feature, or requirement mentioned in the input text. Each distinct problem or enhancement should become its own user story.

## Instructions:
1. **Parse compound statements carefully** - Meeting notes often contain multiple issues in single sentences or paragraphs
2. **Identify implicit issues** - Look for phrases like "we forgot", "missing", "doesn't work", "should do X but doesn't"
3. **Separate each distinct concern** - Even if mentioned briefly or in passing, each issue gets its own user story
4. **Convert ALL problems to user stories** - Bugs, QA gaps, missing features, broken behaviors all become structured user stories
5. **Ensure 1:1 mapping** - One user story per distinct issue, no exceptions
6. **Create 3-5 detailed acceptance criteria per story** - Use proper Gherkin format (Given/When/Then) covering normal flow, edge cases, error scenarios, and different states
7. **Add optional metadata when confident** - Include type (bug/feature), component, priority, effort, persona when clearly indicated

## Output Format:
Return a JSON object with user_stories and edge_cases arrays.`;
  }
}

function extractJsonFromContent(content: string): any {
  // Try direct JSON parse first
  try {
    return JSON.parse(content);
  } catch (e) {
    // Try extracting from markdown code fences
    const fencedMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (fencedMatch) {
      try {
        return JSON.parse(fencedMatch[1]);
      } catch (e) {
        // Continue to next attempt
      }
    }
    
    // Try finding JSON between first '{' and last '}'
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(content.substring(start, end + 1));
      } catch (e) {
        // Continue to next attempt
      }
    }
    
    throw new Error('No valid JSON object found in model output');
  }
}

// OpenAI call with JSON mode and fallback
async function callOpenAIJson(
  openai: OpenAI,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  jsonModel: string = 'gpt-4o-mini',
  fallbackModel: string = 'gpt-4o',
  temperature: number = 0.2,
  maxTokens: number = 4000
): Promise<string> {
  try {
    // Try JSON mode first
    const response = await openai.chat.completions.create({
      model: jsonModel,
      response_format: { type: 'json_object' },
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.warn(`JSON mode failed on ${jsonModel}, falling back to regular call:`, error);
    
    // Fallback to regular mode
    const response = await openai.chat.completions.create({
      model: fallbackModel,
      messages,
      temperature,
      max_tokens: maxTokens,
    });
    
    return response.choices[0]?.message?.content || '';
  }
}

const JSON_INSTRUCTIONS = `
Return ONLY a valid JSON object matching exactly this schema—no preamble, no markdown, no code fences:

{
  "user_stories": [
    {
      "title": "string",
      "story": "string", 
      "acceptance_criteria": ["string", "..."],
      "metadata": {
        "priority": "Low|Medium|High",
        "type": "Feature|Bug|Chore|Enhancement|Accessibility",
        "component": "string",
        "effort": "string",
        "persona": "End User|Admin|Support Agent|Engineer|Designer|QA|Customer|Other",
        "persona_other": "string|null"
      }
    }
  ],
  "edge_cases": ["string", "..."]
}`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) ?? null;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    // Validate environment
    validateEnvironment();
    const env = getEnv();

    // Validate input using schema
    const inputValidation = safeParseApiResponse(GenerateUserStoriesSchema, {
      prompt: req.body.text || req.body.prompt,
      context: req.body.context,
      requirements: req.body.requirements,
      persona: req.body.persona
    });

    if (!inputValidation.success) {
      return res.status(400).json({
        detail: `Input validation failed: ${(inputValidation as any).error || 'Unknown validation error'}`
      });
    }

    // Convert validated input to internal format
    const inputData: TextInput = {
      text: inputValidation.data.prompt,
      include_metadata: req.body.include_metadata,
      infer_edge_cases: req.body.infer_edge_cases,  
      include_advanced_criteria: req.body.include_advanced_criteria,
      expand_all_components: req.body.expand_all_components
    };

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Build prompt with options
    let prompt = loadPrompt();

    if (inputData.include_metadata) {
      prompt += `\n\nIMPORTANT: Include detailed metadata in your response with priority 
(Low/Medium/High), type (Feature|Bug|Chore|Enhancement|Accessibility), component, 
effort, and persona (End User/Admin/Support Agent/Engineer/Designer/QA/Customer/Other).`;
    }
    
    if (inputData.infer_edge_cases) {
      prompt += `\n\nEDGE CASES: Infer and include comprehensive edge cases, boundary conditions, 
and error scenarios for each user story.`;
    }
    
    if (inputData.include_advanced_criteria) {
      prompt += `\n\nADVANCED CRITERIA: Generate 5-7 detailed acceptance criteria per story covering 
normal flow, error handling, edge cases, different states, accessibility, and performance.`;
    }
    
    if (inputData.expand_all_components) {
      prompt += `\n\nCOMPREHENSIVE ANALYSIS: Scan and analyze ALL mentioned components, features, and 
requirements. Be thorough and complete.`;
    }

    const fullPrompt = `${prompt}\n\n${JSON_INSTRUCTIONS}\n\nUnstructured text to analyze:\n${inputData.text}`;

    // Call OpenAI using environment-configured models
    const content = await callOpenAIJson(
      openai,
      [
        { role: 'system', content: 'You are a senior Product Owner and business analyst. Output only valid JSON.' },
        { role: 'user', content: fullPrompt }
      ],
      env.JSON_MODEL || 'gpt-4o-mini', // Optimized model for JSON responses
      env.TEXT_MODEL || 'gpt-4o',      // Fallback model for complex responses  
      0.2            // Low temperature for consistent output
    );

    // Parse and validate response
    try {
      const result = extractJsonFromContent(content);
      
      // Validate response schema
      const responseValidation = safeParseApiResponse(UserStoriesResponseSchema, result);
      
      if (responseValidation.success) {
        return res.status(200).json(responseValidation.data);
      } else {
        console.warn('Response validation failed:', responseValidation.success ? 'Unknown error' : (responseValidation as any).error);
        // Still return the data but with warning logged
        const fallbackResponse: GenerationResponse = {
          user_stories: result.user_stories || [],
          edge_cases: result.edge_cases || []
        };
        return res.status(200).json(fallbackResponse);
      }
    } catch (parseError) {
      // Fallback response if parsing fails
      const excerpt = content.length > 200 ? content.substring(0, 200) + '...' : content;
      const fallbackResponse: GenerationResponse = {
        user_stories: [{
          title: 'Generated User Story',
          story: excerpt,
          acceptance_criteria: ['Please review the generated content for specific criteria']
        }],
        edge_cases: ['Please review the generated content for edge cases']
      };

      return res.status(200).json(fallbackResponse);
    }

  } catch (error) {
    console.error('Error in generate-user-stories:', error);
    return res.status(500).json({ 
      detail: 'Internal server error. Check server logs for details.' 
    });
  }
}
