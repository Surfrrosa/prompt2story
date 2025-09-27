# API Documentation

## Overview

The Prompt2Story API provides secure, rate-limited endpoints for AI-powered user story generation. All endpoints use standardized error handling with correlation IDs and comprehensive request validation.

## Base Configuration

### Base URL
- **Production**: `https://your-domain.com/api`
- **Development**: `http://localhost:3000/api`

### Authentication
No authentication required. Rate limiting is applied per IP address.

### Rate Limits

| Endpoint Type | Requests/Minute | Reset Window |
|---------------|-----------------|--------------|
| Health Check | 60 | 60 seconds |
| Story Generation | 10 | 60 seconds |
| File Upload | 5 | 60 seconds |
| Standard | 30 | 60 seconds |

### Response Format

All API responses follow a standardized format:

#### Success Response
```typescript
{
  data: T,                    // Response payload
  correlationId: string,      // Request tracking ID
  timestamp: string          // ISO 8601 timestamp
}
```

#### Error Response
```typescript
{
  error: {
    message: string,          // Human-readable error
    type: string,            // Error classification
    details?: object,        // Additional error context
    correlationId: string    // Request tracking ID
  },
  correlationId: string,
  timestamp: string
}
```

### Headers

#### Rate Limiting Headers
```
X-RateLimit-Limit: 10           # Requests allowed per window
X-RateLimit-Remaining: 9        # Requests remaining
X-RateLimit-Reset: 1640995260   # Reset timestamp (Unix)
```

#### CORS Headers
```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

## Endpoints

### Health Check

Monitor service health and configuration.

#### `GET /api/healthz`

**Description**: Returns service health status and basic information.

**Rate Limit**: 60 requests/minute

**Request**:
```http
GET /api/healthz
```

**Response**:
```json
{
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "environment": "production",
    "uptime": 12345.67,
    "version": "1.0.0"
  },
  "correlationId": "health-abc123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `503 Service Unavailable`: Service degraded or unavailable

---

### Generate User Stories

Convert text prompts into structured user stories.

#### `POST /api/generate-user-stories`

**Description**: Generates user stories from text input using AI processing.

**Rate Limit**: 10 requests/minute

**Request Schema**:
```typescript
{
  prompt: string,                      // Required: Input text (1-5000 chars)
  context?: string,                    // Optional: Additional context
  persona?: 'EndUser' | 'Admin' | 'Developer' | 'Stakeholder',
  include_advanced_criteria?: boolean, // Include edge cases and considerations
  include_metadata?: boolean,          // Include priority and story points
  expand_all_components?: boolean      // Detailed component breakdown
}
```

**Example Request**:
```http
POST /api/generate-user-stories
Content-Type: application/json

{
  "prompt": "Create a user authentication system with email verification and password reset functionality",
  "context": "E-commerce web application with mobile support",
  "persona": "EndUser",
  "include_advanced_criteria": true,
  "include_metadata": true
}
```

**Success Response**:
```json
{
  "data": {
    "title": "User Authentication System",
    "story": "As an end user, I want to securely log into the e-commerce platform using my email and password so that I can access my personalized account and make purchases.",
    "acceptance_criteria": [
      "Given valid email and password, when I submit the login form, then I should be redirected to my dashboard",
      "Given invalid credentials, when I submit the login form, then I should see a clear error message",
      "Given I forgot my password, when I click 'Forgot Password', then I should receive a reset email"
    ],
    "edge_cases": [
      "Account locked after multiple failed attempts",
      "Email verification required for new accounts",
      "Session timeout handling"
    ],
    "considerations": [
      "GDPR compliance for user data",
      "Two-factor authentication support",
      "Password strength requirements"
    ],
    "priority": "High",
    "story_points": 8
  },
  "correlationId": "gen-xyz789",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input validation
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: OpenAI API error or processing failure

---

### Analyze Design

Extract requirements from design images.

#### `POST /api/analyze-design`

**Description**: Analyzes uploaded design images to generate user stories.

**Rate Limit**: 5 requests/minute

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `image`: Image file (PNG, JPG, JPEG, WEBP, GIF)
- `include_advanced_criteria`: `"true"` or `"false"` (optional)
- `expand_all_components`: `"true"` or `"false"` (optional)
- `include_metadata`: `"true"` or `"false"` (optional)

**Example Request**:
```http
POST /api/analyze-design
Content-Type: multipart/form-data

--boundary123
Content-Disposition: form-data; name="image"; filename="wireframe.png"
Content-Type: image/png

[Binary image data]
--boundary123
Content-Disposition: form-data; name="include_advanced_criteria"

true
--boundary123
Content-Disposition: form-data; name="expand_all_components"

true
--boundary123--
```

**Success Response**:
```json
{
  "data": {
    "title": "Dashboard Interface Design",
    "story": "As a user, I want to view my key metrics and recent activity on a dashboard so that I can quickly understand my account status and take appropriate actions.",
    "acceptance_criteria": [
      "Given I am logged in, when I navigate to the dashboard, then I should see my key metrics displayed prominently",
      "Given there are recent activities, when I view the dashboard, then I should see a chronological list of recent actions",
      "Given I want to take action, when I click on any metric or activity, then I should be navigated to the relevant detail page"
    ],
    "components": [
      {
        "name": "Header Navigation",
        "description": "Top navigation bar with user menu and notifications"
      },
      {
        "name": "Metrics Cards",
        "description": "Key performance indicators displayed as cards"
      },
      {
        "name": "Activity Feed",
        "description": "Chronological list of recent user activities"
      }
    ],
    "edge_cases": [
      "No data available for new users",
      "Large datasets causing performance issues",
      "Responsive design for mobile viewing"
    ],
    "priority": "Medium",
    "story_points": 5
  },
  "correlationId": "design-abc456",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid file format or size
- `413 Payload Too Large`: File exceeds size limit
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Image processing failure

---

### Regenerate Story

Refine existing stories based on feedback.

#### `POST /api/regenerate-story`

**Description**: Improves or modifies existing user stories based on feedback.

**Rate Limit**: 10 requests/minute

**Request Schema**:
```typescript
{
  original_input: string,              // Required: Original prompt or context
  current_story: object,               // Required: Current story object
  feedback: string,                    // Required: Improvement feedback
  include_advanced_criteria?: boolean,
  include_metadata?: boolean,
  expand_all_components?: boolean
}
```

**Example Request**:
```http
POST /api/regenerate-story
Content-Type: application/json

{
  "original_input": "User authentication system",
  "current_story": {
    "title": "User Login",
    "story": "As a user, I want to log in...",
    "acceptance_criteria": ["..."]
  },
  "feedback": "Make the acceptance criteria more specific and include security considerations",
  "include_advanced_criteria": true,
  "include_metadata": true
}
```

**Success Response**:
```json
{
  "data": {
    "title": "Secure User Authentication System",
    "story": "As a security-conscious user, I want to log into the system using multi-factor authentication so that my account remains protected from unauthorized access.",
    "acceptance_criteria": [
      "Given valid credentials and 2FA code, when I submit the login form, then I should be authenticated and redirected to my dashboard within 2 seconds",
      "Given invalid credentials, when I submit the login form, then I should see a generic error message without revealing which field is incorrect",
      "Given 3 failed login attempts, when I try again, then my account should be temporarily locked for 15 minutes"
    ],
    "edge_cases": [
      "2FA device unavailable - backup codes required",
      "Account locked due to suspicious activity",
      "Session hijacking prevention"
    ],
    "considerations": [
      "OWASP security compliance",
      "Biometric authentication support for mobile",
      "GDPR-compliant audit logging"
    ],
    "priority": "Critical",
    "story_points": 13
  },
  "correlationId": "regen-def789",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input or missing required fields
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Processing failure

## Error Handling

### Error Types

| Type | Description | Typical Status |
|------|-------------|----------------|
| `validation_error` | Input validation failed | 400 |
| `rate_limit_error` | Rate limit exceeded | 429 |
| `openai_error` | OpenAI API issue | 500 |
| `processing_error` | Internal processing failure | 500 |
| `configuration_error` | Server misconfiguration | 500 |

### Rate Limit Error

When rate limits are exceeded:

```json
{
  "error": {
    "message": "Rate limit exceeded. Try again in 45 seconds.",
    "type": "rate_limit_error",
    "retryAfter": 45,
    "correlationId": "rate-limit-123"
  },
  "correlationId": "rate-limit-123",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Validation Error

When input validation fails:

```json
{
  "error": {
    "message": "Validation failed",
    "type": "validation_error",
    "details": {
      "prompt": "String must contain at least 1 character(s)",
      "persona": "Invalid enum value. Expected 'EndUser' | 'Admin' | 'Developer' | 'Stakeholder'"
    },
    "correlationId": "validation-456"
  },
  "correlationId": "validation-456",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Client Integration

### JavaScript/TypeScript Example

```typescript
class Prompt2StoryAPI {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async generateStory(request: GenerateStoryRequest): Promise<StoryResponse> {
    const response = await fetch(`${this.baseUrl}/generate-user-stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.error.message, error.error.type, error.correlationId);
    }

    return response.json();
  }

  async analyzeDesign(file: File, options: AnalyzeOptions = {}): Promise<StoryResponse> {
    const formData = new FormData();
    formData.append('image', file);

    if (options.include_advanced_criteria) {
      formData.append('include_advanced_criteria', 'true');
    }
    if (options.expand_all_components) {
      formData.append('expand_all_components', 'true');
    }

    const response = await fetch(`${this.baseUrl}/analyze-design`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.error.message, error.error.type, error.correlationId);
    }

    return response.json();
  }

  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseUrl}/healthz`);
    return response.json();
  }
}

class APIError extends Error {
  constructor(
    message: string,
    public type: string,
    public correlationId: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

### Rate Limit Handling

```typescript
async function makeRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (error instanceof APIError && error.type === 'rate_limit_error') {
        if (attempt === maxRetries) throw error;

        // Extract retry delay from error message or use exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### cURL Examples

#### Health Check
```bash
curl -X GET https://your-domain.com/api/healthz \
  -H "Accept: application/json"
```

#### Generate Story
```bash
curl -X POST https://your-domain.com/api/generate-user-stories \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "User dashboard with analytics",
    "persona": "EndUser",
    "include_advanced_criteria": true,
    "include_metadata": true
  }'
```

#### Upload Design
```bash
curl -X POST https://your-domain.com/api/analyze-design \
  -F "image=@wireframe.png" \
  -F "include_advanced_criteria=true" \
  -F "expand_all_components=true"
```

## OpenAPI Specification

For integration with API development tools, see the complete OpenAPI 3.0 specification:

```yaml
openapi: 3.0.0
info:
  title: Prompt2Story API
  version: 1.0.0
  description: AI-powered user story generation API
servers:
  - url: https://your-domain.com/api
    description: Production server
  - url: http://localhost:3000/api
    description: Development server
```

(Full OpenAPI spec available in `docs/openapi.yaml`)

## Best Practices

### Request Optimization
- Include context for better story generation
- Use appropriate persona selection
- Enable advanced criteria for comprehensive stories
- Batch requests when possible to respect rate limits

### Error Handling
- Always check for rate limit headers
- Implement exponential backoff for retries
- Log correlation IDs for debugging
- Provide user-friendly error messages

### Performance
- Cache responses for identical requests
- Use compression for large requests
- Monitor response times and optimize accordingly
- Implement timeout handling for slow requests

### Security
- Never expose API keys in client-side code
- Validate file uploads before sending
- Monitor for unusual usage patterns
- Implement client-side rate limiting