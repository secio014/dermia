// Etapa 2 da análise: transforma o checklist visual (observacao.ts) + o
// contexto da lesão (tempo, causa) no grau, fase, achados e confiança.
//
// Regras fixas em código em vez de "pedir pro modelo decidir": o resultado
// fica reprodutível, explicável (a observação diz o PORQUÊ) e não puxa para
// um grau só. Critérios do material clínico da equipe (dermia-docs-doenca)
// + classificação usual de profundidade (cartilha MS de queimaduras).

import type { Achado, Fase, Grau } from './vocabulario.ts';
import type { ContextoLesao, Observacao } from './observacao.ts';
import { type Vizinho, casosParecidos, consensoVizinhos } from './base-referencias.ts';

export type Resultado = {
  grau_sugerido: Grau;
  confianca: number;
  fase: Fase;
  achados?: Achado[];
  observacao: string;
  // Casos rotulados mais parecidos da base (auditoria/tela de validação).
  casos_parecidos?: { imagem: string; rotulo: string; similaridade: number }[];
  // Validação cruzada (pipeline.ts): quantas leituras independentes da foto,
  // que grau cada uma daria e onde discordaram.
  verificacao?: {
    leituras: number;
    concordancia: number;
    graus_leituras: Grau[];
    divergencias: string[];
  };
};

const NOME_GRAU: Record<Grau, string> = {
  '1': '1º grau',
  '2_superficial': '2º grau superficial',
  '2_profundo': '2º grau profundo',
  '3': '3º grau',
  misto: 'misto',
  indeterminado: 'indeterminado',
};

// Nível de profundidade de cada sinal da fase aguda.
type Nivel = 1 | 2 | 3 | 4; // 1=1º, 2=2º sup, 3=2º prof, 4=3º
const GRAU_DO_NIVEL: Record<Nivel, Grau> = { 1: '1', 2: '2_superficial', 3: '2_profundo', 4: '3' };

export function decidir(
  obs: Observacao,
  ctx: ContextoLesao = {},
  // Avaliação usa leave-one-out: não consultar a própria foto na base.
  opcoes: { ignorarReferencia?: string } = {}
): Resultado {
  const motivos: string[] = [];
  const notas: string[] = [];
  const dias = ctx.dias_desde_queimadura ?? null;
  const cores = new Set(obs.cores_leito);

  const aberta = obs.pele_aberta !== 'nao' || obs.bolha !== 'nenhuma';
  const sinaisCicatriz =
    obs.cicatriz_elevada !== 'nenhuma' ||
    obs.enxerto_malha ||
    obs.deformidade ||
    obs.area_doadora ||
    ((obs.mais_escura_que_pele_normal || obs.mais_clara_que_pele_normal) && !aberta);

  // --- fase ---
  let fase: Fase;
  if (aberta || obs.descamacao_em_folhas) fase = 'aguda';
  else if (sinaisCicatriz) fase = 'cicatricial';
  else if (dias != null && dias > 30) fase = 'cicatricial';
  else fase = 'aguda';

  // --- sinais de profundidade (cada um com seu nível) ---
  const niveis = new Set<Nivel>();
  const marcar = (n: Nivel, motivo: string) => {
    niveis.add(n);
    motivos.push(motivo);
  };

  // Sequelas/tratamento de espessura total.
  if (obs.enxerto_malha) marcar(4, 'enxerto em malha (tratamento de 3º grau)');
  if (obs.deformidade) marcar(4, 'deformidade/retração');

  if (cores.has('marrom_preto_carbonizado')) marcar(4, 'tecido carbonizado');
  if (cores.has('branco_couro_ou_marmoreo')) marcar(4, 'leito branco/marmóreo seco, aspecto de couro');
  if (cores.has('granulacao_vermelho_vivo')) {
    if (obs.pele_aberta === 'grande_area') marcar(4, 'granulação extensa');
    else marcar(3, 'granulação em área pequena');
  }
  if (cores.has('vermelho_escuro_ou_mosqueado')) marcar(3, 'leito vermelho-escuro/mosqueado');
  if (cores.has('branco_palido_pouco_umido') && !obs.pontos_sangue) {
    marcar(3, 'leito pálido e pouco úmido, sem pontos de sangue');
  }
  if (cores.has('amarelo_fibrina')) marcar(3, 'fibrina no leito');
  if (obs.crosta_escura && fase === 'aguda' && obs.pele_aberta !== 'nao') {
    marcar(3, 'crosta escura sobre ferida');
  }

  if (obs.bolha === 'integra') marcar(2, 'bolha íntegra');
  if (obs.bolha === 'rota') marcar(2, 'bolha rota');
  if (cores.has('rosa_vermelho_umido')) marcar(2, 'leito rosa/vermelho úmido');
  if (obs.pontos_sangue) marcar(2, 'pontos de sangue no leito (derme viva)');
  // 1º grau é SECO. Úmido/brilhante sem ferida visível = epiderme já perdida
  // (bolha rota recente, exsudato) → 2º superficial.
  if (obs.superficie_umida && fase === 'aguda' && !cores.has('rosa_vermelho_umido')) {
    marcar(2, 'superfície úmida/brilhante (1º grau é seco)');
  }

  if (!aberta && !obs.superficie_umida && obs.vermelhidao !== 'nenhuma' && fase === 'aguda') {
    marcar(1, obs.descamacao_em_folhas ? 'vermelhidão com pele íntegra descamando' : 'vermelhidão com pele íntegra');
  }

  // --- grau ---
  let grau: Grau;
  const presentes = [...niveis].sort((a, b) => a - b);
  // O 1º grau em volta de um 2º/3º é só o halo esperado: não conta para misto.
  const relevantes = presentes.length > 1 ? presentes.filter((n) => n !== 1) : presentes;
  const max = relevantes.length ? relevantes[relevantes.length - 1] : null;
  const min = relevantes.length ? relevantes[0] : null;

  if (max == null) {
    grau = 'indeterminado';
    motivos.push(
      fase === 'cicatricial'
        ? 'cicatriz sem pista visual do grau original'
        : 'nenhum sinal de profundidade claro na foto'
    );
  } else if (obs.enxerto_malha || obs.deformidade) {
    grau = '3'; // sequela de 3º manda, mesmo com áreas mais rasas em volta
  } else if (max - min! >= 2) {
    grau = 'misto';
    notas.push(`áreas de ${NOME_GRAU[GRAU_DO_NIVEL[min!]]} e de ${NOME_GRAU[GRAU_DO_NIVEL[max]]}`);
  } else {
    grau = GRAU_DO_NIVEL[max];
  }

  // --- contexto clínico ---
  // 2º superficial reepiteliza em até ~3 semanas. Ainda aberta depois disso
  // = profundidade maior do que parece.
  if (grau === '2_superficial' && obs.pele_aberta !== 'nao' && dias != null && dias > 21) {
    grau = '2_profundo';
    notas.push(`ainda aberta após ${dias} dias (2º superficial costuma fechar em até 3 semanas)`);
  }
  if (grau === '1' && dias != null && dias > 10 && obs.vermelhidao !== 'nenhuma') {
    notas.push(`vermelhidão persistente após ${dias} dias — reavaliar`);
  }
  const mecanismoEnganoso = ctx.mecanismo === 'eletrica' || ctx.mecanismo === 'quimica';
  if (mecanismoEnganoso && grau !== '3') {
    notas.push(
      `queimadura ${ctx.mecanismo === 'eletrica' ? 'elétrica' : 'química'}: pode ser mais profunda do que aparenta na foto`
    );
  }

  // --- achados ---
  const achados = new Set<Achado>();
  // Achados de cicatriz só na fase cicatricial: em lesão aguda, "relevo" é
  // edema/bolha e "mancha escura" é crosta — o modelo confunde.
  if (fase === 'cicatricial') {
    if (obs.cicatriz_elevada === 'alem_do_limite') achados.add('queloide');
    if (obs.cicatriz_elevada === 'dentro_do_limite') achados.add('hipertrofica');
    if (obs.mais_escura_que_pele_normal) achados.add('hipercromica');
  }
  // Discromia clara em lesão aguda quase sempre é pele protegida/descamando.
  if (obs.mais_clara_que_pele_normal && fase === 'cicatricial') achados.add('hipocromica');
  if (obs.vermelhidao !== 'nenhuma') achados.add('hiperemia');
  if (obs.enxerto_malha) achados.add('enxerto_malha');
  if (obs.area_doadora) achados.add('area_doadora');
  if (obs.deformidade) achados.add('deformidade');
  if (obs.pele_aberta !== 'nao') achados.add('ferida_aberta');
  if (obs.bolha !== 'nenhuma') achados.add('bolha');
  if (obs.descamacao_em_folhas) achados.add('descamacao');

  // --- confiança ---
  let confianca: number;
  if (grau === 'indeterminado') confianca = fase === 'cicatricial' ? 0.55 : 0.35;
  else {
    // Quanto mais sinais concordando, mais confiança.
    const sinaisDoGrau = motivos.length;
    confianca = sinaisDoGrau >= 3 ? 0.88 : sinaisDoGrau === 2 ? 0.82 : 0.72;
    if (grau === 'misto') confianca -= 0.1;
    if (relevantes.length === 2 && grau !== 'misto' && !obs.enxerto_malha && !obs.deformidade) {
      confianca -= 0.1; // sinais de graus vizinhos: dúvida real
    }
  }
  if (obs.nitidez === 'media') confianca -= 0.08;
  if (obs.nitidez === 'ruim') confianca -= 0.2;
  if (mecanismoEnganoso) confianca -= 0.12;
  if (!obs.descricao) confianca -= 0.1; // modelo não descreveu: resposta pobre

  // --- segunda opinião: casos rotulados parecidos da base ---
  const vizinhos: Vizinho[] = casosParecidos(obs, 3, undefined, opcoes.ignorarReferencia);
  const consenso = consensoVizinhos(vizinhos);
  if (consenso) {
    const nomeConsenso = NOME_GRAU[consenso.grau];
    if (grau === 'indeterminado') {
      grau = consenso.grau;
      confianca = 0.5;
      motivos.push(`${consenso.votos} casos muito parecidos da base são ${nomeConsenso}`);
    } else if (consenso.grau === grau) {
      confianca += 0.05;
      notas.push(`confirmado por ${consenso.votos} casos parecidos da base`);
    } else {
      confianca -= 0.12;
      notas.push(`${consenso.votos} casos parecidos da base foram rotulados ${nomeConsenso} — conferir`);
    }
  }
  confianca = Math.round(Math.min(0.92, Math.max(0.2, confianca)) * 100) / 100;

  // --- observação: o que viu + por que o grau ---
  const porque =
    grau === 'indeterminado'
      ? `Grau indeterminado: ${motivos.join('; ')}.`
      : `Sugestão ${NOME_GRAU[grau]} por: ${motivos.join('; ')}.`;
  const descricao = obs.descricao && !/[.!?]$/.test(obs.descricao) ? `${obs.descricao}.` : obs.descricao;
  const observacao = [descricao, porque, notas.length ? `Atenção: ${notas.join('; ')}.` : '']
    .filter(Boolean)
    .join(' ')
    .slice(0, 600);

  return {
    grau_sugerido: grau,
    confianca,
    fase,
    achados: achados.size ? [...achados] : undefined,
    observacao,
    casos_parecidos: vizinhos.length
      ? vizinhos.map((v) => ({
          imagem: v.ref.imagem,
          rotulo: v.ref.rotulo,
          similaridade: Math.round(v.similaridade * 100) / 100,
        }))
      : undefined,
  };
}
