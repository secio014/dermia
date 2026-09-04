# DermIA

Acompanhamento clínico da evolução de queimaduras e lesões de pele, com apoio de IA — app em [Expo](https://expo.dev) (React Native + web) e [Supabase](https://supabase.com) (Postgres, Auth, Storage, Edge Functions).

Site em produção: **[dermia.tech](https://dermia.tech)**

## Stack

- **App**: Expo Router (React Native 0.86 + React 19), NativeWind (Tailwind para RN), TypeScript.
- **Backend**: Supabase — Postgres com RLS, Auth, Storage (fotos), Edge Functions (Deno).
- **Deploy web**: Cloudflare Workers (Static Assets), SPA fallback via `wrangler.jsonc`.
- **Build nativo**: EAS (`eas.json`).

## Rodando localmente

Pré-requisitos: Node `>=22.13` (o projeto usa `22.16.0`, ver `.tool-versions`).

```bash
npm install
npm run web      # expo start --web
npm start        # expo start (native, QR code do Expo Go)
npm run android
npm run ios
```

Crie um `.env` na raiz (não commitado) com:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_DB_PASSWORD=...
```

### Login em desenvolvimento

Por padrão, em dev (`__DEV__`) a tela de login fica **desativada** e o app autentica sozinho com um profissional de teste fixo (ver `.lib/dev.ts`) — sem isso o RLS (baseado em `auth.uid()`) bloquearia toda leitura/escrita.

Para testar o fluxo de login de verdade em dev, defina no `.env`:

```
EXPO_PUBLIC_FORCAR_LOGIN=1
```

## Estrutura

```
app/                    # rotas (expo-router)
  index.tsx             # landing pública (web)
  login.tsx             # login único (paciente + equipe)
  (tabs)/                # área profissional: painel, agenda, ajustes
  admin.tsx             # painel de admin de uma clínica
  global.tsx            # painel admin_geral (cross-clínica)
  portal/                # portal do paciente
  paciente/[id]/...      # prontuário, lesões, prescrições, atestados

components/             # componentes de UI, por área (nav, portal, site, ui)
.lib/                   # lógica compartilhada (acesso/RBAC, agenda, pdf, tema, supabase client...)
supabase/functions/     # Edge Functions (Deno) — ações que exigem service role
supabase/scripts/       # SQL para rodar manualmente no SQL Editor do Supabase
```

## Papéis e permissões (RBAC)

Definido em `.lib/acesso.ts`:

- **`admin_geral`** — visão de plataforma (nossa empresa): todas as clínicas, todos os usuários, "Ver como" para simular qualquer outro papel.
- **`admin`** — administra uma clínica: equipe, exclusões, painel.
- **`fisioterapeuta`** / **`estagiario`** — dia a dia clínico (mesmo escopo de permissões).
- **paciente** — sem papel em `profissionais`; acesso via linha própria em `pacientes`, só ao Portal.

O RLS no banco é a barreira real; `PERMISSOES`/`Protegido` no client são a camada de UX (esconder o que a pessoa não pode usar).

## Banco de dados (Supabase)

**O banco de produção é a fonte de verdade.** Não há migrations versionadas no repo — o schema evoluiu direto no Supabase. `supabase/scripts/*.sql` guarda os SQLs de mudanças estruturais feitas manualmente (RLS, colunas novas, buckets de Storage); rode-os no SQL Editor do projeto na ordem em que foram adicionados.

## Edge Functions

Em `supabase/functions/`, cada uma com seu próprio comentário de cabeçalho explicando o que faz e quem pode chamar. Deploy individual:

```bash
npx supabase functions deploy <nome-da-function>
```

## Deploy

- **Web**: Cloudflare Workers Builds a partir deste repo. Build: `npx expo export --platform web`; deploy: `npx wrangler deploy`. Domínio: `dermia.tech`.
- **Nativo**: EAS Build/Submit (`eas.json`), canais de update via `expo-updates`.
