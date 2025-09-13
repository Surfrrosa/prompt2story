import { describe, it, expect } from 'vitest';

describe('Frontend API Client', () => {
  describe('Input validation helpers', () => {
    it('should validate prompt length requirements', () => {
      const validatePrompt = (prompt: string) => {
        if (!prompt || prompt.trim().length === 0) {
          return { valid: false, error: 'Prompt is required' };
        }
        if (prompt.length < 10) {
          return { valid: false, error: 'Prompt must be at least 10 characters' };
        }
        if (prompt.length > 10000) {
          return { valid: false, error: 'Prompt must be under 10,000 characters' };
        }
        return { valid: true };
      };

      expect(validatePrompt('')).toEqual({ valid: false, error: 'Prompt is required' });
      expect(validatePrompt('short')).toEqual({ valid: false, error: 'Prompt must be at least 10 characters' });
      expect(validatePrompt('a'.repeat(10001))).toEqual({ valid: false, error: 'Prompt must be under 10,000 characters' });
      expect(validatePrompt('This is a valid prompt for testing')).toEqual({ valid: true });
    });

    it('should validate persona values', () => {
      const validPersonas = ['EndUser', 'Developer', 'ProductManager', 'Designer'];
      const validatePersona = (persona: string) => {
        return validPersonas.includes(persona);
      };

      expect(validatePersona('EndUser')).toBe(true);
      expect(validatePersona('Developer')).toBe(true);
      expect(validatePersona('InvalidPersona')).toBe(false);
      expect(validatePersona('')).toBe(false);
    });
  });

  describe('Response structure validation', () => {
    it('should validate user story structure', () => {
      const validateUserStory = (story: any) => {
        return (
          story !== null &&
          typeof story === 'object' &&
          typeof story.title === 'string' &&
          typeof story.story === 'string' &&
          Array.isArray(story.acceptance_criteria) &&
          story.acceptance_criteria.every((criteria: any) => typeof criteria === 'string')
        );
      };

      const validStory = {
        title: 'User Login',
        story: 'As a user, I want to log in',
        acceptance_criteria: ['Given valid credentials', 'When I submit', 'Then I am logged in']
      };

      const invalidStory = {
        title: 'Missing story field',
        acceptance_criteria: 'Not an array'
      };

      expect(validateUserStory(validStory)).toBe(true);
      expect(validateUserStory(invalidStory)).toBe(false);
      expect(validateUserStory(null)).toBe(false);
    });

    it('should validate API response structure', () => {
      const validateApiResponse = (response: any) => {
        return (
          response !== null &&
          typeof response === 'object' &&
          Array.isArray(response.user_stories) &&
          Array.isArray(response.edge_cases)
        );
      };

      const validResponse = {
        user_stories: [],
        edge_cases: []
      };

      const invalidResponse = {
        user_stories: 'not an array'
      };

      expect(validateApiResponse(validResponse)).toBe(true);
      expect(validateApiResponse(invalidResponse)).toBe(false);
      expect(validateApiResponse(null)).toBe(false);
    });
  });
});
