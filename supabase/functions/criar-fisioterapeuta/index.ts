// Edge Function: cadastra um novo membro de equipe (fisioterapeuta, estagiário
// ou admin de clínica).
// Recebe { nome, email, registro?, papel?, clinica_id? }.
//  - Só um profissional 'admin' ou 'admin_geral' pode chamar.
//  - 'admin' cadastra sempre na própria clínica; 'admin_geral' pode informar
//    `clinica_id` (senão cai na clínica dele).
//  - `papel` ∈ {fisioterapeuta, estagiario, admin}; default 'fisioterapeuta'.
// Cria o usuário no Supabase Auth com senha temporária e a linha em
// `profissionais`. Retorna a senha temporária pro admin repassar — ela não é
// salva em lugar nenhum.
//
// Deploy: supabase functions deploy criar-fisioterapeuta

import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';

const PAPEIS_CRIAVEIS = ['fisioterapeuta', 'estagiario', 'admin', 'admin_geral'];

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
  if (admin?.papel !== 'admin' && admin?.papel !== 'admin_geral') {
    return json({ error: 'Ação restrita a administradores.' }, 403);
  }

  const {
    nome,
    email,
    registro,
    papel: papelBruto,
    clinica_id: clinicaBruta,
  } = await req.json();
  if (!nome || !email) {
    return json({ error: 'nome e email são obrigatórios.' }, 400);
  }

  const papel = papelBruto ?? 'fisioterapeuta';
  if (!PAPEIS_CRIAVEIS.includes(papel)) {
    return json({ error: 'papel inválido.' }, 400);
  }
  // Só um admin_geral pode criar outro admin_geral — um admin de clínica não
  // pode se auto-promover a esse nível pedindo o papel certo no body.
  if (papel === 'admin_geral' && admin.papel !== 'admin_geral') {
    return json({ error: 'Só um admin geral pode criar outro admin geral.' }, 403);
  }

  // 'admin_geral' escolhe a clínica; 'admin' fica preso à própria. Um novo
  // usuário 'admin_geral' não precisa de clínica nenhuma — é papel de
  // plataforma, não de uma clínica específica.
  const clinicaAlvo =
    papel === 'admin_geral'
      ? null
      : admin.papel === 'admin_geral'
        ? (clinicaBruta ?? admin.clinica_id)
        : admin.clinica_id;
  if (papel !== 'admin_geral' && !clinicaAlvo) {
    return json({ error: 'Informe a clínica do novo usuário.' }, 400);
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
      clinica_id: clinicaAlvo,
      nome,
      email,
      registro: registro ?? null,
      papel,
      ativo: true,
    },
    { onConflict: 'id' }
  );
  if (erroPerfil) {
    // desfaz o usuário órfão pra não travar uma segunda tentativa
    await supabaseAdmin.auth.admin.deleteUser(novo.user.id).catch(() => {});
    return json({ error: erroPerfil.message }, 500);
  }

  return json({ email, senha_temporaria: senhaTemporaria, papel }, 200);
});
