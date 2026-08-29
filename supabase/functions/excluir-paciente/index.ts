// Edge Function: exclui um paciente DE VEZ (hard delete).
// Recebe { paciente_id }. Só um profissional com papel 'admin' pode chamar.
// Apaga (com service role) o usuário do portal em auth.users, se houver, e a
// linha em `pacientes` — a cascata do banco remove lesões, fotos, registros,
// prescrições, consultas e exercícios. Best-effort na limpeza do Storage.
//
// Deploy: supabase functions deploy excluir-paciente

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), { status: 401 });
  }

  const supabaseUsuario = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: usuario } = await supabaseUsuario.auth.getUser();
  if (!usuario.user) {
    return new Response(JSON.stringify({ error: 'Sessão inválida.' }), { status: 401 });
  }

  const { data: perfil } = await supabaseUsuario
    .from('profissionais')
    .select('papel')
    .eq('id', usuario.user.id)
    .single();
  if (perfil?.papel !== 'admin') {
    return new Response(JSON.stringify({ error: 'Ação restrita a administradores.' }), {
      status: 403,
    });
  }

  const { paciente_id } = await req.json();
  if (!paciente_id) {
    return new Response(JSON.stringify({ error: 'paciente_id é obrigatório.' }), { status: 400 });
  }

  // Confere que o admin enxerga esse paciente (RLS com a sessão do usuário).
  const { data: paciente, error: erroPaciente } = await supabaseUsuario
    .from('pacientes')
    .select('id, user_id')
    .eq('id', paciente_id)
    .single();
  if (erroPaciente || !paciente) {
    return new Response(JSON.stringify({ error: 'Paciente não encontrado ou sem permissão.' }), {
      status: 404,
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  if (paciente.user_id) {
    await supabaseAdmin.auth.admin.deleteUser(paciente.user_id).catch(() => {});
  }

  // Limpeza best-effort das fotos da lesão desse paciente.
  try {
    const { data: lesoes } = await supabaseAdmin
      .from('lesoes')
      .select('id')
      .eq('paciente_id', paciente_id);
    for (const l of lesoes ?? []) {
      const { data: arquivos } = await supabaseAdmin.storage
        .from('fotos-lesoes')
        .list(String(l.id));
      if (arquivos?.length) {
        await supabaseAdmin.storage
          .from('fotos-lesoes')
          .remove(arquivos.map((a) => `${l.id}/${a.name}`));
      }
    }
  } catch (_) {
    // ignora — o registro clínico some de qualquer forma
  }

  const { error: erroDelete } = await supabaseAdmin
    .from('pacientes')
    .delete()
    .eq('id', paciente_id);
  if (erroDelete) {
    return new Response(JSON.stringify({ error: erroDelete.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
