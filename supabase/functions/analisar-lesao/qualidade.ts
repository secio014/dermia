// Controle de qualidade da foto ANTES do modelo de visão (só Deno: usa
// jpeg-js via npm:). O modelo tende a "alucinar" um laudo mesmo numa foto
// preta ou tremida, então frames que claramente não dá para avaliar são
// recusados aqui, com um motivo que vira pedido de nova foto.
//
// Limiares calibrados nas 31 fotos de ia-referencias/: a menor nitidez entre
// fotos boas foi ~52; cópias borradas delas ficaram entre 5 e 56.

import jpeg from 'npm:jpeg-js@0.4.4';

export type Qualidade =
  | { ok: true; nitidez_limitrofe: boolean }
  | { ok: false; motivo: string };

const LADO_MINIMO = 300; // px
const NITIDEZ_MINIMA = 20; // variância do laplaciano (imagem reduzida a ~512px)
const NITIDEZ_LIMITROFE = 40; // abaixo disso, só passa se o modelo achar nítida

export function checarQualidadeFoto(bytes: Uint8Array): Qualidade {
  let img: { data: Uint8Array; width: number; height: number };
  try {
    img = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 }) as typeof img;
  } catch {
    // PNG/WebP ou JPEG que não decodificou aqui — fica só a avaliação do modelo.
    return { ok: true, nitidez_limitrofe: false };
  }
  const { data, width, height } = img;

  if (Math.min(width, height) < LADO_MINIMO) {
    return { ok: false, motivo: 'A foto tem resolução muito baixa. Tire a foto mais perto da lesão.' };
  }

  // Reduz para ~512px no lado maior (fotos de celular variam muito de
  // resolução e a métrica de nitidez depende da escala).
  const escala = Math.max(1, Math.round(Math.max(width, height) / 512));
  const w = Math.floor(width / escala);
  const h = Math.floor(height / escala);
  const cinza = new Float32Array(w * h);
  let soma = 0;
  let soma2 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let dy = 0; dy < escala; dy++) {
        for (let dx = 0; dx < escala; dx++) {
          const i = ((y * escala + dy) * width + x * escala + dx) * 4;
          s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
      }
      const luz = s / (escala * escala);
      cinza[y * w + x] = luz;
      soma += luz;
      soma2 += luz * luz;
    }
  }
  const n = w * h;
  const media = soma / n;
  const desvio = Math.sqrt(Math.max(0, soma2 / n - media * media));
  if (desvio < 2.5) {
    return { ok: false, motivo: 'A imagem está praticamente uniforme, sem lesão visível.' };
  }
  if (media < 10) return { ok: false, motivo: 'A foto está escura demais. Tire com mais luz.' };
  if (media > 245) {
    return { ok: false, motivo: 'A foto está clara/estourada demais. Evite flash direto ou luz forte sobre a lesão.' };
  }

  // Nitidez: variância do laplaciano. Foto tremida/fora de foco = baixa.
  let l1 = 0;
  let l2 = 0;
  let m = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      const lap = 4 * cinza[p] - cinza[p - 1] - cinza[p + 1] - cinza[p - w] - cinza[p + w];
      l1 += lap;
      l2 += lap * lap;
      m++;
    }
  }
  const nitidez = m ? l2 / m - (l1 / m) ** 2 : 0;
  if (nitidez < NITIDEZ_MINIMA) {
    return { ok: false, motivo: 'A foto está borrada/fora de foco. Segure o celular firme e toque na lesão para focar.' };
  }
  return { ok: true, nitidez_limitrofe: nitidez < NITIDEZ_LIMITROFE };
}
