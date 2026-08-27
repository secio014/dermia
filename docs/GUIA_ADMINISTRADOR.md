# DermIA — Guia do Administrador

Guia prático de operação do sistema: como onboardar uma clínica nova, o
fluxo de uso do dia a dia, e como resolver os problemas mais comuns.

## 1. Rodando o projeto

```bash
npm install
npx expo start --web        # versão web, no navegador
npx expo start              # abre o QR code pro Expo Go (celular)
```

O `.env` na raiz do projeto precisa de:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
(nunca commitar esse arquivo — já está no `.gitignore`).

## 2. Onboarding de uma clínica nova

Hoje não existe tela de cadastro de clínica/profissional no app (o login
está temporariamente desativado — ver seção 6). Pra dar acesso a uma
clínica nova, rode no SQL Editor do Supabase:

```sql
-- 1. Cria a clínica
insert into public.clinicas (nome, ativa) values ('Nome da Clínica', true)
returning id;

-- 2. Cria o usuário de autenticação do primeiro profissional (admin)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'email@clinica.com', crypt('senha-temporaria', gen_salt('bf')),
  '', '', '', '', '', '', '', '',
  now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
)
returning id;

-- 3. Vincula o profissional à clínica (use os dois ids retornados acima)
insert into public.profissionais (id, clinica_id, nome, email, papel, ativo)
values ('<id-do-auth-users>', '<id-da-clinica>', 'Nome do Profissional', 'email@clinica.com', 'admin', true);
```

Importante: ao inserir direto em `auth.users`, as colunas de token
(`confirmation_token`, `recovery_token`, `email_change*`, `phone_change*`,
`reauthentication_token`) **precisam ser `''`, nunca `NULL`** — deixá-las
nulas quebra o login com um erro genérico `Database error querying schema`.

## 3. Fluxo de uso do dia a dia

1. **Cadastrar paciente** (aba Início → "+ Novo paciente") — exige marcar o
   checkbox de consentimento (LGPD); sem isso, tirar foto da lesão depois
   vai ser bloqueado pelo banco.
2. **Registrar lesão** (dentro do paciente → "+ Nova lesão") — marca as
   regiões no mapa corporal (SCQ calculado automaticamente), escolhe grau
   clínico e mecanismo.
3. **Registrar evolução** (dentro da lesão → "+ Novo registro") — ADM
   (goniometria), dor (EVA), escala de Vancouver da cicatriz.
4. **Foto + IA** (dentro da lesão → "+ Nova foto") — tira a foto, sobe
   anonimizada, dispara a análise de IA (se configurada — ver seção 5).
   Toda sugestão de IA exige validação manual (Aceitar/Editar/Rejeitar).
5. **Comparador temporal** — compara duas fotos da mesma lesão lado a lado
   com um slider.
6. **Exercícios** (dentro do paciente → "+ Prescrever exercício") — o
   paciente acompanha e marca "feito hoje" pelo Portal do Paciente
   (`/portal/login`), criado em "Portal do paciente" na tela do paciente.
7. **Relatório em PDF** (dentro do paciente → "Gerar relatório em PDF") —
   evolução ou alta, com período e fotos opcionais.
8. **Painel de Admin** (aba Início → "Painel de Admin", só pra `papel =
   admin`) — indicadores da clínica e resumo do feedback do piloto.
9. **Feedback do piloto** (aba Início → "Dar feedback do piloto") — tela
   com cronômetro embutido pra registrar quanto tempo cada etapa levou.

## 4. Dados de teste em massa

Pra testar performance com volume antes de um piloto real:
```bash
node scripts/seed-piloto.mjs --pacientes=100 --fotos=1000
```
Gera pacientes fictícios (prefixo `SEED-`) com lesões e "fotos" (todas
apontando pro mesmo arquivo placeholder — o objetivo é testar volume de
linhas e listas, não fotos reais). Pra limpar depois, o próprio script
imprime o `delete` correspondente ao final.

## 5. Deploy das Edge Functions

```bash
npx supabase login              # uma vez, abre o navegador
npx supabase link --project-ref <ref-do-projeto>
npx supabase functions deploy analisar-lesao
npx supabase functions deploy criar-acesso-paciente
```

`criar-acesso-paciente` funciona sozinha (usa só variáveis já injetadas
pelo Supabase). `analisar-lesao` também roda, mas só chama o Ollama de
verdade se você configurar:
```bash
npx supabase secrets set OLLAMA_HOST=http://seu-host:11434
npx supabase secrets set OLLAMA_MODELO=llama3.2-vision
```
Sem isso, toda análise fica marcada como `erro` (o app não quebra — a
validação manual continua funcionando normalmente).

## 6. Login temporariamente desativado

Enquanto o novo fluxo de login não é feito, o app abre direto autenticado
como um "profissional de teste" (`.lib/dev.ts`). Pra reativar o login de
verdade:
1. Delete (ou esvazie) `.lib/dev.ts`.
2. Em `app/_layout.tsx`, troque o `import { LOGIN_DESATIVADO } from
   '@/.lib/dev'` — remova a flag e volte a checar `!sessao` normalmente.
3. Em `.lib/useSessao.ts`, remova a lógica de login automático.

## 7. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Database error querying schema` no login | Colunas de token em `auth.users` estão `NULL` em vez de `''` | Ver seção 2 — sempre usar `''` |
| `Could not find the 'X' column` no Supabase | Nome de coluna não bate com o schema real | O schema real do banco é a fonte da verdade, não os arquivos em `supabase/schema/` (estão desatualizados) |
| `new row violates check constraint` | Valor enviado não está na lista aceita pela constraint | Rodar `select conname, pg_get_constraintdef(oid) from pg_constraint where contype='c' and connamespace='public'::regnamespace;` pra ver os valores aceitos |
| "Paciente sem consentimento registrado" ao tirar foto | `pacientes.consentimento_em` está `NULL` | `update pacientes set consentimento_em = now(), consentimento_versao = '1.0' where id = '...';` |
| CORS / `net::ERR_FAILED` chamando uma Edge Function | Function ainda não tem deploy | Ver seção 5 |
| `ReferenceError: window is not defined` no `expo start --web` | Algum código tocando `window`/`localStorage` incondicionalmente no carregamento do módulo (SSR) | Guardar com `Platform.OS === 'web'` ou checar `typeof window !== 'undefined'` |
| PDF não gera nada no navegador | `expo-print` no web só chama `window.print()`, não gera arquivo | Já tratado em `.lib/pdf.ts` — no web abre uma janela de impressão do navegador em vez de compartilhar arquivo |
| Erro genérico "Erro ao enviar..." escondendo o motivo real | Objetos de erro do Supabase não são `instanceof Error` | Sempre checar `'message' in erro` além de `instanceof Error` |

## 8. Status do roadmap

Etapas 1 a 4 do roadmap (`.claude/.plan/ROADMAP.md`) estão implementadas e
testadas. Etapa 5 (piloto real) é majoritariamente operacional — este guia,
o script de seed e a tela de feedback são o suporte que existe pra ela.
