// Edge Function: cria o login do portal do paciente.
// Recebe { paciente_id, email } (chamada pelo app do profissional, autenticado).
// Cria o usuário no Supabase Auth com uma senha temporária e vincula
// pacientes.user_id a ele. Retorna a senha temporária pro profissional
// repassar ao paciente (ela não é salva em lugar nenhum).
//
// Deploy: supabase functions deploy criar-acesso-paciente

import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

function gerarSenhaTemporaria(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase();
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Não autenticado.' }, 401);
  }

  const supabaseUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: usuario } = await supabaseUsuario.auth.getUser();
  if (!usuario.user) {
    return json({ error: 'Sessão inválida.' }, 401);
  }

  const { paciente_id, email } = await req.json();
  if (!paciente_id || !email) {
    return json({ error: 'paciente_id e email são obrigatórios.' }, 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Confere que quem chamou é profissional da mesma clínica do paciente (RLS
  // com a sessão do usuário, não com o service role).
  const { data: paciente, error: erroPaciente } = await supabaseUsuario
    .from('pacientes')
    .select('id, user_id')
    .eq('id', paciente_id)
    .single();
  if (erroPaciente || !paciente) {
    return json({ error: 'Paciente não encontrado ou sem permissão.' }, 404);
  }
  if (paciente.user_id) {
    return json({ error: 'Este paciente já tem acesso ao portal.' }, 409);
  }

  const senhaTemporaria = gerarSenhaTemporaria();
  const { data: novoUsuario, error: erroCriacao } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senhaTemporaria,
    email_confirm: true,
  });
  if (erroCriacao || !novoUsuario.user) {
    return json({ error: erroCriacao?.message ?? 'Falha ao criar usuário.' }, 500);
  }

  const { error: erroVinculo } = await supabaseAdmin
    .from('pacientes')
    .update({ user_id: novoUsuario.user.id })
    .eq('id', paciente_id);
  if (erroVinculo) {
    return json({ error: erroVinculo.message }, 500);
  }

  return json({ email, senha_temporaria: senhaTemporaria }, 200);
});
