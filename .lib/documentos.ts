import { supabase } from '@/.lib/supabase';

/**
 * Envia um documento (prescrição, atestado, relatório) por e-mail ao paciente,
 * pela edge function `enviar-documento` (Resend). O corpo do e-mail é o próprio
 * HTML do documento. Erros voltam como string amigável — inclusive quando a
 * function ainda não foi publicada ou o Resend não foi configurado.
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
  if (error) {
    const msg = error.message ?? '';
    if (/not found|404/i.test(msg)) {
      return { error: 'Envio por e-mail ainda não está no ar (edge function não publicada).' };
    }
    return { error: msg || 'Falha ao enviar o e-mail.' };
  }
  return { error: null };
}
