// Chamada ao Cloudflare Workers AI, compartilhada pela Edge Function e por
// scripts/avaliar-ia.ts (só usa fetch/btoa, roda no Deno e no Node 18+).
//
// Tenta os modelos em ordem: o Llama 4 Scout (17B, multimodal nativo) enxerga
// bem melhor que o Llama 3.2 11B Vision. Se a conta/endpoint recusar o Scout
// (formato, licença, indisponível), cai no 3.2, que já funcionava.

export const MODELOS_PADRAO = [
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/meta/llama-3.2-11b-vision-instruct',
];

export type Credenciais = { accountId: string; token: string };

// btoa(String.fromCharCode(...uint8array)) estoura a call stack numa foto de
// ~200-400 KB (spread de centenas de milhares de args). Encoda em blocos.
export function bytesParaBase64(bytes: Uint8Array): string {
  let bin = '';
  const bloco = 0x8000;
  for (let i = 0; i < bytes.length; i += bloco) {
    bin += String.fromCharCode(...bytes.subarray(i, i + bloco));
  }
  return btoa(bin);
}

async function rodar(cred: Credenciais, modelo: string, corpo: unknown): Promise<unknown> {
  const resposta = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cred.accountId}/ai/run/${modelo}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cred.token}` },
      body: JSON.stringify(corpo),
    }
  );
  const texto = await resposta.text();
  if (!resposta.ok) throw new Error(`${modelo} respondeu ${resposta.status}: ${texto.slice(0, 300)}`);
  const json = JSON.parse(texto);
  if (json.success === false) {
    throw new Error(`${modelo}: ${JSON.stringify(json.errors ?? json).slice(0, 300)}`);
  }
  // result.response vem já como objeto quando o modelo emite JSON, senão string.
  const bruto = json.result?.response ?? json.result?.output_text ?? json.result?.choices?.[0]?.message?.content;
  if (bruto === undefined || bruto === null || bruto === '') {
    throw new Error(`${modelo}: resposta vazia (${texto.slice(0, 300)})`);
  }
  return bruto;
}

// Devolve a resposta crua do primeiro modelo que funcionar + qual foi.
export async function chamarModeloVisao(
  cred: Credenciais,
  modelos: string[],
  prompt: string,
  bytes: Uint8Array,
  mime: string,
  temperatura = 0.1
): Promise<{ bruto: unknown; modelo: string }> {
  const base64 = bytesParaBase64(bytes);
  const opcoes = { max_tokens: 700, temperature: temperatura };
  // Formato "messages" (chat com image_url) e, se o modelo recusar, o formato
  // nativo prompt + image (base64 puro) que alguns modelos do Workers AI usam.
  const formatos = [
    {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
      ...opcoes,
    },
    { prompt, image: base64, ...opcoes },
  ];

  const falhas: string[] = [];
  for (const modelo of modelos) {
    for (const corpo of formatos) {
      try {
        return { bruto: await rodar(cred, modelo, corpo), modelo };
      } catch (e) {
        falhas.push(e instanceof Error ? e.message : String(e));
      }
    }
  }
  throw new Error(`Nenhum modelo respondeu. ${falhas.join(' | ')}`.slice(0, 900));
}
