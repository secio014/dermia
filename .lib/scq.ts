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

// Nome da tabela salvo em lesoes.scq_tabela no Supabase — os únicos valores
// aceitos pela check constraint são exatamente estes dois.
export function scqTabela(pediatrico: boolean): string {
  return pediatrico ? 'lund_browder_pediatrico' : 'wallace_adulto';
}

export function rotuloRegiaoCorporal(regioesMarcadas: RegiaoId[]): string {
  if (regioesMarcadas.length === 0) return '';
  if (regioesMarcadas.length === 1) {
    return REGIOES.find((r) => r.id === regioesMarcadas[0])!.rotulo;
  }
  return 'Múltiplas regiões';
}

// Valores esperados por lesoes.grau_clinico — a view vw_painel_pacientes usa
// exatamente essas strings para calcular a prioridade no painel de pacientes.
export const GRAUS_CLINICOS: { id: string; rotulo: string }[] = [
  { id: '1', rotulo: '1º grau' },
  { id: '2_superficial', rotulo: '2º grau superficial' },
  { id: '2_profundo', rotulo: '2º grau profundo' },
  { id: '3', rotulo: '3º grau' },
  { id: 'misto', rotulo: 'Misto' },
  { id: 'indeterminado', rotulo: 'Indeterminado' },
];

// Valores aceitos por lesoes.mecanismo.
export const MECANISMOS: { id: string; rotulo: string }[] = [
  { id: 'escaldadura', rotulo: 'Escaldadura' },
  { id: 'chama', rotulo: 'Chama' },
  { id: 'eletrica', rotulo: 'Elétrica' },
  { id: 'quimica', rotulo: 'Química' },
  { id: 'contato', rotulo: 'Contato' },
  { id: 'radiacao', rotulo: 'Radiação' },
  { id: 'outro', rotulo: 'Outro' },
];

// Valores aceitos por lesoes.status.
export const STATUS_LESAO: { id: string; rotulo: string }[] = [
  { id: 'ativa', rotulo: 'Ativa' },
  { id: 'cicatrizada', rotulo: 'Cicatrizada' },
  { id: 'alta', rotulo: 'Alta' },
];
