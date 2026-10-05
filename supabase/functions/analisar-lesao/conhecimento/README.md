# Conhecimento da IA (analisar-lesao)

O modelo de visão do Cloudflare Workers AI não é re-treinado. A análise roda
em **2 etapas** para que o modelo não "chute" o grau:

1. **Observação** (`observacao.ts`): o modelo só preenche um checklist do que
   VÊ na foto (bolha íntegra/rota, cor do leito, pontos de sangue, relevo,
   descamação, enxerto...) e escreve uma descrição curta. Ele não escolhe o
   grau. O prompt leva também o contexto da lesão: região, causa e dias desde
   a queimadura.
2. **Decisão** (`decisao.ts`): regras clínicas fixas em código transformam o
   checklist e o contexto em grau, fase, achados, confiança e observação. A
   observação explica o PORQUÊ do grau.
3. **Base de consulta** (`base-referencias.ts`): o checklist da foto nova é
   comparado com o dos casos rotulados pela equipe. Os 3 mais parecidos
   confirmam a decisão (a confiança sobe), contestam (a confiança cai e
   aparece um aviso) ou resolvem um "indeterminado". O profissional vê esses
   casos na tela de validação.

## Validação antes de responder (`../pipeline.ts`, `../qualidade.ts`)

Uma resposta errada com cara de certa é pior que uma resposta demorada. Por
isso, antes de devolver o grau, a análise passa por estas etapas:

- **Qualidade em código** (`qualidade.ts`): foto escura, estourada, uniforme,
  com resolução abaixo de 300px ou borrada é recusada antes de chamar o
  modelo. A nitidez é medida pela variância do laplaciano. Os limiares foram
  calibrados nas fotos de `ia-referencias/`: a foto boa menos nítida dá ~52,
  então abaixo de 20 recusa e entre 20 e 40 conta como limítrofe.
- **3 leituras independentes** do checklist, em temperaturas 0.1, 0.4 e 0.7,
  mais 1 **conferência** de sim/não sobre bolha, ferida aberta e área
  seca/rígida, e sobre se a foto permite avaliar. As 4 chamadas rodam em
  paralelo.
- **Consenso**: cada sinal só entra se tiver maioria. Uma leitura sozinha
  "vendo bolha" não leva mais ao 2º grau. Em caso de empate o sinal entra,
  mas a confiança cai.
- **Nova foto em vez de chute**: o pipeline pede outra foto quando a maioria
  das leituras recusa a foto ou a acha borrada, quando a conferência reprova
  uma foto já limítrofe, ou quando as leituras saltam de grau sem maioria
  (ex.: 1º / 3º / 2º).
- **Concordância**: cada leitura também é decidida sozinha. O grau de cada
  uma e as divergências ficam em `resultado.verificacao` e reduzem a
  confiança.

Antes, o modelo recebia 4,5 mil tokens de regras e escrevia o grau como
primeira palavra da resposta. Um modelo de 11B não segue esse raciocínio e
caía quase sempre no 2º grau.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `observacao.ts` | Prompt do checklist + leitura tolerante da resposta (valor fora da lista vira neutro) |
| `decisao.ts` | Regras de grau/fase/achados/confiança + uso do contexto clínico |
| `base-referencias.ts` | Similaridade entre checklists e consenso dos vizinhos |
| `base-referencias.gerada.ts` | Checklists das fotos de referência (GERADO, não editar) |
| `exemplos/casos-referencia.ts` | Gabarito da equipe: rótulo correto de cada foto do .docx |
| `vocabulario.ts` | Listas fechadas (graus, fases, achados) |
| `../modelo.ts` | Chamada ao Workers AI: tenta Llama 4 Scout e cai no Llama 3.2 11B Vision |

## Regras principais (decisao.ts)

- Enxerto em malha, deformidade, carbonizado, leito branco seco de couro ou
  granulação extensa → **3º grau**.
- Leito vermelho-escuro ou mosqueado, leito pálido sem sangramento, fibrina
  ou crosta escura sobre ferida → **2º profundo**.
- Bolha (íntegra ou rota), leito rosa úmido ou pontos de sangue →
  **2º superficial**.
- Vermelhidão com pele íntegra, com ou sem descamação em folhas → **1º grau**.
- Sinais de níveis não vizinhos na mesma foto → **misto**. O halo vermelho em
  volta não conta.
- Cicatriz sem pista do grau original → **indeterminado**.
- Contexto clínico:
  - ferida ainda aberta depois de 21 dias passa de 2º superficial para
    2º profundo;
  - queimadura elétrica ou química recebe um aviso e confiança menor.

## Como melhorar

1. Coloque as fotos rotuladas em `ia-referencias/<categoria>/` (gitignored,
   LGPD) e o rótulo em `CASOS` (`exemplos/casos-referencia.ts`).
2. Gere a base e meça o acerto:
   ```
   CF_ACCOUNT_ID=... CF_AI_TOKEN=... npx tsx scripts/avaliar-ia.ts --gerar-base
   CF_ACCOUNT_ID=... CF_AI_TOKEN=... npx tsx scripts/avaliar-ia.ts
   ```
   A avaliação é leave-one-out: cada foto é comparada com a base sem ela
   mesma. O script mostra caso a caso, a % de acerto e a distribuição dos
   graus.
3. Quando errar, veja no cache (`ia-referencias/.observacoes.json`) se o
   modelo **viu errado** (ajuste a definição do campo em `observacao.ts`) ou
   se ele viu certo e a **regra decidiu errado** (ajuste `decisao.ts`).
4. Ao adicionar um achado novo: inclua o id em `vocabulario.ts` e o rótulo em
   `ROTULOS_ACHADOS` (`components/ValidacaoIA.tsx`).

Depois de editar: `supabase functions deploy analisar-lesao`.

## Privacidade

As fotos nunca saem para busca na internet (Google etc.): são dados de saúde
(LGPD). A base de consulta guarda só o checklist em texto e o rótulo de cada
foto de referência. As fotos ficam em `ia-referencias/`, fora do git.
