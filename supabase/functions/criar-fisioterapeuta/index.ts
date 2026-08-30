// Edge Function: cadastra um novo fisioterapeuta na clínica do admin.
// Recebe { nome, email, registro? }. Só um profissional 'admin' pode chamar.
// Cria o usuário no Supabase Auth com senha temporária e a linha em
// `profissionais` (mesma clínica do admin). Retorna a senha temporária pro
// admin repassar — ela não é salva em lugar nenhum.
//
// Deploy: supabase functions deploy criar-fisioterapeuta

import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

function gerarSenhaTemporaria(): string {
  return (
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

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
  if (admin?.papel !== 'admin') {
    return json({ error: 'Ação restrita a administradores.' }, 403);
  }

  const { nome, email, registro } = await req.json();
  if (!nome || !email) {
    return json({ error: 'nome e email são obrigatórios.' }, 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const senhaTemporaria = gerarSenhaTemporaria();
  const { data: novo, error: erroCriacao } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senhaTemporaria,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (erroCriacao || !novo.user) {
    return json({ error: erroCriacao?.message ?? 'Falha ao criar usuário.' }, 500);
  }

  // Upsert: cobre o caso de um trigger já ter criado uma linha mínima.
  const { error: erroPerfil } = await supabaseAdmin.from('profissionais').upsert(
    {
      id: novo.user.id,
      clinica_id: admin.clinica_id,
      nome,
      email,
      registro: registro ?? null,
      papel: 'fisioterapeuta',
      ativo: true,
    },
    { onConflict: 'id' }
  );
  if (erroPerfil) {
    // desfaz o usuário órfão pra não travar uma segunda tentativa
    await supabaseAdmin.auth.admin.deleteUser(novo.user.id).catch(() => {});
    return json({ error: erroPerfil.message }, 500);
  }

  return json({ email, senha_temporaria: senhaTemporaria }, 200);
});
