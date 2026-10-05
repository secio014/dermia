// Conhecimento da análise de lesão, em 2 etapas (ver README.md nesta pasta):
//   observacao.ts — prompt do checklist visual que o modelo preenche e a
//                   leitura tolerante da resposta;
//   decisao.ts    — regras clínicas que transformam checklist + contexto da
//                   lesão em grau, fase, achados, confiança e observação.

export {
  type Conferencia,
  type ContextoLesao,
  type CorLeito,
  type Observacao,
  extrairJson,
  lerConferencia,
  lerObservacao,
  montarPromptConferencia,
  montarPromptObservacao,
} from './observacao.ts';
export { type Resultado, decidir } from './decisao.ts';
export { ACHADOS, FASES, GRAUS } from './vocabulario.ts';
