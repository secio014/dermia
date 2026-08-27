// Gera dados de teste em massa no Supabase pra testar performance das listas
// (painel de pacientes, carrossel de fotos, etc) antes do piloto real.
//
// Uso:
//   node scripts/seed-piloto.mjs --pacientes=100 --fotos=1000
//
// Usa o profissional de teste (.lib/dev.ts) já configurado no projeto.
// Reaproveita UMA foto minúscula de placeholder pra todas as "análises" —
// o objetivo aqui é testar volume de linhas/consultas, não fotos reais.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [chave, valor] = a.replace(/^--/, '').split('=');
    return [chave, valor];
  })
);
const NUM_PACIENTES = Number(args.pacientes ?? 100);
const NUM_FOTOS = Number(args.fotos ?? 1000);

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => l.split('='))
);

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const { error: erroLogin } = await supabase.auth.signInWithPassword({
  email: 'teste@dermia.local',
  password: 'senha-teste-123',
});
if (erroLogin) {
  console.error('Erro no login:', erroLogin.message);
  process.exit(1);
}

const { data: usuario } = await supabase.auth.getUser();
const { data: perfil, error: erroPerfil } = await supabase
  .from('profissionais')
  .select('id, clinica_id')
  .eq('id', usuario.user.id)
  .single();
if (erroPerfil || !perfil) {
  console.error('Erro ao buscar perfil:', erroPerfil?.message);
  process.exit(1);
}
console.log(`Semeando dados na clínica ${perfil.clinica_id}...`);

const REGIOES = ['Braço direito', 'Braço esquerdo', 'Tronco anterior', 'Tronco posterior', 'Perna direita', 'Perna esquerda', 'Múltiplas regiões'];
const GRAUS = ['1', '2_superficial', '2_profundo', '3', 'misto', 'indeterminado'];
const MECANISMOS = ['escaldadura', 'chama', 'eletrica', 'quimica', 'contato', 'radiacao', 'outro'];
const STATUS_LESAO = ['ativa', 'cicatrizada', 'alta'];
const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elis', 'Fábio', 'Gabriela', 'Hugo', 'Iris', 'João'];
const SOBRENOMES = ['Silva', 'Souza', 'Costa', 'Pereira', 'Lima', 'Alves', 'Rocha', 'Dias'];

function aleatorio(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}
function diasAtras(max) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * max));
  return d.toISOString().slice(0, 10);
}
async function inserirEmLotes(tabela, linhas, tamanhoLote = 500) {
  for (let i = 0; i < linhas.length; i += tamanhoLote) {
    const lote = linhas.slice(i, i + tamanhoLote);
    const { error } = await supabase.from(tabela).insert(lote);
    if (error) {
      console.error(`Erro inserindo em ${tabela} (lote ${i}):`, error.message);
      process.exit(1);
    }
    console.log(`  ${tabela}: ${Math.min(i + tamanhoLote, linhas.length)}/${linhas.length}`);
  }
}

console.log(`Criando ${NUM_PACIENTES} pacientes...`);
const pacientesParaInserir = Array.from({ length: NUM_PACIENTES }, (_, i) => ({
  clinica_id: perfil.clinica_id,
  criado_por: perfil.id,
  codigo_pseudonimo: `SEED-${Date.now().toString(36)}-${i}`,
  nome_completo: `${aleatorio(NOMES)} ${aleatorio(SOBRENOMES)} (teste)`,
  data_nascimento: `19${60 + Math.floor(Math.random() * 40)}-01-01`,
  consentimento_em: new Date().toISOString(),
  consentimento_versao: '1.0',
}));
await inserirEmLotes('pacientes', pacientesParaInserir);

const { data: pacientesCriados } = await supabase
  .from('pacientes')
  .select('id')
  .eq('clinica_id', perfil.clinica_id)
  .ilike('codigo_pseudonimo', 'SEED-%')
  .order('criado_em', { ascending: false })
  .limit(NUM_PACIENTES);

console.log(`Criando 1 lesão por paciente (${pacientesCriados.length})...`);
const lesoesParaInserir = pacientesCriados.map((p) => ({
  paciente_id: p.id,
  regiao_corporal: aleatorio(REGIOES),
  grau_clinico: aleatorio(GRAUS),
  mecanismo: aleatorio(MECANISMOS),
  scq_percentual: Math.round(Math.random() * 40 * 100) / 100,
  scq_tabela: 'wallace_adulto',
  status: Math.random() > 0.3 ? 'ativa' : aleatorio(STATUS_LESAO.slice(1)),
  data_ocorrencia: diasAtras(90),
  criado_por: perfil.id,
}));
await inserirEmLotes('lesoes', lesoesParaInserir);

const { data: lesoesCriadas } = await supabase
  .from('lesoes')
  .select('id')
  .in(
    'paciente_id',
    pacientesCriados.map((p) => p.id)
  );

console.log(`Subindo 1 foto-placeholder e criando ${NUM_FOTOS} análises...`);
// JPEG 1x1 mínimo válido, em base64.
const JPEG_MINIMO_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
const bytesJpeg = Uint8Array.from(atob(JPEG_MINIMO_BASE64), (c) => c.charCodeAt(0));
const caminhoPlaceholder = `${perfil.clinica_id}/_seed/placeholder.jpg`;
await supabase.storage.from('fotos-lesoes').upload(caminhoPlaceholder, bytesJpeg, {
  contentType: 'image/jpeg',
  upsert: true,
});

const analisesParaInserir = Array.from({ length: NUM_FOTOS }, () => ({
  lesao_id: aleatorio(lesoesCriadas).id,
  foto_path: caminhoPlaceholder,
  foto_hash: 'seed-placeholder-hash',
  criado_por: perfil.id,
  status: 'concluida',
  resultado: { grau_sugerido: aleatorio(GRAUS), confianca: Math.round(Math.random() * 100) / 100 },
  confianca: Math.round(Math.random() * 100) / 100,
}));
await inserirEmLotes('analises_ia', analisesParaInserir);

console.log('Pronto! Dados de teste semeados com sucesso.');
console.log('Pra limpar depois:');
console.log(
  `  delete from public.pacientes where clinica_id = '${perfil.clinica_id}' and codigo_pseudonimo ilike 'SEED-%';`
);
