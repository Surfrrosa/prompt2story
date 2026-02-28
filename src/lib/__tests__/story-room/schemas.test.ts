import { describe, it, expect } from 'vitest';
import {
  StoryRoomInputSchema,
  ParsedRequirementsSchema,
  StoryMapSchema,
  DraftStoriesSchema,
  CritiqueSchema,
} from '../../story-room/schemas';

describe('StoryRoomInputSchema', () => {
  it('accepts valid input with description only', () => {
    const result = StoryRoomInputSchema.safeParse({
      description: 'Build a todo app with authentication',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with description and context', () => {
    const result = StoryRoomInputSchema.safeParse({
      description: 'Build a todo app with authentication',
      context: 'Using React and Node.js',
    });
    expect(result.success).toBe(true);
  });

  it('rejects description shorter than 10 characters', () => {
    const result = StoryRoomInputSchema.safeParse({
      description: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing description', () => {
    const result = StoryRoomInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('ParsedRequirementsSchema', () => {
  it('accepts valid requirements output', () => {
    const result = ParsedRequirementsSchema.safeParse({
      personas: [{ name: 'End User', role: 'Consumer', goals: ['Browse products'] }],
      features: [{ name: 'Search', description: 'Full-text search', priority: 'must' }],
      assumptions: ['Users have modern browsers'],
      ambiguities: ['Unclear if mobile support needed'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid priority value', () => {
    const result = ParsedRequirementsSchema.safeParse({
      personas: [],
      features: [{ name: 'Search', description: 'Search', priority: 'critical' }],
      assumptions: [],
      ambiguities: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('StoryMapSchema', () => {
  it('accepts valid story map', () => {
    const result = StoryMapSchema.safeParse({
      epics: [{
        name: 'User Authentication',
        description: 'Login and registration flows',
        storyOutlines: [
          { title: 'User Registration', persona: 'End User', brief: 'Sign up flow' },
        ],
      }],
      sequencing: ['Authentication before Profile Management'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty arrays', () => {
    const result = StoryMapSchema.safeParse({ epics: [], sequencing: [] });
    expect(result.success).toBe(true);
  });
});

describe('DraftStoriesSchema', () => {
  it('accepts valid draft stories', () => {
    const result = DraftStoriesSchema.safeParse({
      stories: [{
        id: 'AUTH-1',
        epic: 'Authentication',
        title: 'User Login',
        asA: 'registered user',
        iWant: 'to log in with email and password',
        soThat: 'I can access my account',
        acceptanceCriteria: ['Given valid credentials, login succeeds'],
        notes: 'Consider OAuth later',
      }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts stories without optional notes', () => {
    const result = DraftStoriesSchema.safeParse({
      stories: [{
        id: 'AUTH-1',
        epic: 'Authentication',
        title: 'User Login',
        asA: 'user',
        iWant: 'to log in',
        soThat: 'I can access things',
        acceptanceCriteria: ['Login works'],
      }],
    });
    expect(result.success).toBe(true);
  });
});

describe('CritiqueSchema', () => {
  it('accepts valid critique', () => {
    const result = CritiqueSchema.safeParse({
      gaps: [{ description: 'No password reset story', severity: 'critical' }],
      edgeCases: ['What if user enters wrong password 10 times?'],
      contradictions: [],
      recommendations: ['Add rate limiting to login attempts'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts critique with optional storyId in gaps', () => {
    const result = CritiqueSchema.safeParse({
      gaps: [{ storyId: 'AUTH-1', description: 'Missing error handling', severity: 'major' }],
      edgeCases: [],
      contradictions: [],
      recommendations: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid severity', () => {
    const result = CritiqueSchema.safeParse({
      gaps: [{ description: 'Issue', severity: 'blocker' }],
      edgeCases: [],
      contradictions: [],
      recommendations: [],
    });
    expect(result.success).toBe(false);
  });
});
