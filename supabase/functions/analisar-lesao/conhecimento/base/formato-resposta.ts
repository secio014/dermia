// Skill: contrato de saída. Tem que bater com os schemas Zod do index.ts da
// Edge Function e com o tipo ResultadoIA em components/ValidacaoIA.tsx.

import { ACHADOS, FASES, GRAUS } from '../vocabulario.ts';

const lista = (valores: readonly string[]) => valores.map((v) => `"${v}"`).join(' | ');

export default `
# FORMATO DA RESPOSTA
Responda SEMPRE e APENAS com UM objeto JSON, sem texto antes ou depois e
sem crases de markdown.

Foto inadequada:
{"imagem_adequada": false, "motivo": "<explicação curta do problema>"}

Foto adequada:
{"grau_sugerido": ${lista(GRAUS)},
 "confianca": <número entre 0 e 1>,
 "fase": ${lista(FASES)},
 "achados": [<zero ou mais de: ${lista(ACHADOS)}>],
 "observacao": "<1-2 frases em português sobre o que você viu>"}

Não invente valores fora dessas listas. Não invente um grau para fotos ruins.
`.trim();
