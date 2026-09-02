// Edge Function: exclui uma análise de IA e a foto dela.
// Recebe { analise_id }. Qualquer profissional que enxergue a lesão (RLS) pode
// chamar. Apaga o objeto no Storage (best-effort) e a linha em `analises_ia`
// com service role, contornando a falta de policy de DELETE no client.
//
// Deploy: supabase functions deploy excluir-analise

import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Não autenticado.' }, 401);
  }

  const supabaseUsuario = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: usuario } = await supabaseUsuario.auth.getUser();
  if (!usuario.user) {
    return json({ error: 'Sessão inválida.' }, 401);
  }

  const { analise_id } = await req.json();
  if (!analise_id) {
    return json({ error: 'analise_id é obrigatório.' }, 400);
  }

  // RLS com a sessão do usuário: confirma que ele pode ver essa análise.
  const { data: analise, error: erroAnalise } = await supabaseUsuario
    .from('analises_ia')
    .select('id, foto_path')
    .eq('id', analise_id)
    .single();
  if (erroAnalise || !analise) {
    return json({ error: 'Análise não encontrada ou sem permissão.' }, 404);
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (analise.foto_path) {
    await supabaseAdmin.storage.from('fotos-lesoes').remove([analise.foto_path]).catch(() => {});
  }

  const { error: erroDelete } = await supabaseAdmin
    .from('analises_ia')
    .delete()
    .eq('id', analise_id);
  if (erroDelete) {
    return json({ error: erroDelete.message }, 500);
  }

  return json({ ok: true }, 200);
});
