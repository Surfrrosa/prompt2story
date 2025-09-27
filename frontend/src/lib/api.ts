// frontend/src/lib/api.ts - Vercel serverless API functions
export async function postJson(url: string, body: unknown) {
  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`API ${response.status}: ${error?.detail ?? response.statusText}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - the operation took too long. Please try again with a shorter input.');
    }
    throw error;
  }
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

export async function regenerateStory(payload: unknown) {
  return postJson('/api/regenerate-story', payload);
}
