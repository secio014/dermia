// Gera todos os PNGs de ícone do DermIA a partir de um SVG mestre.
// Uso: node scripts/gerar-icones.mjs
// Depende de `sharp` (devDependency).

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const saida = (p) => resolve(raiz, 'assets/images', p);

const ROSA = '#FFF5F4';

// Chama + linha de pulso. `cor` controla o preenchimento (gradiente ou sólido);
// `stroke` a linha de pulso.
function marca({ cor, stroke }) {
  return `
    <path d="M256 48 C 256 48, 96 208, 96 320 a 160 160 0 1 0 320 0 C 416 208, 256 48, 256 48 Z" fill="${cor}"/>
    <path d="M150 322 h60 l26 -70 l40 150 l30 -96 l20 46 h56" fill="none" stroke="${stroke}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

const GRADIENTE = `
  <defs>
    <linearGradient id="chama" x1="128" y1="72" x2="392" y2="452" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#F0546B"/>
      <stop offset="1" stop-color="#B0121F"/>
    </linearGradient>
  </defs>`;

// Monta um SVG 1024x1024 com a marca escalada por `escala` (1 = 512px de arte
// centrada), fundo opcional e conteúdo.
function svg1024({ fundo, escala = 1, defs = '', conteudo }) {
  const arte = 512 * escala;
  const offset = (1024 - arte) / 2;
  return Buffer.from(`
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      ${fundo ? `<rect width="1024" height="1024" fill="${fundo}"/>` : ''}
      ${defs}
      <g transform="translate(${offset} ${offset}) scale(${escala})">${conteudo}</g>
    </svg>`);
}

const alvos = [
  {
    arquivo: 'icon.png',
    tamanho: 1024,
    svg: svg1024({ fundo: ROSA, escala: 1.15, defs: GRADIENTE, conteudo: marca({ cor: 'url(#chama)', stroke: '#FFFFFF' }) }),
  },
  {
    arquivo: 'android-icon-foreground.png',
    tamanho: 1024,
    svg: svg1024({ escala: 0.92, defs: GRADIENTE, conteudo: marca({ cor: 'url(#chama)', stroke: '#FFFFFF' }) }),
  },
  {
    arquivo: 'android-icon-background.png',
    tamanho: 1024,
    svg: svg1024({ fundo: ROSA, conteudo: '' }),
  },
  {
    arquivo: 'android-icon-monochrome.png',
    tamanho: 1024,
    svg: svg1024({ escala: 0.92, conteudo: marca({ cor: '#FFFFFF', stroke: 'rgba(0,0,0,0.35)' }) }),
  },
  {
    arquivo: 'splash-icon.png',
    tamanho: 1024,
    svg: svg1024({ escala: 0.66, defs: GRADIENTE, conteudo: marca({ cor: 'url(#chama)', stroke: '#FFFFFF' }) }),
  },
  {
    arquivo: 'favicon.png',
    tamanho: 196,
    svg: svg1024({ fundo: ROSA, escala: 1.0, defs: GRADIENTE, conteudo: marca({ cor: 'url(#chama)', stroke: '#FFFFFF' }) }),
  },
];

mkdirSync(resolve(raiz, 'assets/images'), { recursive: true });

for (const alvo of alvos) {
  await sharp(alvo.svg, { density: 384 })
    .resize(alvo.tamanho, alvo.tamanho)
    .png()
    .toFile(saida(alvo.arquivo));
  console.log('ok', alvo.arquivo, `${alvo.tamanho}x${alvo.tamanho}`);
}
