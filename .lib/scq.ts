// Cálculo de Superfície Corporal Queimada (SCQ) pela Regra dos Nove de Wallace.
// Cada região é uma parte "inteira" do corpo (o braço não é dividido em
// frente/trás, só o tronco é, por isso "tronco_anterior" e "tronco_posterior"
// existem separadamente enquanto o resto aparece igual nas duas vistas).

export type RegiaoId =
  | 'cabeca'
  | 'braco_dir'
  | 'braco_esq'
  | 'tronco_anterior'
  | 'tronco_posterior'
  | 'perna_dir'
  | 'perna_esq'
  | 'genitalia';

export const REGIOES: { id: RegiaoId; rotulo: string }[] = [
  { id: 'cabeca', rotulo: 'Cabeça e pescoço' },
  { id: 'braco_dir', rotulo: 'Braço direito' },
  { id: 'braco_esq', rotulo: 'Braço esquerdo' },
  { id: 'tronco_anterior', rotulo: 'Tronco anterior' },
  { id: 'tronco_posterior', rotulo: 'Tronco posterior' },
  { id: 'perna_dir', rotulo: 'Perna direita' },
  { id: 'perna_esq', rotulo: 'Perna esquerda' },
  { id: 'genitalia', rotulo: 'Genitália/períneo' },
];

const PERCENTUAIS_ADULTO: Record<RegiaoId, number> = {
  cabeca: 9,
  braco_dir: 9,
  braco_esq: 9,
  tronco_anterior: 18,
  tronco_posterior: 18,
  perna_dir: 18,
  perna_esq: 18,
  genitalia: 1,
};

// Crianças têm cabeça proporcionalmente maior e pernas menores.
const PERCENTUAIS_PEDIATRICO: Record<RegiaoId, number> = {
  cabeca: 18,
  braco_dir: 9,
  braco_esq: 9,
  tronco_anterior: 18,
  tronco_posterior: 18,
  perna_dir: 13.5,
  perna_esq: 13.5,
  genitalia: 1,
};

export function percentualDaRegiao(regiao: RegiaoId, pediatrico: boolean): number {
  return (pediatrico ? PERCENTUAIS_PEDIATRICO : PERCENTUAIS_ADULTO)[regiao];
}

export function calcularSCQ(regioesMarcadas: RegiaoId[], pediatrico: boolean): number {
  const tabela = pediatrico ? PERCENTUAIS_PEDIATRICO : PERCENTUAIS_ADULTO;
  const total = regioesMarcadas.reduce((soma, regiao) => soma + (tabela[regiao] ?? 0), 0);
  return Math.round(total * 100) / 100;
}
