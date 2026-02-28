import { describe, it, expect } from 'vitest';
import { parseAgentOutput } from '../../story-room/parser';

describe('parseAgentOutput', () => {
  it('extracts JSON from fenced code block', () => {
    const text = `
I'm analyzing the requirements now. The input mentions a todo app.

\`\`\`json
{"personas":[],"features":[],"assumptions":["Modern browser"],"ambiguities":[]}
\`\`\`
`;
    const result = parseAgentOutput(text, 'requirements-analyst') as any;
    expect(result.assumptions).toEqual(['Modern browser']);
  });

  it('uses the last JSON block when multiple are present', () => {
    const text = `
Here's my initial parse:

\`\`\`json
{"personas":[],"features":[],"assumptions":["Wrong one"],"ambiguities":[]}
\`\`\`

Wait, let me correct that:

\`\`\`json
{"personas":[],"features":[],"assumptions":["Correct one"],"ambiguities":[]}
\`\`\`
`;
    const result = parseAgentOutput(text, 'requirements-analyst') as any;
    expect(result.assumptions).toEqual(['Correct one']);
  });

  it('falls back to parsing raw JSON when no fences present', () => {
    const text = '{"personas":[],"features":[],"assumptions":[],"ambiguities":[]}';
    const result = parseAgentOutput(text, 'requirements-analyst') as any;
    expect(result.personas).toEqual([]);
  });

  it('finds JSON object in mixed text without fences', () => {
    const text = 'Some thinking text before {"personas":[],"features":[],"assumptions":[],"ambiguities":[]} and after';
    const result = parseAgentOutput(text, 'requirements-analyst') as any;
    expect(result.personas).toEqual([]);
  });

  it('throws when no JSON is found', () => {
    const text = 'Just some thinking text with no JSON at all.';
    expect(() => parseAgentOutput(text, 'requirements-analyst')).toThrow(
      'Agent requirements-analyst did not produce a JSON block'
    );
  });

  it('returns raw data even if schema validation fails', () => {
    // Pass data that does not match the schema (missing required fields)
    // Parser should warn but return the raw data
    const text = `\`\`\`json\n{"unexpected":"data"}\n\`\`\``;
    const result = parseAgentOutput(text, 'requirements-analyst') as any;
    expect(result.unexpected).toBe('data');
  });

  it('handles story map output correctly', () => {
    const text = `\`\`\`json
{
  "epics": [{
    "name": "Auth",
    "description": "Authentication flows",
    "storyOutlines": [{"title": "Login", "persona": "User", "brief": "Login flow"}]
  }],
  "sequencing": ["Auth first"]
}
\`\`\``;
    const result = parseAgentOutput(text, 'story-architect') as any;
    expect(result.epics).toHaveLength(1);
    expect(result.epics[0].name).toBe('Auth');
  });

  it('handles critique output correctly', () => {
    const text = `\`\`\`json
{
  "gaps": [{"description": "No logout", "severity": "major"}],
  "edgeCases": ["Session timeout"],
  "contradictions": [],
  "recommendations": ["Add session management"]
}
\`\`\``;
    const result = parseAgentOutput(text, 'devils-advocate') as any;
    expect(result.gaps).toHaveLength(1);
    expect(result.edgeCases).toContain('Session timeout');
  });
});
