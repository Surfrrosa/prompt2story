import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Types matching the Python backend
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

// Environment validation
function validateEnvironment(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing required environment variable: OPENAI_API_KEY');
  }
}

// Load prompt templates
function loadPrompt(): string {
  try {
    const promptPath = path.join(process.cwd(), 'prompts', 'user_story_prompt.md');
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    // Fallback prompt if file is missing
    return `You are an expert product manager and business analyst. 
Convert the provided unstructured text into well-structured user stories, 
acceptance criteria, and edge cases.`;
  }
}

// JSON parsing logic ported from Python
function extractJsonFromContent(content: string): any {
  // Try direct JSON parse first
  try {
    return JSON.parse(content);
  } catch (e) {
    // Try extracting from markdown code fences
    const fencedMatch = content.match(/```(?:json)?\s*(\{.*?\})\s*```/s);
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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    // Validate environment
    validateEnvironment();

    // Parse and validate input
    const inputData: TextInput = req.body;
    
    if (!inputData.text || !inputData.text.trim()) {
      return res.status(400).json({ detail: 'Input text cannot be empty' });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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

    // Call OpenAI
    const content = await callOpenAIJson(
      openai,
      [
        { role: 'system', content: 'You are a senior Product Owner and business analyst. Output only valid JSON.' },
        { role: 'user', content: fullPrompt }
      ]
    );

    // Parse response
    try {
      const result = extractJsonFromContent(content);
      const response: GenerationResponse = {
        user_stories: result.user_stories || [],
        edge_cases: result.edge_cases || []
      };
      
      return res.status(200).json(response);
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