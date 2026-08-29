// Edge Function: cadastra um novo fisioterapeuta na clínica do admin.
// Recebe { nome, email, registro? }. Só um profissional 'admin' pode chamar.
// Cria o usuário no Supabase Auth com senha temporária e a linha em
// `profissionais` (mesma clínica do admin). Retorna a senha temporária pro
// admin repassar — ela não é salva em lugar nenhum.
//
// Deploy: supabase functions deploy criar-fisioterapeuta

import { createClient } from 'npm:@supabase/supabase-js@2';

function gerarSenhaTemporaria(): string {
  return (
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

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

  const { data: admin } = await supabaseUsuario
    .from('profissionais')
    .select('papel, clinica_id')
    .eq('id', usuario.user.id)
    .single();
  if (admin?.papel !== 'admin') {
    return new Response(JSON.stringify({ error: 'Ação restrita a administradores.' }), {
      status: 403,
    });
  }

  const { nome, email, registro } = await req.json();
  if (!nome || !email) {
    return new Response(JSON.stringify({ error: 'nome e email são obrigatórios.' }), {
      status: 400,
    });
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
    return new Response(
      JSON.stringify({ error: erroCriacao?.message ?? 'Falha ao criar usuário.' }),
      { status: 500 }
    );
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
    return new Response(JSON.stringify({ error: erroPerfil.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ email, senha_temporaria: senhaTemporaria }), {
    status: 200,
  });
});
