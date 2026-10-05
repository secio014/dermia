// Avalia a análise de lesão (analisar-lesao) contra o gabarito da equipe e
// gera a base de consulta de casos parecidos.
//
//   CF_ACCOUNT_ID=... CF_AI_TOKEN=... npx tsx scripts/avaliar-ia.ts
//   ... npx tsx scripts/avaliar-ia.ts --gerar-base   (regrava base-referencias.gerada.ts)
//   ... npx tsx scripts/avaliar-ia.ts --sem-cache     (chama o modelo de novo)
//
// Usa as fotos de ia-referencias/ (gitignored, LGPD) e o gabarito de
// exemplos/casos-referencia.ts. As respostas do modelo ficam em cache em
// ia-referencias/.observacoes.json para não pagar de novo a cada rodada.
// A avaliação é leave-one-out: cada foto é comparada com a base SEM ela mesma.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { CASOS } from '../supabase/functions/analisar-lesao/conhecimento/exemplos/casos-referencia.ts';
import {
  type Observacao,
  decidir,
  extrairJson,
  lerObservacao,
  montarPromptObservacao,
} from '../supabase/functions/analisar-lesao/conhecimento/index.ts';
import type { Grau } from '../supabase/functions/analisar-lesao/conhecimento/vocabulario.ts';
import { MODELOS_PADRAO, chamarModeloVisao } from '../supabase/functions/analisar-lesao/modelo.ts';

const PASTA = 'ia-referencias';
const CACHE = join(PASTA, '.observacoes.json');
const SAIDA_BASE = 'supabase/functions/analisar-lesao/conhecimento/base-referencias.gerada.ts';

const accountId = process.env.CF_ACCOUNT_ID;
const token = process.env.CF_AI_TOKEN;
if (!accountId || !token) {
  console.error('Defina CF_ACCOUNT_ID e CF_AI_TOKEN (os mesmos secrets da Edge Function).');
  process.exit(1);
}
const modelos = process.env.CF_AI_MODELO?.split(',').map((m) => m.trim()).filter(Boolean) ?? MODELOS_PADRAO;
const gerarBase = process.argv.includes('--gerar-base');
const semCache = process.argv.includes('--sem-cache');

function acharFoto(nome: string): string | null {
  for (const pasta of readdirSync(PASTA, { withFileTypes: true })) {
    if (!pasta.isDirectory()) continue;
    const caminho = join(PASTA, pasta.name, nome);
    if (existsSync(caminho)) return caminho;
  }
  return null;
}

type Cache = Record<string, { modelo: string; obs: Observacao | null; motivo?: string }>;
const cache: Cache = !semCache && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};

const linhas: { imagem: string; esperado: Grau; obtido: string; confianca: number; ok: boolean }[] = [];
const base: { imagem: string; rotulo: string; grau: Grau; obs: Observacao }[] = [];

for (const caso of CASOS) {
  const foto = acharFoto(caso.imagem);
  if (!foto) {
    console.warn(`(sem foto local) ${caso.imagem}`);
    continue;
  }
  const esperado: Grau = caso.grau ?? 'indeterminado';
  let item = cache[caso.imagem];
  if (!item) {
    try {
      const { bruto, modelo } = await chamarModeloVisao(
        { accountId, token },
        modelos,
        montarPromptObservacao({}),
        new Uint8Array(readFileSync(foto)),
        'image/jpeg'
      );
      const leitura = lerObservacao(typeof bruto === 'string' ? extrairJson(bruto) : bruto);
      item = leitura.adequada
        ? { modelo, obs: leitura.obs }
        : { modelo, obs: null, motivo: leitura.motivo };
    } catch (e) {
      console.error(`${caso.imagem}: ${e instanceof Error ? e.message : e}`);
      continue;
    }
    cache[caso.imagem] = item;
    writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  }

  if (!item.obs) {
    linhas.push({ imagem: caso.imagem, esperado, obtido: 'INADEQUADA', confianca: 0, ok: false });
    continue;
  }
  base.push({ imagem: caso.imagem, rotulo: caso.rotulo, grau: esperado, obs: item.obs });
  const r = decidir(item.obs, {}, { ignorarReferencia: caso.imagem });
  linhas.push({
    imagem: caso.imagem,
    esperado,
    obtido: r.grau_sugerido,
    confianca: r.confianca,
    ok: r.grau_sugerido === esperado,
  });
}

if (gerarBase) {
  writeFileSync(
    SAIDA_BASE,
    `// GERADO por \`npx tsx scripts/avaliar-ia.ts --gerar-base\` — não editar à mão.
// Checklist visual que o modelo produziu para cada foto de ia-referencias/,
// com o rótulo da equipe. Vazio = base ainda não gerada (a consulta é pulada).
// Modelo: ${[...new Set(Object.values(cache).map((c) => c.modelo))].join(', ')}

import type { Referencia } from './base-referencias.ts';

export const BASE_GERADA: Referencia[] = ${JSON.stringify(base, null, 2)};
`
  );
  console.log(`Base gravada em ${SAIDA_BASE} (${base.length} casos). Rode de novo sem --gerar-base para medir com ela.`);
}

console.table(linhas);
const acertos = linhas.filter((l) => l.ok).length;
console.log(`\nAcerto de grau: ${acertos}/${linhas.length} (${Math.round((100 * acertos) / Math.max(1, linhas.length))}%)`);
const dist = linhas.reduce<Record<string, number>>((m, l) => ((m[l.obtido] = (m[l.obtido] ?? 0) + 1), m), {});
console.log('Distribuição dos graus sugeridos:', dist);
