// Edge Function: recebe { analise_id }, busca a foto no Storage, chama o
// Cloudflare Workers AI (modelo de visão) pra sugerir o grau clínico da
// queimadura, valida a resposta com Zod e grava em analises_ia.
//
// Contrato (Workers AI REST):
//   POST https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{CF_AI_MODELO}
//   header: Authorization: Bearer {CF_AI_TOKEN}
//   body: { messages: [ {role:"system",content}, {role:"user",content:[
//            {type:"text",text}, {type:"image_url",image_url:{url:"data:...;base64,..."}} ]} ],
//          max_tokens }
//   resposta: { success, result: { response }, errors } — result.response vem
//   como objeto quando o modelo emite JSON, senão string.
//
// Enquanto CF_ACCOUNT_ID / CF_AI_TOKEN não estiverem setados, cada análise fica
// status="erro" (tratado) e o app segue com validação manual — nada quebra.
//
// Deploy: supabase functions deploy analisar-lesao
// Variáveis necessárias (supabase secrets set ...):
//   CF_ACCOUNT_ID  id da conta Cloudflare
//   CF_AI_TOKEN    API token com permissão "Workers AI"
//   CF_AI_MODELO   ex: @cf/meta/llama-3.2-11b-vision-instruct  (opcional, default abaixo)
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetadas automaticamente.
// Setup: docs/WORKERS_AI.md

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import jpeg from 'npm:jpeg-js@0.4.4';
import { json, preflight } from '../_shared/cors.ts';

const MODELO_PADRAO = '@cf/meta/llama-3.2-11b-vision-instruct';

// Prefixo em analises_ia.erro_mensagem quando a foto não dá pra analisar (preta,
// borrada, sem lesão, etc.). O app trata isso diferente de uma falha do sistema.
const PREFIXO_IMAGEM_INADEQUADA = 'IMAGEM_INADEQUADA: ';

// analises_ia.confianca tem check constraint 0-1 (fração, não percentual).
const ResultadoIA = z.object({
  grau_sugerido: z.enum(['1', '2_superficial', '2_profundo', '3']),
  confianca: z.number().min(0).max(1),
  observacao: z.string().optional(),
});

// Saída alternativa quando a IA julga a foto imprópria pra análise.
const ImagemInadequada = z.object({
  imagem_adequada: z.literal(false),
  motivo: z.string().min(1).optional(),
});

const PROMPT_SISTEMA =
  'Você é um assistente clínico de dermatologia. Responda SEMPRE e APENAS com ' +
  'um único objeto JSON, sem texto antes ou depois, sem crases de markdown.\n' +
  'Se a foto NÃO permitir uma avaliação confiável de queimadura — imagem preta, ' +
  'escura demais, estourada de luz, desfocada, sem pele/lesão visível, ou que ' +
  'claramente não é uma queimadura — responda: ' +
  '{"imagem_adequada": false, "motivo": "<explicação curta do problema>"}.\n' +
  'Só quando a foto for adequada, responda: ' +
  '{"grau_sugerido": "1" | "2_superficial" | "2_profundo" | "3", ' +
  '"confianca": <número entre 0 e 1>, "observacao": "<texto curto opcional>"}. ' +
  'Não invente um grau para fotos ruins.';

const PROMPT_USUARIO =
  'Analise a foto de queimadura em anexo. Se der pra avaliar, classifique o grau ' +
  'clínico; se não der, sinalize que a imagem é inadequada.';

// O modelo tende a "alucinar" um laudo mesmo numa foto toda preta. Antes de
// gastar chamada nele, rejeita frames que claramente não dá pra avaliar:
// decodifica o JPEG e olha média/desvio de luminância numa amostra de pixels.
function checarQualidadeFoto(
  bytes: Uint8Array
): { ok: true } | { ok: false; motivo: string } {
  let img: { data: Uint8Array; width: number; height: number };
  try {
    img = jpeg.decode(bytes, { useTArray: true }) as typeof img;
  } catch {
    return { ok: true }; // não decodificou aqui — deixa o modelo tentar
  }
  const { data } = img;
  const passo = Math.max(1, Math.floor(data.length / 4 / 20000)) * 4;
  let n = 0;
  let soma = 0;
  let soma2 = 0;
  for (let i = 0; i + 2 < data.length; i += passo) {
    const luz = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    soma += luz;
    soma2 += luz * luz;
    n++;
  }
  if (n === 0) return { ok: true };
  const media = soma / n;
  const desvio = Math.sqrt(Math.max(0, soma2 / n - media * media));
  if (desvio < 2.5) {
    return { ok: false, motivo: 'A imagem está praticamente uniforme, sem lesão visível.' };
  }
  if (media < 10) return { ok: false, motivo: 'A foto está escura demais.' };
  if (media > 245) return { ok: false, motivo: 'A foto está clara/estourada demais.' };
  return { ok: true };
}

// btoa(String.fromCharCode(...uint8array)) estoura a call stack numa foto de
// ~200-400 KB (spread de centenas de milhares de args). Encoda em blocos.
function bytesParaBase64(bytes: Uint8Array): string {
  let bin = '';
  const bloco = 0x8000;
  for (let i = 0; i < bytes.length; i += bloco) {
    bin += String.fromCharCode(...bytes.subarray(i, i + bloco));
  }
  return btoa(bin);
}

// Extrai o objeto JSON de um texto que pode vir com crases ou lixo em volta.
function extrairJson(texto: string): unknown {
  const limpo = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const ini = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (ini === -1 || fim === -1 || fim < ini) {
    throw new Error(`resposta da IA não tem JSON: ${texto.slice(0, 200)}`);
  }
  return JSON.parse(limpo.slice(ini, fim + 1));
}

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
  const modelo = Deno.env.get('CF_AI_MODELO') ?? MODELO_PADRAO;
  if (!accountId || !token) {
    return marcarErro(
      'CF_ACCOUNT_ID/CF_AI_TOKEN não configurados — configure os secrets e faça o deploy de novo.'
    );
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

  const base64 = bytesParaBase64(bytes);
  const dataUrl = `data:${mime};base64,${base64}`;

  try {
    const resposta = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelo}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: PROMPT_SISTEMA },
            {
              role: 'user',
              content: [
                { type: 'text', text: PROMPT_USUARIO },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
          max_tokens: 300,
          temperature: 0.2,
        }),
      }
    );

    if (!resposta.ok) {
      return marcarErro(`Workers AI respondeu ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`);
    }

    const corpo = await resposta.json();
    if (corpo.success === false) {
      return marcarErro(`Workers AI: ${JSON.stringify(corpo.errors ?? corpo).slice(0, 300)}`);
    }

    // O Workers AI devolve result.response já como objeto quando detecta que a
    // saída é JSON; senão vem string (aí o extrairJson tira crases/lixo).
    const bruto = corpo.result?.response ?? corpo.result?.output_text ?? corpo.result;
    if (bruto === undefined || bruto === null || bruto === '') {
      return marcarErro(`Workers AI: resposta vazia (${JSON.stringify(corpo).slice(0, 300)})`);
    }
    const obj = typeof bruto === 'string' ? extrairJson(bruto) : bruto;

    // Foto imprópria: a IA sinalizou em vez de chutar um grau.
    const inadequada = ImagemInadequada.safeParse(obj);
    if (inadequada.success) {
      const motivo = inadequada.data.motivo ?? 'A imagem não está adequada para análise.';
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

    const resultado = ResultadoIA.parse(obj);

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
