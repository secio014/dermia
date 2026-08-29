// Edge Function: recebe { analise_id }, busca a foto no Storage, chama um
// servidor de IA (Ollama) rodando à parte na internet pra sugerir o grau
// clínico da queimadura, valida a resposta com Zod e grava em analises_ia.
//
// Contrato do servidor externo:
//   POST {OLLAMA_HOST}/api/generate
//   body: { model, prompt, images: [base64], format: "json", stream: false }
//   resposta esperada: { response: "<JSON string>" }, onde o JSON casa com
//   ResultadoOllama abaixo ({ grau_sugerido, confianca 0-1, observacao? }).
//
// Enquanto OLLAMA_HOST não estiver setado, cada análise fica status="erro"
// (tratado) e o app segue com validação manual — nada quebra.
//
// Deploy: supabase functions deploy analisar-lesao
// Variáveis necessárias (supabase secrets set ...):
//   OLLAMA_HOST   ex: https://ia.seu-dominio.com  (precisa ser público/HTTPS)
//   OLLAMA_MODELO ex: llama3.2-vision
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetadas automaticamente.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

// analises_ia.confianca tem check constraint 0-1 (fração, não percentual).
const ResultadoOllama = z.object({
  grau_sugerido: z.enum(['1', '2_superficial', '2_profundo', '3']),
  confianca: z.number().min(0).max(1),
  observacao: z.string().optional(),
});

Deno.serve(async (req) => {
  const inicio = Date.now();
  const { analise_id } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const marcarErro = async (mensagem: string) => {
    await supabase
      .from('analises_ia')
      .update({ status: 'erro', erro_mensagem: mensagem })
      .eq('id', analise_id);
    return new Response(JSON.stringify({ error: mensagem }), { status: 200 });
  };

  const ollamaHost = Deno.env.get('OLLAMA_HOST');
  const ollamaModelo = Deno.env.get('OLLAMA_MODELO') ?? 'llama3.2-vision';
  if (!ollamaHost) {
    return marcarErro('OLLAMA_HOST não configurado — configure o secret e faça o deploy de novo.');
  }

  const { data: analise, error: erroAnalise } = await supabase
    .from('analises_ia')
    .select('foto_path')
    .eq('id', analise_id)
    .single();
  if (erroAnalise || !analise) {
    return marcarErro(`Análise não encontrada: ${erroAnalise?.message ?? analise_id}`);
  }

  const { data: arquivo, error: erroArquivo } = await supabase.storage
    .from('fotos-lesoes')
    .download(analise.foto_path);
  if (erroArquivo || !arquivo) {
    return marcarErro(`Falha ao baixar a foto: ${erroArquivo?.message}`);
  }

  const base64 = btoa(String.fromCharCode(...new Uint8Array(await arquivo.arrayBuffer())));

  try {
    const respostaOllama = await fetch(`${ollamaHost}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModelo,
        prompt:
          'Você é um assistente clínico. Analise a foto de uma queimadura e responda ' +
          'APENAS com um JSON no formato {"grau_sugerido": "1"|"2_superficial"|"2_profundo"|"3", ' +
          '"confianca": número entre 0 e 1, "observacao": "texto curto opcional"}.',
        images: [base64],
        format: 'json',
        stream: false,
      }),
    });

    if (!respostaOllama.ok) {
      return marcarErro(`Ollama respondeu ${respostaOllama.status}`);
    }

    const corpo = await respostaOllama.json();
    const resultadoBruto = JSON.parse(corpo.response);
    const resultado = ResultadoOllama.parse(resultadoBruto);

    await supabase
      .from('analises_ia')
      .update({
        status: 'concluida',
        resultado,
        confianca: resultado.confianca,
        modelo: ollamaModelo,
        latencia_ms: Date.now() - inicio,
      })
      .eq('id', analise_id);

    return new Response(JSON.stringify({ ok: true, resultado }), { status: 200 });
  } catch (erro) {
    return marcarErro(erro instanceof Error ? erro.message : 'Erro desconhecido ao chamar o Ollama.');
  }
});
