import { supabase } from '@/.lib/supabase';

/**
 * Envia um documento (prescrição, atestado, relatório) por e-mail ao paciente,
 * pela edge function `enviar-documento` (Resend). O corpo do e-mail é o próprio
 * HTML do documento. Erros voltam como string amigável — inclusive quando a
 * function ainda não foi publicada, o Resend não foi configurado, ou o Resend
 * recusou o envio (domínio não verificado, destinatário não permitido no modo
 * de teste, etc.).
 */
export async function enviarDocumentoPorEmail({
  pacienteId,
  assunto,
  html,
}: {
  pacienteId: string;
  assunto: string;
  html: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke('enviar-documento', {
    body: { paciente_id: pacienteId, assunto, html },
  });
  if (!error) return { error: null };

  // supabase-js embrulha um retorno não-2xx num FunctionsHttpError cujo
  // `.message` é genérico ("Edge Function returned a non-2xx status code"). O
  // JSON real ({ error: "..." }) fica no `.context` (a Response).
  let detalhe = '';
  const ctx = (error as { context?: Response }).context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const corpo = await ctx.json();
      if (corpo && typeof corpo.error === 'string') detalhe = corpo.error;
    } catch {
      /* corpo não era JSON */
    }
  }
  if (!detalhe) detalhe = error.message ?? '';

  if (/not found|404/i.test(detalhe)) {
    return { error: 'Envio por e-mail ainda não está no ar (edge function não publicada).' };
  }
  return { error: detalhe || 'Falha ao enviar o e-mail.' };
}
