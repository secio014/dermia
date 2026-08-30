// Headers de CORS compartilhados por todas as Edge Functions.
// Sem isso, chamadas do app web (navegador) falham no preflight OPTIONS com
// "Failed to send a request to the Edge Function".

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Resposta JSON já com os headers de CORS + content-type.
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Trata o preflight. Retorna uma Response se for OPTIONS, senão null.
export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}
