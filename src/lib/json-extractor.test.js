import { extractJsonFromContent, validateAndExtractJson } from './json-extractor.js';

const describe = (name, fn) => {
  console.log(`\n${name}`);
  fn();
};

const it = (name, fn) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.log(`  ✗ ${name}: ${error.message}`);
    process.exit(1);
  }
};

const expect = (actual) => ({
  toEqual: (expected) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  },
  toBeNull: () => {
    if (actual !== null) {
      throw new Error(`Expected null, got ${actual}`);
    }
  }
});

describe('JSON Extractor', () => {
  it('should extract JSON from markdown code blocks', () => {
    const content = `
Here is some text before.

\`\`\`json
{
  "title": "Test Story",
  "description": "A test user story"
}
\`\`\`

And some text after.
    `;

    const result = extractJsonFromContent(content);
    expect(result).toEqual({
      title: "Test Story",
      description: "A test user story"
    });
  });

  it('should extract JSON from plain text', () => {
    const content = `Some text {"title": "Test", "value": 42} more text`;
    
    const result = extractJsonFromContent(content);
    expect(result).toEqual({
      title: "Test",
      value: 42
    });
  });

  it('should return null for invalid JSON', () => {
    const content = `\`\`\`json
{
  "invalid": json,
  "missing": quotes
}
\`\`\``;

    const result = extractJsonFromContent(content);
    expect(result).toBeNull();
  });

  it('should return null when no JSON found', () => {
    const content = "This is just plain text with no JSON";
    
    const result = extractJsonFromContent(content);
    expect(result).toBeNull();
  });

  it('should validate extracted JSON with custom validator', () => {
    const content = `\`\`\`json
{
  "title": "Valid Story",
  "description": "This has required fields"
}
\`\`\``;

    const isValidStory = (data) => {
      return typeof data.title === 'string' && typeof data.description === 'string';
    };

    const result = validateAndExtractJson(content, isValidStory);
    expect(result).toEqual({
      title: "Valid Story",
      description: "This has required fields"
    });
  });

  it('should return null when validation fails', () => {
    const content = `\`\`\`json
{
  "title": "Missing Description"
}
\`\`\``;

    const isValidStory = (data) => {
      return typeof data.title === 'string' && typeof data.description === 'string';
    };

    const result = validateAndExtractJson(content, isValidStory);
    expect(result).toBeNull();
  });
});

console.log('\n🎉 All JSON extractor tests passed!');
