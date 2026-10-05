// Edge Function: assistente de IA (chat) da área profissional.
//
// Recebe { mensagens: [{ role: 'user'|'assistant', content }], paciente_id? }.
// Lê os dados com a SESSÃO do profissional (RLS) — então a IA só enxerga os
// pacientes da clínica de quem perguntou. Monta um contexto compacto (visão
// geral da clínica + ficha detalhada do paciente em foco, se houver), junta
// com o conhecimento clínico das skills do analisar-lesao e chama um modelo
// de texto no Cloudflare Workers AI.
//
// Privacidade (LGPD): pro modelo vão só o código pseudônimo e o primeiro
// nome — nunca nome completo, e-mail, telefone ou data de nascimento.
//
// A IA cita pacientes como [P:CODIGO]; aqui isso vira a lista `pacientes`
// da resposta, que o app mostra como atalhos pra ficha.
//
// Deploy: supabase functions deploy assistente-ia
// Secrets: CF_ACCOUNT_ID, CF_AI_TOKEN (os mesmos do analisar-lesao) e,
// opcional, CF_AI_MODELO_CHAT (default abaixo).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { json, preflight } from '../_shared/cors.ts';
import type { Resultado } from '../analisar-lesao/conhecimento/index.ts';
import { MODELOS_PADRAO, chamarModeloVisao } from '../analisar-lesao/modelo.ts';
import { analisarFoto } from '../analisar-lesao/pipeline.ts';
import { checarQualidadeFoto } from '../analisar-lesao/qualidade.ts';
import { CONHECIMENTO } from './conhecimento.ts';

const MODELO_PADRAO = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const MAX_MENSAGENS = 12;
const MAX_PACIENTES_VISAO_GERAL = 60;

const Corpo = z.object({
  mensagens: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1),
  paciente_id: z.string().uuid().nullish(),
});

const PAPEL = `
# PAPEL
Você é o Assistente DermIA, apoio clínico para fisioterapeutas que tratam
pacientes queimados. Responda em português do Brasil, de forma objetiva
(listas curtas quando ajudar).

Regras:
- Use SOMENTE os dados do CONTEXTO abaixo sobre pacientes. Se a informação
  não estiver lá, diga que não há registro — nunca invente números, datas ou
  condutas.
- Sempre que falar de um paciente, cite-o como [P:CODIGO] (ex.: [P:TESTE-01]).
- ESCOPO: você atende SOMENTE assuntos de queimadura (lesão, grau, cicatriz de queimadura,
  curativo, reabilitação do queimado) e os dados dos pacientes da clínica. Para qualquer
  outro tema (outras doenças, conhecimentos gerais etc.), recuse educadamente em 1 frase
  e lembre que só ajuda com queimaduras.
- Você sugere; a decisão é do profissional. Não prescreva medicamento nem
  dose por conta própria; pode comentar o que já está prescrito.
- Sinais de alarme (infecção, piora rápida, dor 8+ persistente, febre)
  devem ser destacados.
- Datas: hoje é ${new Date().toISOString().slice(0, 10)}.
`.trim();

const ROTULO_GRAU: Record<string, string> = {
  '1': '1º grau',
  '2_superficial': '2º grau superficial',
  '2_profundo': '2º grau profundo',
  '3': '3º grau',
  misto: 'misto',
  indeterminado: 'indeterminado',
};

function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] ?? '';
}

function idade(dataNascimento: string | null): string {
  if (!dataNascimento) return 'idade não informada';
  const anos = Math.floor((Date.now() - new Date(dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${anos} anos`;
}

type PacienteBasico = { id: string; codigo_pseudonimo: string; nome_completo: string };

async function visaoGeral(sb: SupabaseClient) {
  const [{ data: pacientes }, { data: painel }] = await Promise.all([
    sb
      .from('pacientes')
      .select('id, codigo_pseudonimo, nome_completo, ativo')
      .order('nome_completo')
      .limit(MAX_PACIENTES_VISAO_GERAL),
    sb.from('vw_painel_pacientes').select('*'),
  ]);

  const porPaciente = new Map<string, Record<string, unknown>[]>();
  for (const linha of painel ?? []) {
    const lista = porPaciente.get(linha.paciente_id) ?? [];
    lista.push(linha);
    porPaciente.set(linha.paciente_id, lista);
  }

  const linhas = (pacientes ?? []).map((p) => {
    const ativas = porPaciente.get(p.id) ?? [];
    const descLesoes = ativas.length
      ? ativas
          .map(
            (l) =>
              `${l.regiao_corporal ?? 'região ?'}, ${ROTULO_GRAU[l.grau_clinico as string] ?? 'grau ?'}, ` +
              `SCQ ${l.scq_percentual ?? '?'}%, ${l.dias_desde_lesao ?? '?'} dias, ` +
              `último atendimento ${l.ultimo_atendimento ?? 'nenhum'}, ` +
              `${l.analises_pendentes ?? 0} análise(s) de foto pendente(s), ` +
              `prioridade ${l.prioridade === 1 ? 'CRÍTICA' : l.prioridade === 2 ? 'atenção' : 'estável'}`
          )
          .join(' | ')
      : 'sem lesão ativa (alta ou sem registro)';
    return `- [P:${p.codigo_pseudonimo}] ${primeiroNome(p.nome_completo)}: ${descLesoes}`;
  });

  return {
    pacientes: (pacientes ?? []) as PacienteBasico[],
    texto: `# VISÃO GERAL DA CLÍNICA (${linhas.length} pacientes)\n${linhas.join('\n') || '(nenhum paciente)'}`,
  };
}

async function fichaPaciente(sb: SupabaseClient, pacienteId: string): Promise<string | null> {
  const { data: p } = await sb
    .from('pacientes')
    .select('id, codigo_pseudonimo, nome_completo, data_nascimento, sexo')
    .eq('id', pacienteId)
    .maybeSingle();
  if (!p) return null;

  const { data: lesoes } = await sb
    .from('lesoes')
    .select('id, regiao_corporal, mecanismo, grau_clinico, scq_percentual, status, data_ocorrencia, observacoes')
    .eq('paciente_id', pacienteId)
    .order('data_ocorrencia', { ascending: false });
  const idsLesoes = (lesoes ?? []).map((l) => l.id);

  const [registros, analises, exercicios, adesao, prescricoes, consultas] = await Promise.all([
    idsLesoes.length
      ? sb
          .from('registros_evolucao')
          .select('lesao_id, data_atendimento, dor_eva, descricao, condutas, adm, escala_cicatriz')
          .in('lesao_id', idsLesoes)
          .order('data_atendimento', { ascending: false })
          .limit(12)
      : Promise.resolve({ data: [] }),
    idsLesoes.length
      ? sb
          .from('analises_ia')
          .select('lesao_id, criado_em, status, resultado, validacao_profissional')
          .in('lesao_id', idsLesoes)
          .order('criado_em', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    sb
      .from('exercicios_prescritos')
      .select('id, titulo, series, repeticoes, frequencia_semanal')
      .eq('paciente_id', pacienteId)
      .eq('ativo', true),
    sb.from('vw_adesao_exercicios').select('exercicio_id, execucoes_30d, adesao_percentual').eq('paciente_id', pacienteId),
    sb.from('prescricoes').select('nome, dose, frequencia, inicio, fim').eq('paciente_id', pacienteId).eq('ativo', true),
    sb
      .from('consultas')
      .select('inicio_em, motivo, status')
      .eq('paciente_id', pacienteId)
      .order('inicio_em', { ascending: false })
      .limit(5),
  ]);

  const adesaoPorEx = new Map((adesao.data ?? []).map((a) => [a.exercicio_id, a]));
  const regiaoDaLesao = new Map((lesoes ?? []).map((l) => [l.id, l.regiao_corporal]));

  const partes: string[] = [];
  partes.push(
    `# PACIENTE EM FOCO: [P:${p.codigo_pseudonimo}] ${primeiroNome(p.nome_completo)} — ${idade(p.data_nascimento)}` +
      (p.sexo ? `, sexo ${p.sexo}` : '')
  );

  partes.push(
    '## Lesões\n' +
      ((lesoes ?? [])
        .map(
          (l) =>
            `- ${l.regiao_corporal ?? 'região ?'} (${l.mecanismo ?? 'mecanismo ?'}), ` +
            `${ROTULO_GRAU[l.grau_clinico ?? ''] ?? 'grau ?'}, SCQ ${l.scq_percentual ?? '?'}%, ` +
            `status ${l.status}, desde ${l.data_ocorrencia}` +
            (l.observacoes ? ` — obs: ${l.observacoes}` : '')
        )
        .join('\n') || '- nenhuma')
  );

  partes.push(
    '## Evolução (mais recente primeiro)\n' +
      ((registros.data ?? [])
        .map((r) => {
          const adm = Array.isArray(r.adm) && r.adm.length
            ? ' ADM: ' +
              r.adm
                .map((m: Record<string, unknown>) => `${m.articulacao} ${m.movimento} ativo ${m.grau_ativo}°/passivo ${m.grau_passivo}°`)
                .join('; ')
            : '';
          const v = r.escala_cicatriz as Record<string, number> | null;
          const vancouver = v
            ? ` Vancouver ${(v.pigmentacao ?? 0) + (v.vascularidade ?? 0) + (v.elasticidade ?? 0) + (v.altura ?? 0)}/15` +
              ` (pig ${v.pigmentacao}, vasc ${v.vascularidade}, elast ${v.elasticidade}, alt ${v.altura}).`
            : '';
          return (
            `- ${r.data_atendimento} [${regiaoDaLesao.get(r.lesao_id) ?? ''}] dor EVA ${r.dor_eva ?? '?'}/10.` +
            (r.descricao ? ` ${r.descricao}` : '') +
            (r.condutas ? ` Condutas: ${r.condutas}.` : '') +
            adm +
            vancouver
          );
        })
        .join('\n') || '- sem registros')
  );

  partes.push(
    '## Análises de foto por IA\n' +
      ((analises.data ?? [])
        .map((a) => {
          const r = (a.resultado ?? {}) as Record<string, unknown>;
          return (
            `- ${String(a.criado_em).slice(0, 10)}: ${a.status}` +
            (r.grau_sugerido ? `, sugeriu ${ROTULO_GRAU[r.grau_sugerido as string] ?? r.grau_sugerido}` : '') +
            (Array.isArray(r.achados) && r.achados.length ? `, achados: ${r.achados.join(', ')}` : '') +
            `, validação: ${a.validacao_profissional ?? 'PENDENTE'}`
          );
        })
        .join('\n') || '- nenhuma')
  );

  partes.push(
    '## Exercícios ativos\n' +
      ((exercicios.data ?? [])
        .map((e) => {
          const a = adesaoPorEx.get(e.id);
          return (
            `- ${e.titulo}: ${e.series ?? '?'}x${e.repeticoes ?? '?'}, ${e.frequencia_semanal ?? '?'}x/semana` +
            (a ? `; adesão 30d ${a.adesao_percentual ?? '?'}% (${a.execucoes_30d} execuções)` : '')
          );
        })
        .join('\n') || '- nenhum')
  );

  partes.push(
    '## Prescrições ativas\n' +
      ((prescricoes.data ?? [])
        .map((m) => `- ${m.nome}${m.dose ? `, ${m.dose}` : ''}${m.frequencia ? `, ${m.frequencia}` : ''}`)
        .join('\n') || '- nenhuma')
  );

  partes.push(
    '## Consultas\n' +
      ((consultas.data ?? [])
        .map((c) => `- ${String(c.inicio_em).slice(0, 16).replace('T', ' ')}: ${c.status}${c.motivo ? ` — ${c.motivo}` : ''}`)
        .join('\n') || '- nenhuma')
  );

  return partes.join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Escopo: o assistente é SÓ para queimaduras. Duas barreiras:
//  1) classificador rápido (modelo pequeno) antes de gastar o modelo grande —
//     fora do escopo devolve uma recusa fixa, sem nem montar o contexto;
//  2) o prompt principal também manda recusar (se o classificador falhar,
//     a conversa segue, mas o modelo grande continua instruído a recusar).
// Fotos: o modelo de visão primeiro diz se é queimadura/cicatriz de
// queimadura; se não for, recusa sem analisar.
// ─────────────────────────────────────────────────────────────────────────────

const MODELO_ESCOPO = '@cf/meta/llama-3.1-8b-instruct-fast';

const RECUSA_TEXTO =
  'Sou o assistente da DermIA e só posso ajudar com queimaduras: avaliação e grau, cicatrizes ' +
  'de queimadura, curativos, reabilitação/fisioterapia e os dados dos seus pacientes queimados. ' +
  'Pode reformular a pergunta dentro desse tema?';

const RECUSA_FOTO =
  'Essa imagem não parece mostrar uma queimadura ou cicatriz de queimadura, então não vou analisá-la. ' +
  'Envie uma foto da área queimada, com boa luz, em foco e com a lesão centralizada.';

const PROMPT_ESCOPO = `
Você é um filtro de um assistente clínico de uma clínica de QUEIMADOS. Todos os pacientes
da clínica são pacientes queimados, então qualquer pergunta sobre pacientes, fotos, análises,
agenda, consultas, exercícios, prescrições ou evolução é PERMITIDA. Saudações, agradecimentos
e pedidos sobre a resposta anterior também são PERMITIDOS. Assuntos de queimadura, cicatriz,
curativo, dor, fisioterapia e reabilitação são PERMITIDOS.

Marque fora=true SOMENTE quando a mensagem for CLARAMENTE sobre outro assunto: outra doença
sem relação com queimadura (acne, psoríase, melanoma, diabetes...), conhecimentos gerais,
geografia, programação, receitas, esportes, política etc. Na dúvida, fora=false.

Responda APENAS com JSON: {"fora": true} ou {"fora": false}.
`.trim();

// Etapa 1 da foto — TRIAGEM. Pergunta isolada e simples (o modelo de 11B erra
// muito quando precisa decidir E analisar na mesma resposta: "via" queimadura
// em foto de uma pessoa sentada numa sala). Descrever antes de decidir reduz
// a alucinação; na dúvida, recusa.
const PROMPT_TRIAGEM = `
Você faz a TRIAGEM de fotos para um sistema de queimaduras. Não analise nada clínico.

1) Descreva em UMA frase o que a foto mostra (o assunto principal: pessoa, objeto, ambiente,
   tela, parte do corpo...).
2) Responda: existe uma LESÃO DE PELE claramente visível e em destaque na foto — ferida,
   queimadura, bolha, crosta, área avermelhada/escura delimitada, cicatriz, enxerto?
   Uma pessoa com pele normal (rosto, braços), roupas, móveis, ambiente, objeto, animal,
   documento ou tela SEM lesão evidente = false.
3) Se houver lesão: ela é compatível com QUEIMADURA ou CICATRIZ DE QUEIMADURA?

NA DÚVIDA, responda false. Responda APENAS com JSON:
{"descricao": "<uma frase>", "lesao_visivel": true|false, "compativel_queimadura": true|false}
`.trim();

/**
 * Lê a triagem: JSON se vier; senão procura "lesão visível: sim/não" e
 * "compatível com queimadura: sim/não" no texto (o modelo às vezes responde
 * em tópicos de markdown). Ausente = não.
 */
function lerTriagem(texto: string): { lesao: boolean; compativel: boolean; descricao: string | null } {
  const obj = extrairJson(texto);
  if (obj && ('lesao_visivel' in obj || 'compativel_queimadura' in obj)) {
    return {
      lesao: obj.lesao_visivel === true,
      compativel: obj.compativel_queimadura === true,
      descricao: typeof obj.descricao === 'string' ? obj.descricao : null,
    };
  }
  const limpo = texto.replace(/[*_`#]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const sim = (re: RegExp) => {
    const m = limpo.match(re);
    return !!m && /^(sim|true|yes)/.test(m[1]);
  };
  const desc = limpo.match(/descri[a-z]*\s*:\s*([^\n]+)/);
  return {
    lesao: sim(/lesao[_ ]?visivel\s*:?\s*(sim|nao|true|false|yes|no)/),
    compativel: sim(/compativel[a-z_ ]*queimadura\s*:?\s*(sim|nao|true|false|yes|no)/),
    descricao: desc ? desc[1].trim() : null,
  };
}

const ROTULO_ACHADO: Record<string, string> = {
  queloide: 'queloide',
  hipertrofica: 'cicatriz hipertrófica',
  hipercromica: 'hipercromia',
  hipocromica: 'hipocromia',
  hiperemia: 'hiperemia',
  enxerto_malha: 'enxerto em malha',
  area_doadora: 'área doadora',
  deformidade: 'deformidade/retração',
  ferida_aberta: 'ferida aberta',
  bolha: 'bolha',
  descamacao: 'descamação',
};

// Mesmo Resultado que o analisar-lesao grava em analises_ia.
function formatarAnalise(r: Resultado): string {
  const achados = (r.achados ?? []).map((a) => ROTULO_ACHADO[a] ?? a);
  const linhas = [
    `- **Fase:** ${r.fase}`,
    `- **Grau sugerido:** ${ROTULO_GRAU[r.grau_sugerido] ?? r.grau_sugerido} (confiança ${Math.round(r.confianca * 100)}%)`,
    `- **Achados:** ${achados.length ? achados.join(', ') : 'nenhum achado específico'}`,
    `- **O que a IA viu e por quê:** ${r.observacao}`,
  ];
  const v = r.verificacao;
  if (v) {
    linhas.push(
      `- **Verificação:** ${v.leituras} leitura(s) independentes + conferência; ` +
        `${Math.round(v.concordancia * 100)}% chegaram ao mesmo grau`
    );
  }
  const aviso =
    r.confianca < 0.5
      ? '\n\n_Confiança baixa: confira com atenção ou envie outra foto (outro ângulo, luz natural, mais perto)._'
      : '';
  return `${linhas.join('\n')}${aviso}\n\n_Sugestão da IA — confirme antes de registrar o grau._`;
}

type Msg ={ role: 'user' | 'assistant'; content: string };

async function rodarModelo(
  accountId: string,
  token: string,
  modelo: string,
  messages: unknown[],
  maxTokens: number,
  temperatura: number
): Promise<string> {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, max_tokens: maxTokens, temperature: temperatura }),
  });
  if (!r.ok) throw new Error(`Workers AI respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const corpo = await r.json();
  const bruto = corpo.result?.response;
  if (bruto && typeof bruto === 'object') return JSON.stringify(bruto);
  return typeof bruto === 'string' ? bruto.trim() : '';
}

function extrairJson(texto: string): Record<string, unknown> | null {
  const ini = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (ini === -1 || fim <= ini) return null;
  try {
    return JSON.parse(texto.slice(ini, fim + 1));
  } catch {
    return null;
  }
}

/** true = dentro do escopo. Se o classificador falhar, deixa passar (o prompt principal também recusa). */
// Termos do domínio: dispensam o classificador (mais rápido e sem falso positivo).
const TERMOS_DO_DOMINIO =
  /queim|cicatri|quel[oó]id|hipertr[oó]f|hipocr[oô]m|hipercr[oô]m|hiperem|enxert|curativ|escald|bolha|\bscq\b|paciente|ficha|\bfotos?\b|an[aá]lises?\b|agenda|consulta|exerc[ií]cio|prescri|evolu[cç]|ades[aã]o|\badm\b|vancouver|malha compressiva|[oó]rtese|fisioterap|reabilit/i;

async function dentroDoEscopo(accountId: string, token: string, mensagens: Msg[]): Promise<boolean> {
  const ultima = mensagens[mensagens.length - 1]?.content ?? '';
  if (TERMOS_DO_DOMINIO.test(ultima)) return true;
  const anterior = [...mensagens].reverse().find((m) => m.role === 'assistant')?.content ?? '';
  try {
    const saida = await rodarModelo(
      accountId,
      token,
      MODELO_ESCOPO,
      [
        { role: 'system', content: PROMPT_ESCOPO },
        {
          role: 'user',
          content:
            (anterior ? `Resposta anterior do assistente (contexto): ${anterior.slice(0, 400)}\n\n` : '') +
            `Última mensagem do usuário: ${ultima}`,
        },
      ],
      20,
      0
    );
    return extrairJson(saida)?.fora !== true;
  } catch {
    return true;
  }
}

const Imagem = z.object({
  base64: z.string().min(100).max(4_000_000),
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg'),
});

const CorpoComFoto = Corpo.extend({ imagem: Imagem.nullish() });

function citarPacientes(texto: string, pacientes: PacienteBasico[]) {
  const porCodigo = new Map(pacientes.map((p) => [p.codigo_pseudonimo.toUpperCase(), p]));
  const citados = new Map<string, { id: string; codigo: string; nome: string }>();
  const textoFinal = texto.replace(/\[P:\s*([^\]]+?)\s*\]/gi, (_m, codigo: string) => {
    const p = porCodigo.get(codigo.toUpperCase());
    if (p) citados.set(p.id, { id: p.id, codigo: p.codigo_pseudonimo, nome: p.nome_completo });
    return codigo;
  });
  return { textoFinal, citados: [...citados.values()] };
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Não autenticado.' }, 401);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: usuario } = await sb.auth.getUser();
  if (!usuario.user) return json({ error: 'Sessão inválida.' }, 401);

  const { data: prof } = await sb.from('profissionais').select('ativo').eq('id', usuario.user.id).maybeSingle();
  if (!prof?.ativo) return json({ error: 'Assistente disponível só para profissionais.' }, 403);

  const corpo = CorpoComFoto.safeParse(await req.json().catch(() => null));
  if (!corpo.success) return json({ error: 'Requisição inválida.' }, 400);
  const { mensagens, paciente_id, imagem } = corpo.data;

  const accountId = Deno.env.get('CF_ACCOUNT_ID');
  const token = Deno.env.get('CF_AI_TOKEN');
  if (!accountId || !token) return json({ error: 'IA não configurada (CF_ACCOUNT_ID/CF_AI_TOKEN).' }, 500);

  try {
    // ── Foto ────────────────────────────────────────────────────────────────
    if (imagem) {
      const modelos = (Deno.env.get('CF_AI_MODELO') ?? '')
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
      if (!modelos.length) modelos.push(...MODELOS_PADRAO);
      const cred = { accountId, token };
      const bytes = Uint8Array.from(atob(imagem.base64), (c) => c.charCodeAt(0));
      const comoTexto = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));

      // Etapa 0: qualidade da foto em código (escura, borrada, pequena...).
      const qualidade = checarQualidadeFoto(bytes);
      if (!qualidade.ok) {
        return json({ resposta: `Preciso de outra foto: ${qualidade.motivo}`, pacientes: [], nova_foto: true }, 200);
      }

      // Etapa 1: triagem. Precisa das DUAS respostas = sim; qualquer outra
      // coisa (não, ilegível, campo faltando) recusa. O prompt vai junto da
      // imagem na mensagem do usuário: com imagem, o modelo ignora o system.
      const triagemResp = await chamarModeloVisao(cred, modelos, PROMPT_TRIAGEM, bytes, imagem.mime);
      const triagem = lerTriagem(comoTexto(triagemResp.bruto));
      // Recusa só sem lesão visível. Lesão que o modelo não reconhece como
      // queimadura (crosta, descamação em cicatrização) segue para a análise
      // com aviso — o chat é de uma clínica de queimados, e recusar uma
      // queimadura real é pior que analisar com ressalva.
      if (!triagem.lesao) {
        return json(
          { resposta: RECUSA_FOTO, pacientes: [], fora_do_escopo: true, triagem: triagem.descricao, modelo: triagemResp.modelo },
          200
        );
      }

      // Etapa 2: MESMO pipeline do analisar-lesao — 3 leituras do checklist
      // visual + conferência, consenso entre elas e grau pelas regras em
      // código. Pedir o grau direto ao modelo puxava quase tudo para 2º grau.
      const analise = await analisarFoto(cred, modelos, bytes, imagem.mime, {}, {
        nitidezLimitrofe: qualidade.nitidez_limitrofe,
      });
      if (analise.tipo === 'nova_foto') {
        return json(
          { resposta: `Preciso de outra foto: ${analise.motivo}`, pacientes: [], nova_foto: true, modelo: analise.modelo },
          200
        );
      }
      const ressalva = triagem.compativel
        ? ''
        : '_Atenção: a IA não reconheceu com certeza esta lesão como queimadura — confirme a causa._\n\n';
      return json(
        { resposta: ressalva + formatarAnalise(analise.resultado), pacientes: [], modelo: analise.modelo },
        200
      );
    }

    // ── Texto ───────────────────────────────────────────────────────────────
    if (!(await dentroDoEscopo(accountId, token, mensagens))) {
      return json({ resposta: RECUSA_TEXTO, pacientes: [], fora_do_escopo: true, modelo: MODELO_ESCOPO }, 200);
    }

    const modelo = Deno.env.get('CF_AI_MODELO_CHAT') ?? MODELO_PADRAO;
    const geral = await visaoGeral(sb);
    const ficha = paciente_id ? await fichaPaciente(sb, paciente_id) : null;
    const sistema = [
      PAPEL,
      '# CONHECIMENTO CLÍNICO (referência)',
      CONHECIMENTO,
      '# CONTEXTO (dados reais da clínica — use só isto sobre pacientes)',
      geral.texto,
      ficha ?? '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const texto = await rodarModelo(
      accountId,
      token,
      modelo,
      [{ role: 'system', content: sistema }, ...mensagens.slice(-MAX_MENSAGENS)],
      900,
      0.3
    );
    if (!texto) return json({ error: 'A IA não retornou resposta.' }, 502);

    const { textoFinal, citados } = citarPacientes(texto, geral.pacientes);
    return json({ resposta: textoFinal, pacientes: citados, modelo }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Falha ao chamar a IA.' }, 502);
  }
});

