// frontend/src/lib/api.ts - Vercel serverless API functions
export async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API ${response.status}: ${error?.detail ?? response.statusText}`);
  }
  
  return response.json();
}

export async function getHealth() {
  const response = await fetch('/api/healthz', { method: 'GET' });
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
  return response.json();
}

export async function generateUserStories(payload: unknown) {
  return postJson('/api/generate-user-stories', payload);
}

export async function analyzeDesign(payload: unknown) {
  return postJson('/api/analyze-design', payload);
}
