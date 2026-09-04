// Edge Function: o próprio paciente atualiza os dados cadastrais do seu
// prontuário (nome, e-mail, telefone, data de nascimento). Recebe qualquer
// subconjunto de { nome_completo, email, telefone, data_nascimento }.
//
// Roda em duas etapas: primeiro confirma (com a sessão do paciente, sob RLS)
// que existe uma linha em `pacientes` com `user_id = auth.uid()`; depois grava
// só os campos permitidos com o service role. Assim o paciente nunca escreve
// direto na tabela — não dá pra ele mudar `clinica_id`, `consentimento_em`,
// `codigo_pseudonimo` etc. mesmo manipulando o corpo da requisição.
//
// Deploy: supabase functions deploy atualizar-meus-dados-paciente

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

  const { data: paciente } = await supabaseUsuario
    .from('pacientes')
    .select('id')
    .eq('user_id', usuario.user.id)
    .maybeSingle();
  if (!paciente) {
    return json({ error: 'Esta conta não está vinculada a um paciente.' }, 404);
  }

  const body = await req.json().catch(() => ({}));
  const permitido: Record<string, string | null> = {};

  if (typeof body.nome_completo === 'string') {
    const nome = body.nome_completo.trim();
    if (nome.length < 2) return json({ error: 'Nome muito curto.' }, 400);
    permitido.nome_completo = nome;
  }
  if (typeof body.email === 'string') {
    permitido.email = body.email.trim() || null;
  }
  if (typeof body.telefone === 'string') {
    const digitos = body.telefone.replace(/\D/g, '').slice(0, 11);
    permitido.telefone = digitos || null;
  }
  if (typeof body.data_nascimento === 'string') {
    permitido.data_nascimento = body.data_nascimento || null;
  }

  if (Object.keys(permitido).length === 0) {
    return json({ error: 'Nada para atualizar.' }, 400);
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error } = await supabaseAdmin
    .from('pacientes')
    .update(permitido)
    .eq('id', paciente.id);
  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true }, 200);
});
