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

export async function generateUserStoriesStreaming(
  payload: unknown,
  onChunk: (chunk: string) => void,
  onComplete: (data: any) => void,
  onError: (error: Error) => void
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for streaming

  try {
    const response = await fetch('/api/generate-user-stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ ...payload as any, stream: true }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`API ${response.status}: ${error?.detail ?? response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          if (data.error) {
            onError(new Error(data.error));
            return;
          }

          if (data.done && data.data) {
            onComplete(data.data);
            return;
          }

          if (data.chunk) {
            onChunk(data.chunk);
          }
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      onError(new Error('Request timeout - the operation took too long. Please try again with a shorter input.'));
    } else {
      onError(error as Error);
    }
  }
}

export async function analyzeDesign(payload: unknown) {
  return postJson('/api/analyze-design', payload);
}

export async function regenerateStory(payload: unknown) {
  return postJson('/api/regenerate-story', payload);
}
