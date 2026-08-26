// Edge Function: recebe { analise_id }, busca a foto no Storage, chama o
// Ollama local pra sugerir o grau clínico da queimadura, valida a resposta
// com Zod e grava o resultado em analises_ia.
//
// Deploy: supabase functions deploy analisar-lesao
// Variáveis necessárias (supabase secrets set ...):
//   OLLAMA_HOST   ex: http://ollama-host:11434
//   OLLAMA_MODELO ex: llama3.2-vision
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetadas automaticamente.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const ResultadoOllama = z.object({
  grau_sugerido: z.enum(['1', '2_superficial', '2_profundo', '3']),
  confianca: z.number().min(0).max(100),
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
          '"confianca": 0-100, "observacao": "texto curto opcional"}.',
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
