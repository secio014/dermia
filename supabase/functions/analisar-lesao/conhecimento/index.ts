// Monta o prompt de sistema da IA juntando as skills, na ordem em que ela deve
// "ler". Cada skill fica num arquivo próprio (ver README.md nesta pasta) para
// dar pra revisar/editar um assunto sem mexer nos outros.

import papel from './base/papel.ts';
import qualidadeImagem from './base/qualidade-imagem.ts';
import formatoResposta from './base/formato-resposta.ts';
import grausQueimadura from './classificacao/graus-queimadura.ts';
import regrasDecisao from './classificacao/regras-decisao.ts';
import cicatrizes from './glossario/cicatrizes.ts';
import pigmentacaoEVascular from './glossario/pigmentacao-e-vascular.ts';
import procedimentosESequelas from './glossario/procedimentos-e-sequelas.ts';
import lesoesAgudas from './glossario/lesoes-agudas.ts';
import casosReferencia from './exemplos/casos-referencia.ts';

export const SKILLS: { id: string; conteudo: string }[] = [
  { id: 'base/papel', conteudo: papel },
  { id: 'base/qualidade-imagem', conteudo: qualidadeImagem },
  { id: 'classificacao/graus-queimadura', conteudo: grausQueimadura },
  { id: 'glossario/cicatrizes', conteudo: cicatrizes },
  { id: 'glossario/pigmentacao-e-vascular', conteudo: pigmentacaoEVascular },
  { id: 'glossario/procedimentos-e-sequelas', conteudo: procedimentosESequelas },
  { id: 'glossario/lesoes-agudas', conteudo: lesoesAgudas },
  { id: 'exemplos/casos-referencia', conteudo: casosReferencia },
  { id: 'classificacao/regras-decisao', conteudo: regrasDecisao },
  // Formato por último: é o que o modelo mais "lembra" na hora de responder.
  { id: 'base/formato-resposta', conteudo: formatoResposta },
];

export function montarPromptSistema(): string {
  return SKILLS.map((s) => s.conteudo).join('\n\n');
}

export const PROMPT_USUARIO =
  'Analise a foto em anexo seguindo as instruções. Primeiro verifique se ela é ' +
  'adequada; se for, identifique fase, achados e grau, e responda só o JSON.';

export { ACHADOS, FASES, GRAUS } from './vocabulario.ts';
