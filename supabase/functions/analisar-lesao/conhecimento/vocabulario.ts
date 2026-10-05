// Vocabulário fechado que a IA pode usar. Fonte única: o prompt (skills) e a
// validação Zod do index.ts leem daqui, então mudar aqui muda os dois.
// GRAUS bate com GRAUS_CLINICOS em .lib/scq.ts.

export const GRAUS = ['1', '2_superficial', '2_profundo', '3', 'misto', 'indeterminado'] as const;

export const FASES = ['aguda', 'cicatricial'] as const;

export const ACHADOS = [
  'queloide',
  'hipertrofica',
  'hipercromica',
  'hipocromica',
  'hiperemia',
  'enxerto_malha',
  'area_doadora',
  'deformidade',
  'ferida_aberta',
  'bolha',
  'descamacao',
] as const;

export type Grau = (typeof GRAUS)[number];
export type Fase = (typeof FASES)[number];
export type Achado = (typeof ACHADOS)[number];
