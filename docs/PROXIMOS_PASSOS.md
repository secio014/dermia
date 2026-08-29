# DermIA — Próximos passos (ações do Pedro)

Tudo que está pendente e depende de você (contas, instalações, infra, decisões).
Ordenado por prioridade. O que era código já foi feito nesta rodada — ver o fim
do arquivo.

---

## 1. Commitar o trabalho pendente

O working tree tem mudanças não commitadas desta sessão:

- `scripts/backup.mjs` (novo)
- `.gitignore` (ignora `backups/`)
- `docs/PROXIMOS_PASSOS.md` e `docs/PLANO_ROLLOUT.md` (novos)
- 5 tags anotadas locais: `v1.0-foundation` … `v5.0-production`

```bash
git add -A
git commit -m "chore: script de backup, plano de rollout e checklist de proximos passos"
```

As tags **não** vão junto no `git push` normal. Para enviá-las:

```bash
git push origin master
git push origin --tags
```

(Enviar as tags é opcional — servem de marco histórico. Se o repo é só local, pode pular.)

---

## 2. Backup do banco funcionando (plano grátis não tem backup automático)

O script `scripts/backup.mjs` já está pronto, mas precisa de duas coisas suas.

### 2.1. Instalar o `pg_dump`

```powershell
winget install -e --id PostgreSQL.PostgreSQL.17
```

Depois adicione ao **PATH do Windows** (Painel de Controle → Editar variáveis de
ambiente do sistema → Path → Novo):

```
C:\Program Files\PostgreSQL\17\bin
```

Feche e reabra o terminal. Confirme:

```powershell
pg_dump --version    # deve imprimir "pg_dump (PostgreSQL) 17.x"
```

> A versão do `pg_dump` precisa ser **>= a do servidor Supabase**. O 17 cobre hoje.

### 2.2. Pôr a senha do banco no `.env`

Pegue em: **Supabase Dashboard → Project Settings → Database → Database password**
(se não lembra, clique em *Reset database password* — isso não afeta a `anon key`
do app).

Adicione a linha no `.env` da raiz:

```
SUPABASE_DB_PASSWORD=a-senha-aqui
```

(o `.env` já está no `.gitignore`)

### 2.3. Rodar

```bash
node scripts/backup.mjs
```

Gera `backups/AAAA-MM-DD_HHMM/` com `roles.sql`, `schema.sql`, `data.sql`.
Mantém os 10 mais recentes (`--manter=20` para mudar).

### 2.4. Agendar (recomendado: 1x/semana durante o piloto)

Task Scheduler do Windows:

1. `Win` → "Agendador de Tarefas" → *Criar Tarefa Básica*
2. Nome: `DermIA backup semanal`
3. Disparo: Semanal, escolha o dia/hora (ex.: domingo 20h)
4. Ação: *Iniciar um programa*
   - Programa: `node`
   - Argumentos: `scripts/backup.mjs`
   - Iniciar em: `C:\Users\pedro\Documents\Repos\dermia`
5. Concluir.

Guarde uma cópia da pasta `backups/` fora da máquina (OneDrive/Google Drive/pen drive).
Ela **contém dados de pacientes** — trate como material sigiloso (LGPD).

### 2.5. Restaurar (se precisar)

```bash
psql "postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" -f backups/<data>/schema.sql
psql "postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres" -f backups/<data>/data.sql
```

---

## 3. Verificar RLS no dashboard

Não dá para verificar isso pelo código. Abra `scripts/verificar-rls.sql` e cole o
conteúdo inteiro no **SQL Editor do Supabase** (não altera nada, só relata). Ele
roda as queries abaixo:

```sql
-- Tabelas SEM RLS ativo (o resultado ideal é nenhuma linha)
select tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false;

-- Tabelas com RLS ativo mas SEM nenhuma policy (ninguém lê/escreve — ou pior, falha aberta)
select t.tablename
from pg_tables t
left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public' and t.rowsecurity = true
group by t.tablename
having count(p.policyname) = 0;
```

Atenção especial às tabelas mais novas: `feedback_piloto`, `execucoes_exercicio`,
`exercicios_prescritos` e a tabela de acesso do portal do paciente. Se alguma
aparecer sem RLS, ative com:

```sql
alter table public.<tabela> enable row level security;
-- e crie as policies apropriadas (ver as policies das tabelas irmãs como modelo)
```

---

## 4. Decisão: IA real (Ollama) ou validação manual?

Hoje **toda análise de IA cai em `status: erro`** porque a Edge Function
`analisar-lesao` não tem host de Ollama configurado. O app não quebra — a
validação manual (Aceitar/Editar/Rejeitar) funciona normalmente.

### Opção A — assumir "validação manual apenas" no piloto (recomendado para começar)

Nada a fazer no código. Só alinhe com a clínica que a sugestão automática de grau
entra numa fase seguinte.

### Opção B — ligar o Ollama de verdade

1. Ter uma máquina rodando Ollama com um modelo de visão:
   ```bash
   ollama pull llama3.2-vision
   ollama serve
   ```
2. Essa máquina precisa ser **acessível pela Edge Function** (internet pública com
   porta liberada, ou um túnel tipo `cloudflared` / `ngrok`). A Edge Function roda
   na infra do Supabase, não enxerga `localhost`.
3. Configurar os secrets e re-deployar:
   ```bash
   npx supabase secrets set OLLAMA_HOST=https://seu-tunel-ou-ip:11434
   npx supabase secrets set OLLAMA_MODELO=llama3.2-vision
   npx supabase functions deploy analisar-lesao
   ```
4. Testar: tirar uma foto no app e ver a análise sair de `erro` para `concluida`.

---

## 5. Reativar login real (bloqueante para produção / multi-profissional)

Hoje o app entra sozinho como `teste@dermia.local` fixo
(`LOGIN_DESATIVADO = true` em `.lib/dev.ts`). Enquanto isso, **não existe mais de
um profissional** e o isolamento RLS entre profissionais nunca é exercido.

### 5.1. Criar os profissionais reais no Supabase

Abra `scripts/onboarding-clinica.sql`, preencha os valores em `<...>` no topo do
bloco `do $$` (nome da clínica, nomes/emails/senhas do admin e do fisioterapeuta)
e rode no SQL Editor do Supabase. Ele já cria clínica + `auth.users` (com as
colunas de token em `''`, nunca `NULL`) + `profissionais`, com 1 admin + 1
fisioterapeuta comum — o mínimo para testar o isolamento.

### 5.2. Ligar a tela de login

Edite `.lib/dev.ts`:

```ts
export const LOGIN_DESATIVADO = false;
```

Só isso já faz `app/_layout.tsx` voltar a renderizar `<Auth />` quando não há
sessão, e `.lib/useSessao.ts` para de logar sozinho. (Limpeza opcional depois:
apagar `.lib/dev.ts` e remover os `import`/guards em `_layout.tsx` e `useSessao.ts`.)

### 5.3. Testar

- Abrir o app → aparece a tela de login.
- Logar como fisioterapeuta A, criar um paciente.
- Deslogar, logar como fisioterapeuta B → **não** pode ver o paciente de A.
- Logar como admin → vê os dois (painel de admin).

### 5.4. Atualizar os scripts

`scripts/seed-piloto.mjs` e `scripts/limpar-seed.mjs` agora aceitam credenciais
via env — `SEED_EMAIL=... SEED_SENHA=... node scripts/seed-piloto.mjs` — com
fallback para `teste@dermia.local`. Depois de reativar o login real, use as
credenciais de um profissional real ou mantenha o usuário de teste só para eles.

---

## 6. Escolher o alvo de deploy do piloto

Três caminhos. Para um piloto em clínica, **recomendo a web estática** (mais rápido,
grátis, sem loja de apps).

### Opção A — Expo Go (zero deploy)

```bash
npx expo start
```

Clínica instala o app **Expo Go** no celular e escaneia o QR. Limitação: precisa da
sua máquina rodando o servidor na mesma rede / com túnel. Bom só para demo, não
para uso diário.

### Opção B — Web estática (recomendado)

```bash
npx expo export --platform web    # gera a pasta dist/
```

A pasta `dist/` **já foi gerada** nesta rodada (25 rotas, bundle ~2.6 MB). Para
regerar depois de mudanças no código, rode o comando de novo. Depois publique
`dist/` num host grátis com HTTPS:

- **Cloudflare Pages** ou **Netlify** ou **Vercel** — todos têm plano grátis, todos
  dão HTTPS automático.
- Fluxo mais simples: criar conta no Netlify → *Add new site* → *Deploy manually* →
  arrastar a pasta `dist/`.
- Para re-deploy, roda o `expo export` de novo e arrasta de novo (ou conecta o
  repo para deploy automático).

A clínica acessa por um link no navegador (desktop ou tablet). Câmera funciona no
navegador via HTTPS.

### Opção C — App nativo via EAS Build

Só se precisar mesmo de app instalado (push notifications nativas, uso offline
pesado, etc.). Passos:

1. `npm i -g eas-cli && eas login` (precisa de conta Expo — grátis)
2. `eas init` — cria o `projectId` e preenche `owner` no `app.json`
3. Adicionar identificadores no `app.json` (dentro de `expo`):
   ```json
   "ios": { "supportsTablet": true, "bundleIdentifier": "com.SEUDOMINIO.dermia" },
   "android": { "package": "com.SEUDOMINIO.dermia", ... }
   ```
   Use um domínio que você controla; **trocar isso depois de publicar na loja é
   doloroso**.
4. `eas build -p android --profile preview` → gera um `.apk` para instalar direto.
5. iOS exige conta Apple Developer (US$ 99/ano) e distribuição via TestFlight.
6. Plano grátis do EAS: ~30 builds/mês — suficiente para um piloto.

---

## 7. Checklist final de LGPD / segurança (antes do piloto)

- [ ] RLS confirmado em todas as tabelas (seção 3)
- [ ] Backup rodando e testado, cópia fora da máquina (seção 2)
- [ ] Login real ativado, sem usuário de teste com acesso a dados reais (seção 5)
- [ ] `.env` nunca commitado — OK, já está no `.gitignore`
- [ ] HTTPS no alvo de deploy — OK em qualquer host da Opção B/C
- [ ] Consentimento LGPD sendo coletado no cadastro do paciente — já é obrigatório
      no fluxo (trigger no banco bloqueia foto sem `consentimento_em`)
- [ ] Termo/contrato de tratamento de dados assinado com a clínica parceira
- [ ] Combinar com a clínica um uso mínimo semanal — projeto Supabase grátis
      **pausa após 7 dias sem requests**
- [ ] Monitorar uso de Storage (limite 1 GB) e egress (5 GB/mês) no dashboard
      durante o piloto; rodar `scripts/limpar-seed.mjs` antes de começar

---

## Feito nesta rodada (código, já no working tree)

- 5 tags anotadas `v1.0-foundation` … `v5.0-production` mapeadas aos commits certos
- `scripts/backup.mjs` — dump `roles`/`schema`/`data` via Supabase CLI, poda os
  antigos, preflight de `pg_dump`, senha via env var (corrigido o `EINVAL` do Windows)
- `.gitignore` — ignora `backups/`
- `docs/PLANO_ROLLOUT.md` — modelo para expandir para outras clínicas
- este arquivo

## Feito na rodada seguinte

- `scripts/verificar-rls.sql` — auditoria de RLS pronta pra colar no SQL Editor (seção 3)
- `scripts/onboarding-clinica.sql` — cria clínica + admin + fisioterapeuta, tokens
  em `''`, só preencher os `<...>` (seção 5.1)
- `scripts/seed-piloto.mjs` / `scripts/limpar-seed.mjs` — aceitam `SEED_EMAIL` /
  `SEED_SENHA` via env, fallback pro usuário de teste (seção 5.4)
- `dist/` — build web estático gerado (`npx expo export --platform web`), pronto
  pra arrastar num host (seção 6, Opção B)

### Continua dependendo só de você (não dá pra automatizar aqui)

1. Instalar PostgreSQL 17 + pôr no PATH, senha do banco no `.env`, rodar/agendar
   `scripts/backup.mjs` (seção 2)
2. Colar `scripts/verificar-rls.sql` no dashboard e corrigir o que aparecer (seção 3)
3. Decidir IA real vs. validação manual (seção 4) — recomendação: manual no piloto
4. Preencher e rodar `scripts/onboarding-clinica.sql`, depois virar
   `LOGIN_DESATIVADO = false` em `.lib/dev.ts` e testar o isolamento (seção 5)
5. Criar conta num host (Netlify/Cloudflare/Vercel) e publicar `dist/` (seção 6)
6. Termo de tratamento de dados com a clínica + checklist LGPD (seção 7)
