// Edge Function: envia um documento (prescrição, atestado ou relatório) por
// e-mail ao paciente, via Resend. Recebe { paciente_id, assunto, html }.
// Quem chama precisa enxergar o paciente (RLS com a sessão do usuário).
// O "de" é o remetente verificado do app (uma conta Resend só, não uma por
// fisioterapeuta); o "para" é `pacientes.email`. O corpo do e-mail é o próprio
// HTML do documento (sem anexo PDF — evita dependência de conversão).
//
// Secrets necessários:
//   supabase secrets set RESEND_API_KEY=...
//   supabase secrets set EMAIL_REMETENTE="DermIA <no-reply@seu-dominio>"
// Deploy: supabase functions deploy enviar-documento

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

  const { paciente_id, assunto, html } = await req.json();
  if (!paciente_id || !html) {
    return json({ error: 'paciente_id e html são obrigatórios.' }, 400);
  }

  const { data: paciente, error: erroPaciente } = await supabaseUsuario
    .from('pacientes')
    .select('nome_completo, email')
    .eq('id', paciente_id)
    .single();
  if (erroPaciente || !paciente) {
    return json({ error: 'Paciente não encontrado ou sem permissão.' }, 404);
  }
  if (!paciente.email) {
    return json({ error: 'Este paciente não tem e-mail cadastrado.' }, 400);
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const remetente = Deno.env.get('EMAIL_REMETENTE');
  if (!apiKey || !remetente) {
    return json(
      { error: 'Envio de e-mail ainda não configurado (RESEND_API_KEY / EMAIL_REMETENTE).' },
      503
    );
  }

  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: remetente,
      to: [paciente.email],
      subject: assunto || 'Documento do seu acompanhamento — DermIA',
      html,
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    return json({ error: `Falha no envio: ${detalhe}` }, 502);
  }

  return json({ ok: true }, 200);
});
