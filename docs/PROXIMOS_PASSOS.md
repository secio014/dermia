# DermIA — Próximos passos (ações do Pedro)

Tudo que está pendente e depende de você (contas, infra, decisões).
Ordenado por prioridade. O que era código já foi feito — ver o fim do arquivo.

---

## 1. Enviar as tags (opcional)

As 5 tags anotadas (`v1.0-foundation` … `v5.0-production`) são locais. O `git push`
normal não leva tags junto. Para enviá-las:

```bash
git push origin master
git push origin --tags
```

Servem só de marco histórico. Se o repo é só local, pode pular.

---

## 2. Verificar RLS no dashboard — ✅ FEITO (2026-08-28)

Rodado `scripts/verificar-rls.sql`: as 10 tabelas do `public` têm RLS ativo e
policies (queries 1 e 2 sem linhas). Reexecutar só se criar tabela nova.

Referência — as queries que o arquivo roda:

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

## 3. Decisão: IA real (Ollama) ou validação manual?

Hoje **toda análise de IA cai em `status: erro`** porque a Edge Function
`analisar-lesao` não tem host de Ollama configurado. O app não quebra — a
validação manual (Aceitar/Editar/Rejeitar) funciona normalmente.

### Opção A — assumir "validação manual apenas" no piloto (recomendado para começar)

Nada a fazer no código. Só alinhe com a clínica que a sugestão automática de grau
entra numa fase seguinte.

A tela **Ajustes** do app já mostra "Validação manual" como estado atual, então a
clínica não fica no escuro enquanto a IA não entra.

### Opção B — ligar o servidor de IA (Ollama num host à parte na internet)

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

## 4. Reativar login real (bloqueante para produção / multi-profissional)

Hoje o app entra sozinho como `teste@dermia.local` fixo
(`LOGIN_DESATIVADO = true` em `.lib/dev.ts`). Enquanto isso, **não existe mais de
um profissional** e o isolamento RLS entre profissionais nunca é exercido.

### 4.1. Criar os profissionais reais no Supabase

Abra `scripts/onboarding-clinica.sql`, preencha os valores em `<...>` no topo do
bloco `do $$` (nome da clínica, nomes/emails/senhas do admin e do fisioterapeuta)
e rode no SQL Editor do Supabase. Ele já cria clínica + `auth.users` (com as
colunas de token em `''`, nunca `NULL`) + `profissionais`, com 1 admin + 1
fisioterapeuta comum — o mínimo para testar o isolamento.

### 4.2. Ligar a tela de login

Edite `.lib/dev.ts`:

```ts
export const LOGIN_DESATIVADO = false;
```

Só isso já faz `app/_layout.tsx` voltar a renderizar `<Auth />` quando não há
sessão, e `.lib/useSessao.ts` para de logar sozinho. (Limpeza opcional depois:
apagar `.lib/dev.ts` e remover os `import`/guards em `_layout.tsx` e `useSessao.ts`.)

### 4.3. Testar

- Abrir o app → aparece a tela de login.
- Logar como fisioterapeuta A, criar um paciente.
- Deslogar, logar como fisioterapeuta B → **não** pode ver o paciente de A.
- Logar como admin → vê os dois (painel de admin).

### 4.4. Atualizar os scripts

`scripts/seed-piloto.mjs` e `scripts/limpar-seed.mjs` agora aceitam credenciais
via env — `SEED_EMAIL=... SEED_SENHA=... node scripts/seed-piloto.mjs` — com
fallback para `teste@dermia.local`. Depois de reativar o login real, use as
credenciais de um profissional real ou mantenha o usuário de teste só para eles.

---

## 5. Escolher o alvo de deploy do piloto

Três caminhos. Para um piloto em clínica, **recomendo a web estática** (mais rápido,
grátis, sem loja de apps).

### Opção A — Expo Go (zero deploy)

```bash
npx expo start
```

Clínica instala o app **Expo Go** no celular e escaneia o QR. Limitação: precisa da
sua máquina rodando o servidor na mesma rede / com túnel. Bom só para demo, não
para uso diário.

### Opção B — Web estática (recomendado) — pronta para domínio próprio

Existe `netlify.toml` na raiz com `build command`, `publish = dist`, SPA fallback
e headers de segurança. O jeito recomendado agora é **deploy automático por Git**
(não mais arrastar `dist/` à mão):

1. app.netlify.com → **Add new site → Import an existing project** → conectar este
   repositório. O Netlify lê o `netlify.toml` e roda `npx expo export --platform web`
   a cada push.
2. Cada `git push` na branch escolhida = novo deploy. Nada de `dist/` no Git
   (continua no `.gitignore`).
3. **Domínio próprio:** Site settings → Domain management → **Add a domain**.
   Registrar o domínio (ex.: no registro.br para `.com.br`, ou Namecheap/Cloudflare)
   e apontar o DNS conforme o Netlify pedir:
   - domínio raiz (`dermia.com.br`) → registro `A`/`ALIAS` para o load balancer
     do Netlify, **ou** usar os nameservers do Netlify;
   - `www` → registro `CNAME` para `<seu-site>.netlify.app`.
   HTTPS (Let's Encrypt) o Netlify emite sozinho depois que o DNS propaga.

Para gerar/atualizar o build local (teste ou upload manual em
[app.netlify.com/drop](https://app.netlify.com/drop)):

```bash
npx expo export --platform web    # gera dist/ (20 rotas), inclui _redirects
```

Alternativas com o mesmo `_redirects`/`netlify.toml`: **Cloudflare Pages** (Direct
Upload ou Git) e **Vercel** (Git). A clínica acessa por um link no navegador
(desktop ou tablet); câmera funciona no navegador via HTTPS.

### Opção C — App Android via EAS Build

`app.json` já tem `android.package` / `ios.bundleIdentifier` = `com.dermia.app` e
`eas.json` já tem o profile `preview` (APK, distribuição interna). Falta:

1. `npm i -g eas-cli && eas login` (conta Expo — grátis)
2. `eas init` — cria o `projectId` e preenche `owner`/`extra.eas.projectId` no `app.json`
3. `eas build -p android --profile preview` → no fim, um link/QR de instalação. A
   clínica abre no celular Android e instala (precisa permitir "fontes desconhecidas").
4. Update: `eas build` de novo, manda o link novo. (Ou Firebase App Distribution
   grátis, se quiser controlar por e-mail e notificar updates.)
5. Play Store só se virar produto: conta de dev US$ 25 (única), faixa de Teste Interno.
6. iOS exige conta Apple Developer (US$ 99/ano) + TestFlight — fora do escopo do piloto.
7. Plano grátis do EAS: ~30 builds/mês — sobra pro piloto.

> **APK atual no MediaFire está desatualizado.** Depois do redesign (tema
> vermelho, ícone novo, abas, câmera com botão de virar) é preciso rodar
> `eas build -p android --profile preview` de novo e re-subir o APK novo no
> MediaFire (mantém a versão `1.0.0` — o `versionCode` o EAS incrementa sozinho
> no profile `production`; no `preview` suba manualmente se precisar diferenciar).

---

## 6. Checklist final de LGPD / segurança (antes do piloto)

- [x] RLS confirmado em todas as tabelas (seção 2)
- [ ] Login real ativado, sem usuário de teste com acesso a dados reais (seção 4)
- [ ] `.env` nunca commitado — OK, já está no `.gitignore`
- [x] HTTPS no alvo de deploy — Netlify (web) já com HTTPS automático
- [ ] Consentimento LGPD sendo coletado no cadastro do paciente — já é obrigatório
      no fluxo (trigger no banco bloqueia foto sem `consentimento_em`)
- [ ] Termo/contrato de tratamento de dados assinado com a clínica parceira
- [ ] Combinar com a clínica um uso mínimo semanal — projeto Supabase grátis
      **pausa após 7 dias sem requests**
- [ ] Monitorar uso de Storage (limite 1 GB) e egress (5 GB/mês) no dashboard
      durante o piloto; rodar `scripts/limpar-seed.mjs` antes de começar

---

## Feito (código, já no working tree)

- 5 tags anotadas `v1.0-foundation` … `v5.0-production` mapeadas aos commits certos
- `docs/PLANO_ROLLOUT.md` — modelo para expandir para outras clínicas
- `scripts/verificar-rls.sql` — auditoria de RLS pronta pra colar no SQL Editor (seção 2)
- `scripts/onboarding-clinica.sql` — cria clínica + admin + fisioterapeuta, tokens
  em `''`, só preencher os `<...>` (seção 4.1)
- `scripts/seed-piloto.mjs` / `scripts/limpar-seed.mjs` — aceitam `SEED_EMAIL` /
  `SEED_SENHA` via env, fallback pro usuário de teste (seção 4.4)
- `dist/` — build web estático gerado (`npx expo export --platform web`) com
  `public/_redirects` (SPA fallback), pronto pra arrastar num host (seção 5, Opção B)
- `app.json` — `android.package` + `ios.bundleIdentifier` = `com.dermia.app`
- `eas.json` — profile `preview` (APK, distribuição interna) e `production`
- RLS verificado no dashboard (seção 2)
- este arquivo

### Continua dependendo só de você (não dá pra automatizar aqui)

1. Decidir IA real vs. validação manual (seção 3) — recomendação: manual no piloto
2. Preencher e rodar `scripts/onboarding-clinica.sql`, depois virar
   `LOGIN_DESATIVADO = false` em `.lib/dev.ts` e testar o isolamento (seção 4)
3. `eas login` / `eas init` / `eas build -p android --profile preview` pro APK
   (seção 5, Opção C) — web já publicada no Netlify
4. Termo de tratamento de dados com a clínica + checklist LGPD (seção 6)
