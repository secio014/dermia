# Schema do banco (Supabase)

Reconstruído em 2026-10-05, depois que o projeto Supabase original
(`eilcpcirzgsfyrzcdjno`) sumiu. O schema daquele banco nunca tinha sido
versionado, então esta reconstrução foi montada a partir de três fontes:

- as queries do app e das edge functions;
- os scripts SQL antigos do git (commit `21c1001^`);
- as anotações de introspecção do banco antigo.

**Esta pasta passa a ser a fonte da verdade.** Toda mudança no banco precisa
entrar aqui também.

## Ordem para subir um projeto novo

No SQL Editor do Supabase, rode um arquivo de cada vez, nesta ordem:

| Arquivo | O que cria |
|---|---|
| `01_base.sql` | clínicas, profissionais e as funções de acesso (`auth_clinica_id`, `auth_papel`, `e_admin_geral`...) |
| `02_clinico.sql` | pacientes, lesões e registros de evolução |
| `03_ia_fotos.sql` | análises de IA, trava de consentimento (LGPD), auditoria e os buckets `fotos-lesoes` e `fotos-perfil` |
| `04_tratamento.sql` | exercícios, execuções, adesão, prescrições, agenda, catálogos e o bucket `exercicios-midia` |
| `05_rls_e_painel.sql` | todas as policies de RLS e a `vw_painel_pacientes` |
| `06_seed_inicial.sql` | clínica de teste e `teste@dermia.local`; no fim, o bloco para criar a sua conta `admin_geral` |

Todos os arquivos podem ser rodados de novo sem quebrar nada.

## Depois do SQL

1. Copie a URL e a anon key do projeto novo para o `.env`
   (`EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
2. Ligue o CLI ao projeto novo com `npx supabase link --project-ref <novo-ref>`.
3. Configure os secrets:
   `CF_ACCOUNT_ID`, `CF_AI_TOKEN` (IA) e `RESEND_API_KEY`, `EMAIL_REMETENTE` (e-mail).
4. Faça o deploy das funções:
   ```
   npx supabase functions deploy analisar-lesao
   npx supabase functions deploy criar-fisioterapeuta
   npx supabase functions deploy criar-acesso-paciente
   npx supabase functions deploy atualizar-meus-dados-paciente
   npx supabase functions deploy enviar-documento
   npx supabase functions deploy excluir-analise
   npx supabase functions deploy excluir-paciente
   npx supabase functions deploy excluir-profissional
   ```
5. Se o site em produção (dermia.tech) também usar essas variáveis, atualize
   os valores no Cloudflare e faça um novo deploy.
