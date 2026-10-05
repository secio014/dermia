// Etapa 1 da análise: o modelo de visão só OBSERVA. Ele preenche um checklist
// de sinais visuais (bolha, cor do leito, relevo...) e NÃO escolhe o grau.
// O grau sai da etapa 2 (decisao.ts), com regras clínicas fixas em código.
//
// Por quê: pedindo o grau direto, o modelo de 11B escrevia o grau ANTES de
// olhar a foto e quase sempre caía no 2º grau. Perguntas simples de "tem ou
// não tem" ele acerta muito mais.
//
// Sem dependências (nem Zod) para rodar igual no Deno (Edge Function) e no
// Node (scripts/avaliar-ia.ts).

export const CORES_LEITO = [
  'rosa_vermelho_umido',
  'vermelho_escuro_ou_mosqueado',
  'branco_palido_pouco_umido',
  'branco_couro_ou_marmoreo',
  'marrom_preto_carbonizado',
  'granulacao_vermelho_vivo',
  'amarelo_fibrina',
] as const;

export type CorLeito = (typeof CORES_LEITO)[number];

export type Observacao = {
  descricao: string;
  pele_aberta: 'nao' | 'pequenas_areas' | 'grande_area';
  cores_leito: CorLeito[];
  pontos_sangue: boolean;
  bolha: 'nenhuma' | 'integra' | 'rota';
  vermelhidao: 'nenhuma' | 'leve' | 'intensa';
  descamacao_em_folhas: boolean;
  superficie_umida: boolean;
  crosta_escura: boolean;
  cicatriz_elevada: 'nenhuma' | 'dentro_do_limite' | 'alem_do_limite';
  mais_escura_que_pele_normal: boolean;
  mais_clara_que_pele_normal: boolean;
  enxerto_malha: boolean;
  area_doadora: boolean;
  deformidade: boolean;
  nitidez: 'boa' | 'media' | 'ruim';
};

export type ContextoLesao = {
  regiao_corporal?: string | null;
  mecanismo?: string | null;
  dias_desde_queimadura?: number | null;
};

const MECANISMOS: Record<string, string> = {
  escaldadura: 'líquido quente (escaldadura)',
  chama: 'chama/fogo',
  eletrica: 'elétrica',
  quimica: 'química',
  contato: 'contato com superfície quente',
  radiacao: 'radiação/sol',
  outro: 'outro',
};

function textoContexto(ctx: ContextoLesao): string {
  const linhas: string[] = [];
  if (ctx.regiao_corporal) linhas.push(`- Região do corpo: ${ctx.regiao_corporal}`);
  if (ctx.mecanismo) linhas.push(`- Causa: ${MECANISMOS[ctx.mecanismo] ?? ctx.mecanismo}`);
  if (ctx.dias_desde_queimadura != null) {
    linhas.push(`- Tempo desde a queimadura: ${ctx.dias_desde_queimadura} dia(s)`);
  }
  return linhas.length
    ? `CONTEXTO CLÍNICO (informado pelo profissional):\n${linhas.join('\n')}\n`
    : '';
}

// Prompt único (tudo na mensagem do usuário, junto da imagem): o Llama 3.2
// Vision não foi treinado com prompt de sistema + imagem e passa a ignorar
// parte das instruções.
export function montarPromptObservacao(ctx: ContextoLesao): string {
  return `Você ajuda fisioterapeutas a documentar QUEIMADURAS e CICATRIZES de queimadura.
Olhe a foto com atenção e descreva SÓ o que você vê na pele. Não dê diagnóstico nem grau.
Ignore lençol, roupa, régua, luvas e a interface do celular (se for foto de uma tela).
${textoContexto(ctx)}
Responda APENAS um objeto JSON, sem texto antes ou depois, com estas chaves NESTA ORDEM:

{"imagem_adequada": true,
 "descricao": "<2 a 3 frases em português: local do corpo, cor, se está úmido ou seco, bolhas, relevo, bordas, pele normal em volta>",
 "pele_aberta": "nao" | "pequenas_areas" | "grande_area",
 "cores_leito": [<zero ou mais de: ${CORES_LEITO.map((c) => `"${c}"`).join(', ')}>],
 "pontos_sangue": true | false,
 "bolha": "nenhuma" | "integra" | "rota",
 "vermelhidao": "nenhuma" | "leve" | "intensa",
 "descamacao_em_folhas": true | false,
 "superficie_umida": true | false,
 "crosta_escura": true | false,
 "cicatriz_elevada": "nenhuma" | "dentro_do_limite" | "alem_do_limite",
 "mais_escura_que_pele_normal": true | false,
 "mais_clara_que_pele_normal": true | false,
 "enxerto_malha": true | false,
 "area_doadora": true | false,
 "deformidade": true | false,
 "nitidez": "boa" | "media" | "ruim"}

O QUE CADA CAMPO SIGNIFICA:
- pele_aberta: área SEM pele cobrindo (ferida, bolha estourada, erosão). Pele vermelha mas inteira = "nao".
- cores_leito: só preencha se pele_aberta não for "nao". Marque TODAS as cores que aparecem no leito aberto:
  rosa_vermelho_umido = rosa/vermelho vivo, molhado, brilhante;
  vermelho_escuro_ou_mosqueado = vermelho-escuro opaco ou manchado de vermelho e branco;
  branco_palido_pouco_umido = rosa-pálido/esbranquiçado, pouco úmido;
  branco_couro_ou_marmoreo = branco, cinza ou marmorizado, SECO, duro como couro;
  marrom_preto_carbonizado = marrom-escuro ou preto, queimado/carbonizado;
  granulacao_vermelho_vivo = tecido vermelho-vivo granuloso (ferida antiga em cicatrização);
  amarelo_fibrina = camada amarelada sobre a ferida.
- pontos_sangue: pontinhos vermelho-escuros de sangue no leito.
- bolha: "integra" = pele levantada com líquido claro/amarelado dentro; "rota" = bolha estourada (círculo vermelho úmido com pele solta branca na borda). Pele branca SOLTA e enrugada sobre área úmida também é bolha rota.
- vermelhidao: vermelho da pele (inclusive pele inteira, como queimadura de sol).
- descamacao_em_folhas: pele morta soltando em folhas finas brancas com bordas enroladas.
- superficie_umida: a lesão está MOLHADA/BRILHANTE (reflexo de luz úmido, exsudato, aspecto "vidrado") em alguma parte? Pele vermelha mas SECA e fosca, como queimadura de sol, = false.
- cicatriz_elevada: relevo acima da pele. "dentro_do_limite" = respeita o contorno da lesão; "alem_do_limite" = massa firme e brilhante que invade a pele sã em volta (queloide).
- mais_escura_que_pele_normal / mais_clara_que_pele_normal: manchas de CICATRIZ mais escuras/claras que a pele saudável do paciente. A pele clara que a roupa protegia do sol é NORMAL (false). Pele branca descamando NÃO conta.
- enxerto_malha: padrão quadriculado/losangos ("pele de cobra") ou fileiras de pequenos cortes.
- area_doadora: retângulo de bordas retas (geralmente na coxa) de onde tiraram pele para enxerto.
- deformidade: dedos em garra/retraídos, articulação presa, orelha ou nariz deformados.
- nitidez: dá para ver textura e bordas da pele? "ruim" = muito borrada/escura.

Se a foto estiver preta, muito borrada, sem pele, ou claramente não for queimadura/cicatriz, responda só:
{"imagem_adequada": false, "motivo": "<explicação curta>"}`;
}

// Conferência: segunda olhada com perguntas curtas de sim/não, formuladas de
// outro jeito, sobre os sinais que mais mudam o grau (bolha, ferida aberta,
// área seca/rígida de 3º grau) e se a foto dá para avaliar. Entra como voto
// extra na consolidação (pipeline.ts) e pega o vício de "ver bolha em tudo".
export type Conferencia = {
  tem_bolha: boolean;
  tem_ferida_aberta: boolean;
  area_seca_rigida: boolean;
  so_vermelhidao: boolean;
  superficie_umida: boolean;
  foto_permite_avaliar: boolean;
  motivo_nova_foto: string;
};

export function montarPromptConferencia(): string {
  return `Olhe SÓ a pele lesionada desta foto e responda com cuidado cada pergunta. Se não tiver certeza, responda false.

1. tem_bolha: existe uma BOLHA — pele levantada, como um balão, com líquido claro ou amarelado dentro — OU restos de bolha estourada (pele fina, branca e solta, enrugada, sobre uma área úmida)? Mancha vermelha lisa NÃO é bolha.
2. tem_ferida_aberta: existe área SEM pele por cima (carne viva, úmida, sangrando ou com secreção)?
3. area_seca_rigida: existe área branca, cinza, amarelo-cera, marrom ou preta que pareça SECA, dura, sem brilho, como couro ou carvão?
4. so_vermelhidao: a pele está INTEIRA (sem bolha, sem ferida, sem cicatriz), apenas vermelha ou rosada, e SECA?
5. superficie_umida: alguma parte da lesão está molhada ou brilhante (reflexo úmido, exsudato), diferente de pele seca e fosca?
6. foto_permite_avaliar: a foto está em foco, com luz suficiente, e mostra a lesão inteira e de perto o bastante para ver a textura da pele?
7. motivo_nova_foto: se foto_permite_avaliar for false, diga em uma frase curta o que melhorar (ex.: "está desfocada", "lesão cortada na borda", "muito longe"); senão "".

Responda APENAS um objeto JSON:
{"tem_bolha": true|false, "tem_ferida_aberta": true|false, "area_seca_rigida": true|false, "so_vermelhidao": true|false, "superficie_umida": true|false, "foto_permite_avaliar": true|false, "motivo_nova_foto": "<texto>"}`;
}

export function lerConferencia(bruto: unknown): Conferencia {
  const o = (bruto ?? {}) as Record<string, unknown>;
  return {
    tem_bolha: sim(o.tem_bolha),
    tem_ferida_aberta: sim(o.tem_ferida_aberta),
    area_seca_rigida: sim(o.area_seca_rigida),
    so_vermelhidao: sim(o.so_vermelhidao),
    superficie_umida: sim(o.superficie_umida),
    // Ausente = pode avaliar (não recusa foto por resposta incompleta).
    foto_permite_avaliar: o.foto_permite_avaliar === undefined ? true : sim(o.foto_permite_avaliar),
    motivo_nova_foto: typeof o.motivo_nova_foto === 'string' ? o.motivo_nova_foto.trim() : '',
  };
}

// --- leitura tolerante da resposta ------------------------------------------

function normalizar(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
}

function escolher<T extends string>(v: unknown, opcoes: readonly T[], padrao: T): T {
  const n = normalizar(v);
  return (opcoes as readonly string[]).includes(n) ? (n as T) : padrao;
}

function sim(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  return ['true', 'sim', 'yes', '1'].includes(normalizar(v));
}

export type RespostaObservacao =
  | { adequada: false; motivo: string }
  | { adequada: true; obs: Observacao };

// Campo fora do vocabulário vira o valor neutro em vez de derrubar a análise.
export function lerObservacao(bruto: unknown): RespostaObservacao {
  const o = (bruto ?? {}) as Record<string, unknown>;
  if (o.imagem_adequada === false || normalizar(o.imagem_adequada) === 'false') {
    const motivo = typeof o.motivo === 'string' && o.motivo.trim() ? o.motivo.trim() : '';
    return { adequada: false, motivo: motivo || 'A imagem não está adequada para análise.' };
  }
  const cores = Array.isArray(o.cores_leito) ? o.cores_leito : [];
  const obs: Observacao = {
    descricao: typeof o.descricao === 'string' ? o.descricao.trim() : '',
    pele_aberta: escolher(o.pele_aberta, ['nao', 'pequenas_areas', 'grande_area'] as const, 'nao'),
    cores_leito: [
      ...new Set(
        cores
          .map((c) => escolher(c, CORES_LEITO, '' as CorLeito))
          .filter((c): c is CorLeito => !!c)
      ),
    ],
    pontos_sangue: sim(o.pontos_sangue),
    bolha: escolher(o.bolha, ['nenhuma', 'integra', 'rota'] as const, 'nenhuma'),
    vermelhidao: escolher(o.vermelhidao, ['nenhuma', 'leve', 'intensa'] as const, 'nenhuma'),
    descamacao_em_folhas: sim(o.descamacao_em_folhas),
    superficie_umida: sim(o.superficie_umida),
    crosta_escura: sim(o.crosta_escura),
    cicatriz_elevada: escolher(
      o.cicatriz_elevada,
      ['nenhuma', 'dentro_do_limite', 'alem_do_limite'] as const,
      'nenhuma'
    ),
    mais_escura_que_pele_normal: sim(o.mais_escura_que_pele_normal),
    mais_clara_que_pele_normal: sim(o.mais_clara_que_pele_normal),
    enxerto_malha: sim(o.enxerto_malha),
    area_doadora: sim(o.area_doadora),
    deformidade: sim(o.deformidade),
    nitidez: escolher(o.nitidez, ['boa', 'media', 'ruim'] as const, 'media'),
  };
  // Leito sem pele aberta não faz sentido: o modelo marcou cor por engano.
  if (obs.pele_aberta === 'nao' && obs.bolha !== 'rota') obs.cores_leito = [];
  return { adequada: true, obs };
}

// Extrai o objeto JSON de um texto que pode vir com crases ou lixo em volta.
export function extrairJson(texto: string): unknown {
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
