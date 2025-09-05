// Environment variable helper for API endpoints
// Provides type-safe access to required and optional environment variables

interface RequiredEnvVars {
  OPENAI_API_KEY: string;
}

interface OptionalEnvVars {
  TEXT_MODEL: string;
  JSON_MODEL: string;
  ALLOWED_ORIGINS: string;
  NODE_ENV: string;
}

// Cache for environment variables to avoid repeated process.env access
let envCache: (RequiredEnvVars & Partial<OptionalEnvVars>) | null = null;

export function getEnv(): RequiredEnvVars & Partial<OptionalEnvVars> {
  if (envCache) {
    return envCache;
  }

  // Validate required environment variables
  const requiredVars: (keyof RequiredEnvVars)[] = ['OPENAI_API_KEY'];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Build environment object with defaults
  envCache = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    TEXT_MODEL: process.env.TEXT_MODEL || 'gpt-4o',
    JSON_MODEL: process.env.JSON_MODEL || 'gpt-4o-mini',
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'https://prompt2story.com,https://*.vercel.app',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };

  return envCache;
}

// Helper to check if request origin is allowed
export function isOriginAllowed(origin: string | null, allowedOrigins?: string): boolean {
  if (!origin) return false;
  
  const allowed = allowedOrigins || getEnv().ALLOWED_ORIGINS || '';
  const origins = allowed.split(',').map(o => o.trim());
  
  return origins.some(allowedOrigin => {
    // Handle wildcard subdomains like https://*.vercel.app
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return allowedOrigin === origin;
  });
}

// Helper to get CORS headers
export function getCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin!;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

// Reset cache (useful for testing)
export function resetEnvCache(): void {
  envCache = null;
}