import { getCorsHeaders } from './_env';

export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ ok: true, service: "prompt2story", version: "v1" }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders
    }
  });
}