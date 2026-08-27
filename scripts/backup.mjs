// Backup manual do banco Supabase — necessário no plano gratuito, que NÃO tem
// backup automático nem PITR.
//
// Gera dois arquivos por execução em backups/AAAA-MM-DD_HHMM/:
//   schema.sql  — estrutura (tabelas, views, funções, policies, roles)
//   data.sql    — dados (INSERTs de todas as tabelas)
// e mantém apenas os N backups mais recentes (padrão 10).
//
// Uso:
//   node scripts/backup.mjs
//   node scripts/backup.mjs --manter=20
//
// Pré-requisitos:
//   - Supabase CLI já autenticado e o projeto linkado (npx supabase link).
//   - pg_dump no PATH (ferramentas de linha de comando do PostgreSQL):
//       winget install -e --id PostgreSQL.PostgreSQL.17
//     e adicionar  C:\Program Files\PostgreSQL\17\bin  ao PATH.
//   - Senha do banco em SUPABASE_DB_PASSWORD (variável de ambiente ou linha
//     no .env). Pegue em: Dashboard > Project Settings > Database > Password.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [chave, valor] = a.replace(/^--/, '').split('=');
    return [chave, valor ?? true];
  })
);
const MANTER = Number(args.manter ?? 10);

const env = fs.existsSync('.env')
  ? Object.fromEntries(
      fs
        .readFileSync('.env', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.startsWith('#'))
        .map((l) => {
          const i = l.indexOf('=');
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        })
    )
  : {};

const senha = process.env.SUPABASE_DB_PASSWORD || env.SUPABASE_DB_PASSWORD;
if (!senha) {
  console.error(
    'Falta a senha do banco. Defina SUPABASE_DB_PASSWORD no ambiente ou no .env\n' +
      '(Dashboard > Project Settings > Database > Password).'
  );
  process.exit(1);
}

// O Supabase CLI usa o pg_dump instalado localmente; se não achar, tenta rodar
// via Docker (que aqui não existe). Checa antes pra dar uma mensagem clara.
try {
  execFileSync('pg_dump', ['--version'], { stdio: 'ignore', shell: true });
} catch {
  console.error(
    'pg_dump não encontrado no PATH.\n' +
      'Instale as ferramentas de linha de comando do PostgreSQL (só o cliente basta):\n' +
      '  winget install -e --id PostgreSQL.PostgreSQL.17\n' +
      'e adicione  C:\\Program Files\\PostgreSQL\\17\\bin  ao PATH (reabra o terminal).\n' +
      'A versão do pg_dump deve ser >= a do servidor Supabase.'
  );
  process.exit(1);
}

const agora = new Date();
const carimbo =
  agora.toISOString().slice(0, 10) +
  '_' +
  String(agora.getHours()).padStart(2, '0') +
  String(agora.getMinutes()).padStart(2, '0');
const destino = path.join('backups', carimbo);
fs.mkdirSync(destino, { recursive: true });

// A senha vai por variável de ambiente (o Supabase CLI lê SUPABASE_DB_PASSWORD
// sozinho). Assim ela não aparece nos argumentos — necessário porque no Windows
// precisamos de shell:true pra invocar npx.cmd (Node bloqueia .cmd sem shell).
function dump(nomeArquivo, extraArgs) {
  const arquivo = path.join(destino, nomeArquivo);
  console.log(`Gerando ${arquivo} ...`);
  execFileSync('npx', ['supabase', 'db', 'dump', '--linked', '-f', arquivo, ...extraArgs], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SUPABASE_DB_PASSWORD: senha },
  });
}

try {
  dump('roles.sql', ['--role-only']);
  dump('schema.sql', []);
  dump('data.sql', ['--data-only']);
} catch (e) {
  console.error('Falha no dump:', e.message);
  fs.rmSync(destino, { recursive: true, force: true });
  process.exit(1);
}

const tamanho = (f) => (fs.statSync(path.join(destino, f)).size / 1024).toFixed(0) + ' KB';
console.log(`\nOK: ${destino}`);
for (const f of ['roles.sql', 'schema.sql', 'data.sql']) {
  console.log(`  ${f.padEnd(11)} ${tamanho(f)}`);
}

// Poda: mantém só os MANTER diretórios mais recentes.
const backups = fs
  .readdirSync('backups')
  .filter((d) => fs.statSync(path.join('backups', d)).isDirectory())
  .sort();
const remover = backups.slice(0, Math.max(0, backups.length - MANTER));
for (const d of remover) {
  fs.rmSync(path.join('backups', d), { recursive: true, force: true });
  console.log(`Removido backup antigo: ${d}`);
}
