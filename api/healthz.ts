export const config = { runtime: "edge" };

export default async function handler() {
  return new Response(JSON.stringify({ ok: true, service: "prompt2story", version: "v1" }), {
    status: 200, 
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}