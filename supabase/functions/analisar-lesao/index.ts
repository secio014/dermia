// Edge Function: recebe { analise_id }, busca a foto no Storage e o contexto
// da lesão (região, causa, dias desde a queimadura), e analisa:
//   0. qualidade da foto em código (qualidade.ts) — escura, estourada,
//      borrada ou pequena demais vira pedido de nova foto;
//   1. o modelo de visão (Cloudflare Workers AI) só OBSERVA — 3 leituras
//      independentes do checklist de sinais visuais + 1 conferência de
//      sim/não (conhecimento/observacao.ts);
//   2. consenso das leituras + regras clínicas em código decidem grau, fase,
//      achados e confiança (pipeline.ts, conhecimento/decisao.ts). Se a IA
//      acha a foto imprópria, pede outra em vez de chutar.
// Grava o resultado em analises_ia.
//
// Contrato (Workers AI REST):
//   POST https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{CF_AI_MODELO}
//   header: Authorization: Bearer {CF_AI_TOKEN}
//   body: { messages: [ {role:"user",content:[{type:"text",text},
//            {type:"image_url",image_url:{url:"data:...;base64,..."}} ]} ], max_tokens }
//   (detalhes, formatos alternativos e fallback de modelo em modelo.ts)
//
// Enquanto CF_ACCOUNT_ID / CF_AI_TOKEN não estiverem setados, cada análise fica
// status="erro" (tratado) e o app segue com validação manual — nada quebra.
//
// Deploy: supabase functions deploy analisar-lesao
// Variáveis necessárias (supabase secrets set ...):
//   CF_ACCOUNT_ID  id da conta Cloudflare
//   CF_AI_TOKEN    API token com permissão "Workers AI"
//   CF_AI_MODELO   opcional; um ou mais ids separados por vírgula, tentados em
//                  ordem (default: MODELOS_PADRAO em modelo.ts)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetadas automaticamente.
// Setup: docs/WORKERS_AI.md

import { createClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';
import type { ContextoLesao } from './conhecimento/index.ts';
import { MODELOS_PADRAO } from './modelo.ts';
import { analisarFoto } from './pipeline.ts';
import { checarQualidadeFoto } from './qualidade.ts';

// Prefixo em analises_ia.erro_mensagem quando a foto não dá pra analisar (preta,
// borrada, sem lesão, etc.). O app trata isso diferente de uma falha do sistema.
const PREFIXO_IMAGEM_INADEQUADA = 'IMAGEM_INADEQUADA: ';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

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
    return json({ error: mensagem }, 200);
  };

  const accountId = Deno.env.get('CF_ACCOUNT_ID');
  const token = Deno.env.get('CF_AI_TOKEN');
  const modelos = (Deno.env.get('CF_AI_MODELO') ?? '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  if (!modelos.length) modelos.push(...MODELOS_PADRAO);
  let modelo = modelos[0];
  if (!accountId || !token) {
    return marcarErro(
      'CF_ACCOUNT_ID/CF_AI_TOKEN não configurados — configure os secrets e faça o deploy de novo.'
    );
  }

  const { data: analise, error: erroAnalise } = await supabase
    .from('analises_ia')
    .select('foto_path, lesoes(regiao_corporal, mecanismo, data_ocorrencia)')
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

  // Contexto clínico: ajuda o modelo a olhar e entra nas regras (ex.: ferida
  // ainda aberta depois de 3 semanas não é 2º superficial).
  const lesao = (Array.isArray(analise.lesoes) ? analise.lesoes[0] : analise.lesoes) as
    | { regiao_corporal: string | null; mecanismo: string | null; data_ocorrencia: string | null }
    | null;
  const contexto: ContextoLesao = {
    regiao_corporal: lesao?.regiao_corporal,
    mecanismo: lesao?.mecanismo,
    dias_desde_queimadura: lesao?.data_ocorrencia
      ? Math.max(0, Math.floor((Date.now() - Date.parse(lesao.data_ocorrencia)) / 86_400_000))
      : null,
  };

  const mime = arquivo.type || 'image/jpeg';
  const bytes = new Uint8Array(await arquivo.arrayBuffer());

  const qualidade = checarQualidadeFoto(bytes);
  if (!qualidade.ok) {
    await supabase
      .from('analises_ia')
      .update({
        status: 'erro',
        erro_mensagem: PREFIXO_IMAGEM_INADEQUADA + qualidade.motivo,
        resultado: null,
        confianca: null,
        modelo,
        latencia_ms: Date.now() - inicio,
      })
      .eq('id', analise_id);
    return json({ ok: true, imagem_adequada: false, motivo: qualidade.motivo }, 200);
  }

  try {
    const analiseFoto = await analisarFoto({ accountId, token }, modelos, bytes, mime, contexto, {
      nitidezLimitrofe: qualidade.nitidez_limitrofe,
    });
    modelo = analiseFoto.modelo;

    // Foto imprópria: a IA pede outra em vez de chutar um grau.
    if (analiseFoto.tipo === 'nova_foto') {
      const motivo = analiseFoto.motivo;
      await supabase
        .from('analises_ia')
        .update({
          status: 'erro',
          erro_mensagem: PREFIXO_IMAGEM_INADEQUADA + motivo,
          resultado: null,
          confianca: null,
          modelo,
          latencia_ms: Date.now() - inicio,
        })
        .eq('id', analise_id);
      return json({ ok: true, imagem_adequada: false, motivo }, 200);
    }

    const resultado = analiseFoto.resultado;

    await supabase
      .from('analises_ia')
      .update({
        status: 'concluida',
        resultado,
        confianca: resultado.confianca,
        modelo,
        latencia_ms: Date.now() - inicio,
      })
      .eq('id', analise_id);

    return json({ ok: true, resultado }, 200);
  } catch (erro) {
    return marcarErro(erro instanceof Error ? erro.message : 'Erro desconhecido ao chamar o Workers AI.');
  }
});
