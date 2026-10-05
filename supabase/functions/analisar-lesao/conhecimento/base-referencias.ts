// Base de consulta: compara a foto nova com os casos rotulados pela equipe
// (exemplos/casos-referencia.ts) e usa os mais parecidos como "segunda
// opinião" na decisão.
//
// A comparação é feita no espaço do checklist (observacao.ts): cada foto de
// referência já passou pelo MESMO modelo e o checklist dela foi salvo em
// base-referencias.gerada.ts. Assim o vício de percepção do modelo é o mesmo
// dos dois lados e se cancela. Nenhuma foto sai do nosso controle — só texto
// já anonimizado (sinais visuais + rótulo) fica no código.
//
// Gerar/atualizar a base: npx tsx scripts/avaliar-ia.ts --gerar-base

import type { Observacao } from './observacao.ts';
import type { Grau } from './vocabulario.ts';
import { BASE_GERADA } from './base-referencias.gerada.ts';

export type Referencia = { imagem: string; rotulo: string; grau: Grau; obs: Observacao };

export type Vizinho = { ref: Referencia; similaridade: number };

const NIVEL: Record<string, number> = {
  nao: 0, pequenas_areas: 1, grande_area: 2,
  nenhuma: 0, integra: 1, rota: 2,
  leve: 1, intensa: 2,
  dentro_do_limite: 1, alem_do_limite: 2,
};

// Pesos: sinais que separam graus valem mais que detalhes de aparência.
const PESOS_BOOL: [keyof Observacao, number][] = [
  ['enxerto_malha', 3],
  ['deformidade', 3],
  ['pontos_sangue', 1.5],
  ['descamacao_em_folhas', 1.5],
  ['superficie_umida', 2],
  ['crosta_escura', 1],
  ['mais_escura_que_pele_normal', 1],
  ['mais_clara_que_pele_normal', 1],
  ['area_doadora', 1],
];
const PESOS_ESCALA: [keyof Observacao, number][] = [
  ['pele_aberta', 2],
  ['bolha', 2.5],
  ['vermelhidao', 1],
  ['cicatriz_elevada', 2],
];
const PESO_CORES = 3;

// Similaridade 0..1 entre dois checklists.
export function similaridade(a: Observacao, b: Observacao): number {
  let total = 0;
  let igual = 0;
  for (const [campo, peso] of PESOS_BOOL) {
    // Dois "false" não dizem muito; só conta se algum dos dois tem o sinal.
    if (!a[campo] && !b[campo]) continue;
    total += peso;
    if (a[campo] === b[campo]) igual += peso;
  }
  for (const [campo, peso] of PESOS_ESCALA) {
    const x = NIVEL[a[campo] as string] ?? 0;
    const y = NIVEL[b[campo] as string] ?? 0;
    if (x === 0 && y === 0) continue;
    total += peso;
    igual += peso * (1 - Math.abs(x - y) / 2);
  }
  const ca = new Set(a.cores_leito);
  const cb = new Set(b.cores_leito);
  if (ca.size || cb.size) {
    const inter = [...ca].filter((c) => cb.has(c)).length;
    const uniao = new Set([...ca, ...cb]).size;
    total += PESO_CORES;
    igual += PESO_CORES * (inter / uniao);
  }
  return total === 0 ? 1 : igual / total;
}

export function casosParecidos(
  obs: Observacao,
  k = 3,
  base: Referencia[] = BASE_GERADA,
  ignorar?: string // leave-one-out na avaliação
): Vizinho[] {
  return base
    .filter((r) => r.imagem !== ignorar)
    .map((ref) => ({ ref, similaridade: similaridade(obs, ref.obs) }))
    .sort((x, y) => y.similaridade - x.similaridade)
    .slice(0, k);
}

// Grau que a maioria dos vizinhos MUITO parecidos tem (ou null).
export function consensoVizinhos(vizinhos: Vizinho[], minimo = 0.75): { grau: Grau; votos: number } | null {
  const fortes = vizinhos.filter((v) => v.similaridade >= minimo);
  if (fortes.length < 2) return null;
  const votos = new Map<Grau, number>();
  for (const v of fortes) votos.set(v.ref.grau, (votos.get(v.ref.grau) ?? 0) + 1);
  const [grau, n] = [...votos].sort((x, y) => y[1] - x[1])[0];
  return n >= 2 && n > fortes.length / 2 ? { grau, votos: n } : null;
}
