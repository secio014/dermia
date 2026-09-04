// Edge Function: exclui um profissional (equipe) DE VEZ (hard delete).
// Recebe { profissional_id }.
//  - 'admin' só apaga gente da própria clínica; 'admin_geral' apaga de qualquer uma.
//  - Ninguém apaga a própria conta por aqui (evita se trancar fora sem querer).
// Apaga (com service role) o usuário em auth.users e a linha em `profissionais`.
// Se houver referências (paciente, lesão, registro etc. criados por essa
// pessoa) com FK sem ON DELETE CASCADE/SET NULL, o banco recusa o delete —
// nesse caso a resposta pede pra desativar em vez de excluir.
//
// Deploy: supabase functions deploy excluir-profissional

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

  const { data: admin } = await supabaseUsuario
    .from('profissionais')
    .select('papel, clinica_id')
    .eq('id', usuario.user.id)
    .single();
  if (admin?.papel !== 'admin' && admin?.papel !== 'admin_geral') {
    return json({ error: 'Ação restrita a administradores.' }, 403);
  }

  const { profissional_id } = await req.json();
  if (!profissional_id) {
    return json({ error: 'profissional_id é obrigatório.' }, 400);
  }
  if (profissional_id === usuario.user.id) {
    return json({ error: 'Você não pode excluir a própria conta por aqui.' }, 400);
  }

  // Confere que o admin enxerga esse profissional (RLS com a sessão do usuário
  // já restringe 'admin' à própria clínica).
  const { data: alvo, error: erroAlvo } = await supabaseUsuario
    .from('profissionais')
    .select('id')
    .eq('id', profissional_id)
    .single();
  if (erroAlvo || !alvo) {
    return json({ error: 'Profissional não encontrado ou sem permissão.' }, 404);
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error: erroDelete } = await supabaseAdmin
    .from('profissionais')
    .delete()
    .eq('id', profissional_id);
  if (erroDelete) {
    const bloqueadoPorReferencia = erroDelete.message.toLowerCase().includes('foreign key');
    return json(
      {
        error: bloqueadoPorReferencia
          ? 'Esse profissional já tem pacientes, lesões ou registros vinculados — desative o acesso em vez de excluir.'
          : erroDelete.message,
      },
      bloqueadoPorReferencia ? 409 : 500
    );
  }

  await supabaseAdmin.auth.admin.deleteUser(profissional_id).catch(() => {});

  return json({ ok: true }, 200);
});
