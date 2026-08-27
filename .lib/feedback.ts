export const ETAPAS_FEEDBACK: { id: string; rotulo: string }[] = [
  { id: 'cadastro_paciente', rotulo: 'Cadastro de paciente' },
  { id: 'registro_lesao', rotulo: 'Registro de lesão' },
  { id: 'evolucao', rotulo: 'Evolução/goniometria' },
  { id: 'foto_ia', rotulo: 'Foto e análise de IA' },
  { id: 'exercicio', rotulo: 'Prescrição de exercício' },
  { id: 'outro', rotulo: 'Outro' },
];

export function rotuloEtapaFeedback(etapa: string): string {
  return ETAPAS_FEEDBACK.find((e) => e.id === etapa)?.rotulo ?? etapa;
}
