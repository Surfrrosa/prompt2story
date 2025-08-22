// frontend/src/lib/api.ts
const API = import.meta.env.VITE_API_URL; // matches your .env key

if (!API) {
  console.warn('VITE_API_URL is not set'); // helps spot bad env in prod
}

export async function getHealth() {
  const r = await fetch(`${API}/healthz`, { method: 'GET' });
  if (!r.ok) throw new Error(`Health check failed: ${r.status}`);
  return r.json();
}

export async function analyzeDesign(payload: unknown) {
  const r = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Backend ${r.status}: ${body?.error ?? r.statusText}`);
  return body;
}
