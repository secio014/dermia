// Edge Function: envia um documento (PDF) por e-mail ao paciente via Resend.
// Recebe { paciente_id, assunto, corpo, pdf_base64, nome_arquivo }.
// Quem chama precisa enxergar o paciente (RLS com a sessão do usuário).
// O "de" é o remetente verificado do app (uma conta Resend só, não uma por
// fisioterapeuta); o "para" é `pacientes.email`.
//
// Secrets necessários:
//   supabase secrets set RESEND_API_KEY=...
//   supabase secrets set EMAIL_REMETENTE="DermIA <no-reply@seu-dominio>"
// Deploy: supabase functions deploy enviar-documento

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

  const { paciente_id, assunto, corpo, pdf_base64, nome_arquivo } = await req.json();
  if (!paciente_id || !pdf_base64) {
    return new Response(
      JSON.stringify({ error: 'paciente_id e pdf_base64 são obrigatórios.' }),
      { status: 400 }
    );
  }

  const { data: paciente, error: erroPaciente } = await supabaseUsuario
    .from('pacientes')
    .select('nome_completo, email')
    .eq('id', paciente_id)
    .single();
  if (erroPaciente || !paciente) {
    return new Response(JSON.stringify({ error: 'Paciente não encontrado ou sem permissão.' }), {
      status: 404,
    });
  }
  if (!paciente.email) {
    return new Response(
      JSON.stringify({ error: 'Este paciente não tem e-mail cadastrado.' }),
      { status: 400 }
    );
  }

  const apiKey = Deno.env.get('RESEND_API_KEY');
  const remetente = Deno.env.get('EMAIL_REMETENTE');
  if (!apiKey || !remetente) {
    return new Response(
      JSON.stringify({ error: 'Envio de e-mail não configurado (RESEND_API_KEY / EMAIL_REMETENTE).' }),
      { status: 503 }
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
      text:
        corpo ||
        `Olá, ${paciente.nome_completo ?? ''}.\n\nSegue em anexo o documento do seu acompanhamento.\n\nDermIA`,
      attachments: [
        {
          filename: nome_arquivo || 'documento.pdf',
          content: pdf_base64,
        },
      ],
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    return new Response(JSON.stringify({ error: `Falha no envio: ${detalhe}` }), {
      status: 502,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
