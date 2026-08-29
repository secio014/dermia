// Remove os dados de teste inseridos por seed-piloto.mjs (pacientes SEED-* e
// tudo em cascata: lesões, análises_ia, etc).
//
// Uso: node scripts/limpar-seed.mjs
// Login: por padrão usa teste@dermia.local; após reativar o login real, passe
//   SEED_EMAIL=... SEED_SENHA=... node scripts/limpar-seed.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => l.split('='))
);
const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const { error: erroLogin } = await supabase.auth.signInWithPassword({
  email: process.env.SEED_EMAIL ?? 'teste@dermia.local',
  password: process.env.SEED_SENHA ?? 'senha-teste-123',
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

const { data: pacientesSeed } = await supabase
  .from('pacientes')
  .select('id')
  .eq('clinica_id', perfil.clinica_id)
  .ilike('codigo_pseudonimo', 'SEED-%');
console.log(`Encontrados ${pacientesSeed?.length ?? 0} pacientes SEED-* na clínica ${perfil.clinica_id}.`);

if (!pacientesSeed || pacientesSeed.length === 0) {
  console.log('Nada pra limpar.');
  process.exit(0);
}

const { error: erroDelete, count } = await supabase
  .from('pacientes')
  .delete({ count: 'exact' })
  .eq('clinica_id', perfil.clinica_id)
  .ilike('codigo_pseudonimo', 'SEED-%');
if (erroDelete) {
  console.error('Erro ao deletar:', erroDelete.message);
  process.exit(1);
}
console.log(`Deletados ${count} pacientes (lesões/análises em cascata, se FK configurada).`);
