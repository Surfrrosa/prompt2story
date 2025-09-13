// api/_env.ts
// Centralized env + CORS helpers. (Breadcrumb: single source of truth for headers.)
import type { VercelResponse } from '@vercel/node';

let envCache: null | {
  OPENAI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
  JSON_MODEL?: string;
  TEXT_MODEL?: string;
} = null;

export function getEnv() {
  if (envCache) return envCache;
  envCache = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS, // comma or space sep; supports wildcard later
    JSON_MODEL: process.env.JSON_MODEL,
    TEXT_MODEL: process.env.TEXT_MODEL,
  };
  return envCache;
}

export function isOriginAllowed(origin: string | null): boolean {
  const { ALLOWED_ORIGINS } = getEnv();
  if (!origin) return false;
  if (!ALLOWED_ORIGINS) return false;
  const list = ALLOWED_ORIGINS.split(/[,\s]+/).filter(Boolean);
  return list.some((allowed) => {
    if (allowed === '*') return true;
    if (allowed.includes('*')) {
      // wildcard support: https://*.vercel.app
      const regex = new RegExp('^' + allowed.split('*').map(escapeRegex).join('.*') + '$');
      return regex.test(origin);
    }
    return allowed === origin;
  });
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
  if (isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin!;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

export function setCorsHeaders(res: VercelResponse, origin: string | null): void {
  const headers = getCorsHeaders(origin);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function resetEnvCache(): void {
  envCache = null;
}
