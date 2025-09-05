import { describe, it, expect, beforeAll } from 'vitest';
import supertest from 'supertest';

// Get BASE_URL from environment or default to localhost
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('API Generate User Stories', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    // Set up supertest with base URL
    request = supertest(BASE_URL);
  });

  describe('POST /api/generate-user-stories', () => {
    it('should reject requests without prompt/text', async () => {
      const response = await request
        .post('/api/generate-user-stories')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.detail).toContain('validation failed');
    });

    it('should reject prompts that are too short', async () => {
      const response = await request
        .post('/api/generate-user-stories')
        .send({
          prompt: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.detail).toContain('at least 10 characters');
    });

    it('should reject prompts that are too long', async () => {
      const longPrompt = 'a'.repeat(10001);
      const response = await request
        .post('/api/generate-user-stories')
        .send({
          prompt: longPrompt,
        });

      expect(response.status).toBe(400);
      expect(response.body.detail).toContain('under 10,000 characters');
    });

    it('should accept valid prompt via "text" field (legacy)', async () => {
      const response = await request
        .post('/api/generate-user-stories')
        .send({
          text: 'Create a user login form with email and password fields',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_stories');
      expect(response.body).toHaveProperty('edge_cases');
      expect(Array.isArray(response.body.user_stories)).toBe(true);
    });

    it('should accept valid prompt via "prompt" field (new)', async () => {
      const response = await request
        .post('/api/generate-user-stories')
        .send({
          prompt: 'Create a dashboard with user analytics and reporting features',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_stories');
      expect(response.body).toHaveProperty('edge_cases');
      expect(Array.isArray(response.body.user_stories)).toBe(true);
    });

    it('should accept optional parameters', async () => {
      const response = await request
        .post('/api/generate-user-stories')
        .send({
          prompt: 'Build an e-commerce checkout process',
          context: 'Mobile-first design',
          requirements: ['Security', 'Performance'],
          persona: 'End User',
          include_metadata: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_stories');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request
        .options('/api/generate-user-stories')
        .set('Origin', 'https://example.com');

      expect(response.status).toBe(200);
    });

    it('should reject invalid persona values', async () => {
      const response = await request
        .post('/api/generate-user-stories')
        .send({
          prompt: 'Create a form with validation',
          persona: 'InvalidPersona',
        });

      expect(response.status).toBe(400);
      expect(response.body.detail).toContain('validation failed');
    });

    it('should return structured user stories', async () => {
      const response = await request
        .post('/api/generate-user-stories')
        .send({
          prompt: 'Design a simple todo list application with add, edit, delete functionality',
        });

      expect(response.status).toBe(200);
      
      const { user_stories, edge_cases } = response.body;
      expect(Array.isArray(user_stories)).toBe(true);
      expect(Array.isArray(edge_cases)).toBe(true);
      
      if (user_stories.length > 0) {
        const firstStory = user_stories[0];
        expect(firstStory).toHaveProperty('title');
        expect(firstStory).toHaveProperty('story');
        expect(firstStory).toHaveProperty('acceptance_criteria');
        expect(Array.isArray(firstStory.acceptance_criteria)).toBe(true);
        expect(typeof firstStory.title).toBe('string');
        expect(typeof firstStory.story).toBe('string');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle method not allowed', async () => {
      const response = await request.get('/api/generate-user-stories');
      
      expect(response.status).toBe(405);
      expect(response.body.detail).toBe('Method not allowed');
    });

    it('should handle large payloads gracefully', async () => {
      const largePayload = {
        prompt: 'Create a complex system',
        context: 'x'.repeat(1000),
        requirements: Array(100).fill('requirement'),
      };

      const response = await request
        .post('/api/generate-user-stories')
        .send(largePayload);

      // Should either succeed or fail with validation error, not crash
      expect([200, 400, 413]).toContain(response.status);
    });
  });
});