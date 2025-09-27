# Contributing Guidelines

## Welcome Contributors

Thank you for your interest in contributing to Prompt2Story! This document provides guidelines and information for contributing to this enterprise-grade AI-powered user story generator.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Workflow](#contribution-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)
- [Security Guidelines](#security-guidelines)
- [Performance Considerations](#performance-considerations)
- [Review Process](#review-process)

## Code of Conduct

### Professional Standards

- **Respectful Communication**: Maintain professional and constructive communication
- **Inclusive Environment**: Welcome contributors of all skill levels and backgrounds
- **Quality Focus**: Prioritize code quality, security, and maintainability
- **Collaborative Spirit**: Share knowledge and help others learn and grow

### Unacceptable Behavior

- Harassment, discrimination, or inappropriate conduct
- Publishing security vulnerabilities without following responsible disclosure
- Submitting low-quality code without testing or documentation
- Ignoring feedback or review comments

## Getting Started

### Prerequisites

Ensure you have the required development environment:

- **Node.js 22+** (`node --version`)
- **npm/yarn/pnpm** package manager
- **Git** for version control
- **OpenAI API key** for testing (development/staging key recommended)
- **Code editor** with TypeScript support (VS Code recommended)

### Understanding the Codebase

Before contributing, familiarize yourself with:

1. **Architecture**: Read `docs/ARCHITECTURE.md` for system overview
2. **API Documentation**: Review `docs/API.md` for endpoint specifications
3. **Deployment Process**: Understand `docs/DEPLOYMENT.md` for operational context
4. **Existing Tests**: Examine test files to understand testing patterns

## Development Setup

### Initial Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/prompt2story.git
cd prompt2story

# 3. Add upstream remote
git remote add upstream https://github.com/Surfrrosa/prompt2story.git

# 4. Install dependencies
npm install
cd frontend && npm install && cd ..

# 5. Create environment file
cp .env.example .env
# Edit .env with your development OpenAI API key
```

### Environment Configuration

Create a `.env` file with development settings:

```env
OPENAI_API_KEY=sk-dev-your-development-key-here
TEXT_MODEL=gpt-4o-mini  # Cost optimization for development
JSON_MODEL=gpt-4o-mini  # Cost optimization for development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
NODE_ENV=development
```

### Verify Setup

```bash
# Start development server
npm run dev

# Run tests
npm run test:all

# Check code quality
npm run typecheck
npm run lint
```

## Contribution Workflow

### 1. Issue Tracking

- **Check existing issues** before creating new ones
- **Use issue templates** for bug reports and feature requests
- **Label appropriately**: bug, enhancement, documentation, security
- **Provide context**: Include reproduction steps, expected behavior, environment details

### 2. Branch Strategy

```bash
# Create feature branch from main
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Or for documentation
git checkout -b docs/documentation-update
```

### 3. Commit Standards

Follow conventional commit format:

```bash
# Feature commits
git commit -m "feat: add rate limiting for upload endpoints"

# Bug fixes
git commit -m "fix: resolve CORS issue with production domains"

# Documentation
git commit -m "docs: update API documentation with new endpoints"

# Tests
git commit -m "test: add integration tests for story regeneration"

# Security fixes
git commit -m "security: implement input sanitization for file uploads"
```

### 4. Pull Request Process

#### Before Creating PR

```bash
# Ensure your branch is up to date
git fetch upstream
git rebase upstream/main

# Run comprehensive checks
npm run test:all
npm run typecheck
npm run lint
npm run check-coverage

# Verify build works
npm run build
```

#### PR Requirements

- **Descriptive title** following conventional commit format
- **Detailed description** explaining the change and motivation
- **Testing evidence** showing that changes work as expected
- **Breaking changes** clearly documented if applicable
- **Security implications** addressed if relevant

#### PR Template

```markdown
## Description
Brief description of the change and its purpose.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Security fix

## Testing
- [ ] Unit tests pass (`npm run test`)
- [ ] Integration tests pass (`npm run test:all`)
- [ ] TypeScript compilation succeeds (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Coverage maintains 65%+ threshold (`npm run check-coverage`)

## Security Checklist
- [ ] No sensitive data exposed in code or logs
- [ ] Input validation implemented for new endpoints
- [ ] Rate limiting considered for new functionality
- [ ] CORS implications reviewed

## Documentation
- [ ] Code comments added for complex logic
- [ ] API documentation updated if endpoints changed
- [ ] README updated if setup process changed
- [ ] Architecture docs updated if significant changes made
```

## Code Standards

### TypeScript Standards

#### Type Safety
```typescript
// ✅ Good: Strict typing
interface StoryRequest {
  prompt: string;
  context?: string;
  persona: 'EndUser' | 'Admin' | 'Developer' | 'Stakeholder';
  include_advanced_criteria?: boolean;
}

// ❌ Bad: Any types
function processRequest(data: any): any {
  return data.someProperty;
}
```

#### Error Handling
```typescript
// ✅ Good: Comprehensive error handling
try {
  const result = await openaiClient.generate(prompt);
  return apiResponse.success(result);
} catch (error) {
  if (error instanceof OpenAIError) {
    console.error('OpenAI API error:', error.message, { correlationId });
    return apiResponse.openaiError(error.message);
  }
  throw error; // Unexpected errors should bubble up
}

// ❌ Bad: Silent failures
try {
  const result = await openaiClient.generate(prompt);
  return result;
} catch {
  return null; // Lost error context
}
```

### React Component Standards

#### Component Structure
```typescript
// ✅ Good: Clear component structure
interface StoryCardProps {
  story: Story;
  onRegenerate?: (story: Story) => void;
  showMetadata?: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  onRegenerate,
  showMetadata = false
}) => {
  // Component logic here
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Component JSX */}
    </div>
  );
};
```

#### State Management
```typescript
// ✅ Good: Descriptive state and handlers
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleSubmit = async (formData: FormData) => {
  setIsLoading(true);
  setError(null);

  try {
    const result = await api.generateStory(formData);
    onSuccess(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### API Development Standards

#### Input Validation
```typescript
// ✅ Good: Comprehensive validation
import { z } from 'zod';

const generateStorySchema = z.object({
  prompt: z.string().min(1).max(5000),
  context: z.string().max(2000).optional(),
  persona: z.enum(['EndUser', 'Admin', 'Developer', 'Stakeholder']),
  include_advanced_criteria: z.boolean().optional(),
  include_metadata: z.boolean().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiResponse = new ApiResponse(res, generateCorrelationId());

  try {
    const validatedInput = generateStorySchema.parse(req.body);
    // Process validated input
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiResponse.validationError(error.errors);
    }
    throw error;
  }
}
```

## Testing Requirements

### Test Coverage Standards

Maintain **65%+ coverage** across all modules:

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints with mocked dependencies
- **Component Tests**: Test React component behavior and user interactions
- **Edge Case Tests**: Test error conditions and boundary cases

### Test Organization

```typescript
// ✅ Good: Descriptive test organization
describe('StoryCard Component', () => {
  describe('Rendering', () => {
    it('should display story title, description, and acceptance criteria', () => {
      // Test implementation
    });

    it('should conditionally render metadata when showMetadata is true', () => {
      // Test implementation
    });
  });

  describe('User Interactions', () => {
    it('should copy story content when copy button is clicked', async () => {
      // Test implementation
    });

    it('should call onRegenerate with story data when regenerate clicked', async () => {
      // Test implementation
    });
  });

  describe('Error Handling', () => {
    it('should handle clipboard API failures gracefully', async () => {
      // Test implementation
    });
  });
});
```

### Testing Best Practices

- **Mock external dependencies** (OpenAI API, clipboard, etc.)
- **Test user interactions** rather than implementation details
- **Include accessibility testing** for UI components
- **Test error boundaries** and fallback behavior
- **Use descriptive test names** that explain the expected behavior

## Documentation Standards

### Code Documentation

#### Function Documentation
```typescript
/**
 * Generates user stories from text input using OpenAI API
 *
 * @param prompt - User input describing the feature or requirement
 * @param options - Configuration options for story generation
 * @returns Promise resolving to generated story with metadata
 *
 * @throws {ValidationError} When input validation fails
 * @throws {OpenAIError} When OpenAI API returns an error
 * @throws {RateLimitError} When rate limit is exceeded
 */
async function generateUserStory(
  prompt: string,
  options: GenerationOptions
): Promise<Story> {
  // Implementation
}
```

#### Complex Logic Documentation
```typescript
// Rate limiting cleanup: Remove expired entries to prevent memory leaks
// This runs every 5 minutes and removes entries older than the window duration
const cleanup = () => {
  const now = Date.now();
  for (const [ip, data] of requests.entries()) {
    if (now - data.windowStart > windowMs) {
      requests.delete(ip);
    }
  }
};
```

### API Documentation

When adding or modifying endpoints:

1. **Update `docs/API.md`** with complete endpoint specification
2. **Include request/response examples** with realistic data
3. **Document error conditions** and status codes
4. **Update rate limiting information** if applicable
5. **Add client integration examples** for complex endpoints

## Security Guidelines

### Secure Development Practices

#### Input Validation
- **Validate all inputs** using Zod schemas
- **Sanitize file uploads** and check file types
- **Implement size limits** for uploads and requests
- **Escape user content** before displaying in UI

#### Credential Management
- **Never commit API keys** or sensitive data
- **Use environment variables** for all configuration
- **Rotate development keys** regularly
- **Use separate keys** for each environment

#### Rate Limiting and Abuse Prevention
```typescript
// ✅ Good: Implement appropriate rate limits
const rateLimiters = {
  health: rateLimit({ windowMs: 60 * 1000, maxRequests: 60 }),
  generation: rateLimit({ windowMs: 60 * 1000, maxRequests: 10 }),
  upload: rateLimit({ windowMs: 60 * 1000, maxRequests: 5 }),
};
```

### Security Review Checklist

Before submitting security-related changes:

- [ ] No sensitive data in logs or error messages
- [ ] Input validation covers all edge cases
- [ ] Rate limiting appropriate for endpoint purpose
- [ ] Error messages don't reveal system internals
- [ ] File uploads properly validated and limited
- [ ] CORS configuration reviewed for new origins

## Performance Considerations

### Frontend Performance

- **Code splitting** for large components using `React.lazy`
- **Memoization** for expensive calculations with `useMemo`
- **Debouncing** for user input to reduce API calls
- **Image optimization** with appropriate formats and compression

### Backend Performance

- **OpenAI model selection** based on task complexity
- **Response caching** for identical requests (when appropriate)
- **Memory management** in rate limiters with cleanup mechanisms
- **Error handling efficiency** without expensive operations

### Performance Testing

```typescript
// Example: Test response time requirements
it('should respond to story generation within 5 seconds', async () => {
  const startTime = Date.now();

  const response = await request(app)
    .post('/api/generate-user-stories')
    .send(validRequest);

  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(5000);
  expect(response.status).toBe(200);
});
```

## Review Process

### Self-Review Checklist

Before requesting review, ensure:

- [ ] Code follows established patterns and conventions
- [ ] All tests pass and coverage requirements met
- [ ] TypeScript compilation succeeds without errors
- [ ] Linting passes without warnings
- [ ] Documentation updated for user-facing changes
- [ ] Security implications considered and addressed
- [ ] Performance impact evaluated
- [ ] Breaking changes documented

### Reviewer Guidelines

#### What to Look For

1. **Code Quality**: Readability, maintainability, adherence to patterns
2. **Security**: Input validation, credential handling, rate limiting
3. **Testing**: Adequate coverage and meaningful test cases
4. **Performance**: Efficient algorithms and resource usage
5. **Documentation**: Clear comments and updated documentation

#### Review Feedback

- **Be constructive** and provide specific suggestions
- **Explain the reasoning** behind requested changes
- **Acknowledge good practices** when you see them
- **Ask questions** if the intention isn't clear
- **Suggest improvements** rather than just pointing out problems

### Merge Requirements

Pull requests require:

- [ ] **All CI checks passing** (tests, linting, type checking)
- [ ] **At least one approving review** from a maintainer
- [ ] **No unresolved conversations** in the review
- [ ] **Up-to-date with main branch** (rebase if necessary)
- [ ] **Security review** for security-related changes

## Getting Help

### Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For code-specific questions during review

### Common Issues

#### Development Environment
- **Node.js version conflicts**: Use Node 22+ as specified
- **Dependency installation failures**: Clear cache and reinstall
- **TypeScript errors**: Ensure all dependencies are installed

#### Testing Issues
- **Test failures**: Check for environment variable dependencies
- **Coverage issues**: Ensure new code includes appropriate tests
- **Flaky tests**: Implement proper mocking and timing controls

#### OpenAI Integration
- **API errors**: Verify your development API key is valid
- **Rate limiting**: Use lower-cost models for development
- **Token limits**: Optimize prompts for development efficiency

Thank you for contributing to Prompt2Story! Your efforts help make this tool better for everyone.