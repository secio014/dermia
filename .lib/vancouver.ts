// Escala de Vancouver (Vancouver Scar Scale) — avalia a cicatriz em 4 eixos.
// Salva em registros_evolucao.escala_cicatriz como jsonb.
export type EscalaCicatriz = {
  pigmentacao: number; // 0-3
  vascularidade: number; // 0-3
  elasticidade: number; // 0-5
  altura: number; // 0-4
};

export const CAMPOS_VANCOUVER: { campo: keyof EscalaCicatriz; rotulo: string; max: number }[] = [
  { campo: 'pigmentacao', rotulo: 'Pigmentação', max: 3 },
  { campo: 'vascularidade', rotulo: 'Vascularidade', max: 3 },
  { campo: 'elasticidade', rotulo: 'Elasticidade', max: 5 },
  { campo: 'altura', rotulo: 'Altura/espessura', max: 4 },
];

export const VANCOUVER_MAXIMO = 15;

export function totalVancouver(escala: EscalaCicatriz): number {
  return escala.pigmentacao + escala.vascularidade + escala.elasticidade + escala.altura;
}
