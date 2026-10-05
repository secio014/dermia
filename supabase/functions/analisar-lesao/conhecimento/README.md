# Conhecimento da IA (analisar-lesao)

O modelo de visão (Llama 3.2 11B Vision no Cloudflare Workers AI) não é
re-treinado: ele "aprende" lendo estas **skills** no prompt de sistema a cada
análise. Cada skill é um arquivo `.ts` que exporta um texto. Ficam em arquivos
separados para que dê pra revisar ou editar um assunto sem mexer nos outros.

Fonte clínica: `dermia-docs-doenca.docx` (glossário + 26 fotos rotuladas pela
equipe).

## Pastas

| Pasta / arquivo | O que ensina |
|---|---|
| `base/papel.ts` | Quem a IA é, limites, ser conservadora |
| `base/qualidade-imagem.ts` | Quando recusar a foto; ignorar a tela do celular, a régua e o lençol |
| `base/formato-resposta.ts` | O JSON de saída (gerado a partir de `vocabulario.ts`) |
| `classificacao/graus-queimadura.ts` | Sinais visuais de 1º, 2º superficial, 2º profundo, 3º, misto e indeterminado |
| `classificacao/regras-decisao.ts` | Passo a passo, como calibrar a confiança e o que escrever na observação |
| `glossario/cicatrizes.ts` | Queloide x hipertrófica |
| `glossario/pigmentacao-e-vascular.ts` | Hipercrômica, hipocrômica e hiperemia |
| `glossario/procedimentos-e-sequelas.ts` | Enxerto em malha, área doadora, deformidade e ferida aberta |
| `exemplos/casos-referencia.ts` | Os 26 casos do documento, cada um com a descrição da foto e o rótulo correto |
| `vocabulario.ts` | Listas fechadas (graus, fases, achados), usadas pelo prompt e pelo Zod |
| `index.ts` | Ordem de leitura e montagem do prompt (`montarPromptSistema`) |

## Como ensinar algo novo

- **Novo termo clínico**: crie um arquivo em `glossario/`. Se ele for virar um
  achado, adicione o id em `vocabulario.ts` e o rótulo em
  `ROTULOS_ACHADOS` (`components/ValidacaoIA.tsx`). Depois registre o arquivo
  em `SKILLS` no `index.ts`.
- **Novo caso de referência**: acrescente um item em `CASOS`
  (`exemplos/casos-referencia.ts`) descrevendo o que aparece na foto e o
  rótulo dado pela equipe.
- **Uma correção recorrente** (por exemplo, a IA confunde X com Y): escreva a
  regra em `classificacao/regras-decisao.ts`.

Depois de editar: `supabase functions deploy analisar-lesao`.

Hoje o prompt tem cerca de 3,5 mil tokens. Mantenha os textos curtos, porque
um modelo de 11B segue melhor instruções objetivas do que textos longos.

## Fotos de referência

As fotos extraídas do .docx ficam em `ia-referencias/<categoria>/`, na raiz do
repositório. Essa pasta está no **.gitignore** porque são dados de pacientes
(LGPD) e não podem ser versionados. Servem para testar o prompt manualmente
e, no futuro, para avaliar ou fazer fine-tuning de um modelo.
