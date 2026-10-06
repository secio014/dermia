// Análise completa de uma foto, com validação cruzada antes de responder.
// Usada pela Edge Function analisar-lesao e pelo chat (assistente-ia).
//
//   1. LEITURAS = 3 checklists visuais independentes (observacao.ts), em
//      temperaturas diferentes, + 1 CONFERÊNCIA com perguntas curtas de
//      sim/não sobre os sinais que mais mudam o grau. Tudo em paralelo.
//   2. QUALIDADE: se a maioria das leituras acha a foto imprópria/borrada, ou
//      a conferência reprova uma foto já limítrofe, pede NOVA FOTO em vez de
//      chutar um grau.
//   3. CONSENSO: cada sinal só entra se a maioria das leituras (e a
//      conferência, quando ela pergunta sobre ele) concorda. Um sinal visto
//      por uma leitura só — típico "ver bolha em tudo" — cai fora.
//   4. DECISÃO: regras em código (decisao.ts) sobre o consenso. Cada leitura
//      também é decidida sozinha; se elas discordam, a confiança cai e a
//      observação diz onde.
//
// Sem dependências npm (roda no Deno e no Node — scripts/avaliar-ia.ts).

import {
  type Conferencia,
  type ContextoLesao,
  type CorLeito,
  type Observacao,
  type Resultado,
  decidir,
  extrairJson,
  lerConferencia,
  lerObservacao,
  montarPromptConferencia,
  montarPromptObservacao,
} from './conhecimento/index.ts';
import type { Grau } from './conhecimento/vocabulario.ts';
import { type Credenciais, chamarModeloVisao, ehErroLimiteIa } from './modelo.ts';

export type AnaliseFoto =
  | { tipo: 'nova_foto'; motivo: string; modelo: string }
  | { tipo: 'ok'; resultado: Resultado; modelo: string };

const TEMPERATURAS_LEITURA = [0.1, 0.4, 0.7];

const NOME_GRAU: Record<Grau, string> = {
  '1': '1º',
  '2_superficial': '2º superficial',
  '2_profundo': '2º profundo',
  '3': '3º',
  misto: 'misto',
  indeterminado: 'indeterminado',
};
const NIVEL_GRAU: Partial<Record<Grau, number>> = { '1': 1, '2_superficial': 2, '2_profundo': 3, '3': 4 };

type Voto = 'sim' | 'nao' | 'empate';
function votar(votos: boolean[]): Voto {
  const s = votos.filter(Boolean).length;
  const n = votos.length - s;
  return s > n ? 'sim' : s < n ? 'nao' : 'empate';
}

function maisVotado<T extends string>(valores: T[], padrao: T): T {
  const cont = new Map<T, number>();
  for (const v of valores) cont.set(v, (cont.get(v) ?? 0) + 1);
  let melhor = padrao;
  let max = 0;
  for (const [v, c] of cont) if (c > max) [melhor, max] = [v, c];
  return melhor;
}

function mediana<T extends string>(valores: T[], ordem: readonly T[]): T {
  const idx = valores.map((v) => ordem.indexOf(v)).sort((a, b) => a - b);
  return ordem[idx[Math.floor((idx.length - 1) / 2)]];
}

function texto(bruto: unknown): unknown {
  return typeof bruto === 'string' ? extrairJson(bruto) : bruto;
}

// Junta as leituras num checklist só. Empate = sinal duvidoso: entra (errar
// para menos profundidade é pior que para mais), mas vai para `duvidas`.
function consolidar(
  leituras: Observacao[],
  conf: Conferencia | null
): { obs: Observacao; duvidas: string[]; divergenciasConferencia: string[] } {
  const duvidas: string[] = [];
  const divConf: string[] = [];
  const com = (votos: boolean[], extra: boolean | undefined) =>
    extra === undefined ? votos : [...votos, extra];
  const decidirSinal = (nome: string, votos: boolean[], extra?: boolean): boolean => {
    const v = votar(com(votos, extra));
    if (v === 'empate') duvidas.push(nome);
    const presente = v !== 'nao';
    if (extra !== undefined && extra !== presente) {
      divConf.push(`a conferência ${extra ? 'viu' : 'não confirmou'} ${nome}`);
    }
    return presente;
  };

  // Bolha
  const temBolha = decidirSinal('bolha', leituras.map((o) => o.bolha !== 'nenhuma'), conf?.tem_bolha);
  const tiposBolha = leituras.map((o) => o.bolha).filter((b) => b !== 'nenhuma');
  const bolha = temBolha ? maisVotado(tiposBolha.length ? tiposBolha : ['integra'], 'integra') : 'nenhuma';

  // Pele aberta
  const aberta = decidirSinal(
    'ferida aberta',
    leituras.map((o) => o.pele_aberta !== 'nao'),
    conf?.tem_ferida_aberta
  );
  const extensoes = leituras.map((o) => o.pele_aberta).filter((p) => p !== 'nao');
  const pele_aberta = aberta
    ? maisVotado(extensoes.length ? extensoes : ['pequenas_areas'], 'pequenas_areas')
    : 'nao';

  // Cores do leito. As de 3º grau (couro/carvão) votam juntas com a
  // pergunta "área seca e rígida" da conferência.
  const cores = new Set<CorLeito>();
  const espessuraTotal: CorLeito[] = ['branco_couro_ou_marmoreo', 'marrom_preto_carbonizado'];
  const temEspTotal = decidirSinal(
    'área seca/rígida (couro ou carbonizada)',
    leituras.map((o) => o.cores_leito.some((c) => espessuraTotal.includes(c))),
    conf?.area_seca_rigida
  );
  if (temEspTotal) {
    // Dentro do grupo, cada cor precisa da maioria das leituras que viram o grupo.
    const viram = leituras.filter((o) => o.cores_leito.some((c) => espessuraTotal.includes(c)));
    for (const c of espessuraTotal) {
      if (viram.filter((o) => o.cores_leito.includes(c)).length * 2 > viram.length) cores.add(c);
    }
    // Empate entre as cores ou só a conferência viu: fica a mais comum.
    if (!cores.size) cores.add('branco_couro_ou_marmoreo');
  }
  const outrasCores = new Set(leituras.flatMap((o) => o.cores_leito).filter((c) => !espessuraTotal.includes(c)));
  for (const c of outrasCores) {
    if (decidirSinal(`leito ${c.replace(/_/g, ' ')}`, leituras.map((o) => o.cores_leito.includes(c)))) cores.add(c);
  }

  const bool = (campo: keyof Observacao, nome: string) =>
    decidirSinal(nome, leituras.map((o) => o[campo] === true));

  const temCicatriz = decidirSinal('cicatriz elevada', leituras.map((o) => o.cicatriz_elevada !== 'nenhuma'));
  const tiposCic = leituras.map((o) => o.cicatriz_elevada).filter((c) => c !== 'nenhuma');

  const obs: Observacao = {
    descricao: '',
    pele_aberta,
    cores_leito: [...cores],
    pontos_sangue: bool('pontos_sangue', 'pontos de sangue'),
    bolha,
    vermelhidao: mediana(leituras.map((o) => o.vermelhidao), ['nenhuma', 'leve', 'intensa'] as const),
    descamacao_em_folhas: bool('descamacao_em_folhas', 'descamação'),
    superficie_umida: decidirSinal(
      'superfície úmida/brilhante',
      leituras.map((o) => o.superficie_umida),
      conf?.superficie_umida
    ),
    crosta_escura: bool('crosta_escura', 'crosta escura'),
    cicatriz_elevada: temCicatriz ? maisVotado(tiposCic, 'dentro_do_limite') : 'nenhuma',
    mais_escura_que_pele_normal: bool('mais_escura_que_pele_normal', 'mancha escura'),
    mais_clara_que_pele_normal: bool('mais_clara_que_pele_normal', 'mancha clara'),
    enxerto_malha: bool('enxerto_malha', 'enxerto em malha'),
    area_doadora: bool('area_doadora', 'área doadora'),
    deformidade: bool('deformidade', 'deformidade'),
    nitidez: mediana(leituras.map((o) => o.nitidez), ['ruim', 'media', 'boa'] as const),
  };
  if (obs.pele_aberta === 'nao' && obs.bolha !== 'rota') obs.cores_leito = [];
  return { obs, duvidas, divergenciasConferencia: divConf };
}

export async function analisarFoto(
  cred: Credenciais,
  modelos: string[],
  bytes: Uint8Array,
  mime: string,
  ctx: ContextoLesao = {},
  opcoes: { nitidezLimitrofe?: boolean } = {}
): Promise<AnaliseFoto> {
  const promptObs = montarPromptObservacao(ctx);
  const [respConf, ...respLeituras] = await Promise.allSettled([
    chamarModeloVisao(cred, modelos, montarPromptConferencia(), bytes, mime, 0.1),
    ...TEMPERATURAS_LEITURA.map((t) => chamarModeloVisao(cred, modelos, promptObs, bytes, mime, t)),
  ]);

  // Cota grátis do Workers AI esgotada: as outras leituras também falharam
  // pelo mesmo motivo, então avisa isso em vez de "nenhuma leitura válida".
  const limite = [respConf, ...respLeituras].find(
    (r) => r.status === 'rejected' && ehErroLimiteIa(r.reason)
  );
  if (limite && !respLeituras.some((r) => r.status === 'fulfilled')) {
    throw (limite as PromiseRejectedResult).reason;
  }

  let modelo = modelos[0];
  const falhas: string[] = [];
  const validas: Observacao[] = [];
  const recusas: string[] = [];
  for (const r of respLeituras) {
    if (r.status === 'rejected') {
      falhas.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      continue;
    }
    modelo = r.value.modelo;
    try {
      const leitura = lerObservacao(texto(r.value.bruto));
      if (leitura.adequada) validas.push(leitura.obs);
      else recusas.push(leitura.motivo);
    } catch (e) {
      falhas.push(e instanceof Error ? e.message : String(e)); // JSON quebrado
    }
  }
  let conf: Conferencia | null = null;
  if (respConf.status === 'fulfilled') {
    try {
      conf = lerConferencia(texto(respConf.value.bruto));
    } catch {
      conf = null; // conferência é reforço: sem ela, segue só com as leituras
    }
  }

  // --- qualidade: pedir outra foto em vez de chutar ---
  if (recusas.length && recusas.length >= validas.length) {
    return { tipo: 'nova_foto', motivo: recusas[0], modelo };
  }
  if (!validas.length) {
    throw new Error(`Nenhuma leitura válida da foto. ${falhas.join(' | ')}`.slice(0, 900));
  }
  const ruins = validas.filter((o) => o.nitidez === 'ruim').length;
  const boas = validas.filter((o) => o.nitidez === 'boa').length;
  if (ruins * 2 > validas.length) {
    return {
      tipo: 'nova_foto',
      motivo: 'A foto não está nítida o bastante para ver a textura da pele. Tire outra mais perto, com boa luz e em foco.',
      modelo,
    };
  }
  if (conf && !conf.foto_permite_avaliar && (opcoes.nitidezLimitrofe || ruins > 0 || boas * 2 <= validas.length)) {
    return {
      tipo: 'nova_foto',
      motivo: conf.motivo_nova_foto
        ? `Preciso de uma foto melhor: ${conf.motivo_nova_foto}`
        : 'Preciso de uma foto melhor: lesão inteira no quadro, de perto, em foco e com boa luz.',
      modelo,
    };
  }
  if (opcoes.nitidezLimitrofe && boas === 0) {
    return {
      tipo: 'nova_foto',
      motivo: 'A foto parece um pouco tremida/fora de foco. Tire outra segurando firme e tocando na lesão para focar.',
      modelo,
    };
  }

  // --- consenso + decisão ---
  const { obs, duvidas, divergenciasConferencia } = consolidar(validas, conf);
  const grausLeituras = validas.map((o) => decidir(o, ctx).grau_sugerido);
  const provisorio = decidir(obs, ctx);
  // Descrição da leitura que chegou ao mesmo grau (texto coerente com o grau).
  const iDesc = grausLeituras.findIndex((g) => g === provisorio.grau_sugerido);
  obs.descricao = validas[iDesc >= 0 ? iDesc : 0].descricao;
  const resultado = decidir(obs, ctx);

  const divergencias: string[] = [];
  let confianca = resultado.confianca;

  const iguais = grausLeituras.filter((g) => g === resultado.grau_sugerido).length;
  const concordancia = iguais / grausLeituras.length;
  const listaGraus = grausLeituras.map((g) => NOME_GRAU[g]).join(' / ');
  if (concordancia === 1 && validas.length >= 2) confianca += 0.03;
  else if (concordancia < 1) {
    const niveis = grausLeituras.map((g) => NIVEL_GRAU[g]).filter((n): n is number => n != null);
    const salto = niveis.length >= 2 && Math.max(...niveis) - Math.min(...niveis) >= 2;
    // Sem maioria E leituras saltando de grau (ex.: 1º e 3º): não é dúvida
    // de vizinho, é foto que o modelo não consegue ler. Melhor outra foto.
    if (salto && concordancia < 0.5) {
      return {
        tipo: 'nova_foto',
        motivo:
          `As leituras desta foto discordaram muito (${listaGraus}). ` +
          'Tire outra com a lesão inteira no quadro, de frente, mais perto e com luz natural.',
        modelo,
      };
    }
    confianca -= (1 - concordancia) * 0.25;
    if (salto) confianca -= 0.1;
    divergencias.push(`leituras deram ${listaGraus}`);
  }
  if (validas.length === 1) {
    confianca -= 0.1;
    divergencias.push('só uma leitura válida da foto');
  }
  for (const d of duvidas) {
    confianca -= 0.05;
    divergencias.push(`sinal duvidoso: ${d}`);
  }
  for (const d of divergenciasConferencia) {
    confianca -= 0.05;
    divergencias.push(d);
  }
  const nivelFinal = NIVEL_GRAU[resultado.grau_sugerido] ?? 0;
  if (conf?.so_vermelhidao && nivelFinal >= 2) {
    confianca -= 0.08;
    divergencias.push('a conferência viu só vermelhidão com pele inteira');
  }
  if (opcoes.nitidezLimitrofe) confianca -= 0.05;

  resultado.confianca = Math.round(Math.min(0.92, Math.max(0.2, confianca)) * 100) / 100;
  resultado.verificacao = {
    leituras: validas.length,
    concordancia: Math.round(concordancia * 100) / 100,
    graus_leituras: grausLeituras,
    divergencias,
  };
  if (divergencias.length) {
    resultado.observacao = `${resultado.observacao} Verificação: ${divergencias.join('; ')}.`.slice(0, 800);
  }
  return { tipo: 'ok', resultado, modelo };
}
