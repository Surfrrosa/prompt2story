import { z } from 'zod';

// Input validation schemas for API endpoints
export const GenerateUserStoriesSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(10000, 'Prompt must be under 10,000 characters'),
  context: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  persona: z.enum(['End User', 'Admin', 'Support Agent', 'Engineer', 'Designer', 'QA', 'Customer', 'Other']).optional(),
});

export const AnalyzeDesignSchema = z.object({
  image: z.string().min(1, 'Image data is required'),
  context: z.string().optional(),
  focus: z.string().optional(),
});

// Output validation schemas
export const UserStorySchema = z.object({
  title: z.string(),
  story: z.string(),
  acceptance_criteria: z.array(z.string()),
  metadata: z.object({
    priority: z.enum(['Low', 'Medium', 'High']).optional(),
    type: z.enum(['Feature', 'Bug', 'Chore', 'Enhancement', 'Accessibility']).optional(),
    component: z.string().optional(),
    effort: z.string().optional(),
    persona: z.string().optional(),
    persona_other: z.string().optional(),
  }).optional(),
});

export const UserStoriesResponseSchema = z.object({
  user_stories: z.array(UserStorySchema),
  edge_cases: z.array(z.string()).optional(),
});

export const DesignAnalysisResponseSchema = z.object({
  analysis: z.string(),
  elements: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
});

// Helper function to safely parse API responses
export function safeParseApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallbackData?: Partial<T>
): { success: true; data: T } | { success: false; error: string; fallback?: Partial<T> } {
  try {
    const parsed = schema.parse(data);
    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
        fallback: fallbackData
      };
    }
    return { 
      success: false, 
      error: 'Unknown parsing error',
      fallback: fallbackData 
    };
  }
}

// Type exports
export type GenerateUserStoriesInput = z.infer<typeof GenerateUserStoriesSchema>;
export type AnalyzeDesignInput = z.infer<typeof AnalyzeDesignSchema>;
export type UserStory = z.infer<typeof UserStorySchema>;
export type UserStoriesResponse = z.infer<typeof UserStoriesResponseSchema>;
export type DesignAnalysisResponse = z.infer<typeof DesignAnalysisResponseSchema>;