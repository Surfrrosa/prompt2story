export function setCorsHeaders(res: any, corsHeaders: any) {
  if (corsHeaders && typeof corsHeaders === 'object') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
}
