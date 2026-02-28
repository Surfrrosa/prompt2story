// Story Room: Zod schemas for each agent's structured output

import { z } from 'zod';

// Pipeline input
export const StoryRoomInputSchema = z.object({
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(10000, 'Description must be under 10,000 characters'),
  context: z.string().max(5000).optional(),
});

// Agent 1: Requirements Analyst
export const ParsedRequirementsSchema = z.object({
  personas: z.array(z.object({
    name: z.string(),
    role: z.string(),
    goals: z.array(z.string()),
  })),
  features: z.array(z.object({
    name: z.string(),
    description: z.string(),
    priority: z.enum(['must', 'should', 'could']),
  })),
  assumptions: z.array(z.string()),
  ambiguities: z.array(z.string()),
});

// Agent 2: Story Architect
export const StoryMapSchema = z.object({
  epics: z.array(z.object({
    name: z.string(),
    description: z.string(),
    storyOutlines: z.array(z.object({
      title: z.string(),
      persona: z.string(),
      brief: z.string(),
    })),
  })),
  sequencing: z.array(z.string()),
});

// Agent 3: Story Writer
export const DraftStoriesSchema = z.object({
  stories: z.array(z.object({
    id: z.string(),
    epic: z.string(),
    title: z.string(),
    asA: z.string(),
    iWant: z.string(),
    soThat: z.string(),
    acceptanceCriteria: z.array(z.string()),
    notes: z.string().optional(),
  })),
});

// Agent 4: Devil's Advocate
export const CritiqueSchema = z.object({
  gaps: z.array(z.object({
    storyId: z.string().optional(),
    description: z.string(),
    severity: z.enum(['critical', 'major', 'minor']),
  })),
  edgeCases: z.array(z.string()),
  contradictions: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// Agent 5: Refinement Agent -- output matches the existing UserStoriesResponseSchema
// from src/lib/schemas.ts so the final output is compatible with Quick Generate

// Type exports
export type StoryRoomInput = z.infer<typeof StoryRoomInputSchema>;
export type ParsedRequirements = z.infer<typeof ParsedRequirementsSchema>;
export type StoryMap = z.infer<typeof StoryMapSchema>;
export type DraftStories = z.infer<typeof DraftStoriesSchema>;
export type Critique = z.infer<typeof CritiqueSchema>;
