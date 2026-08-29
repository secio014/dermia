# Checklist do piloto — o que falta você fazer

Estado do código: tudo abaixo já está implementado e commitado na branch
`chore/preparar-piloto`. O que falta são passos de **infra** (SQL, deploy de
functions, contas externas) que só você pode executar.

---

## 1. Banco de dados (Supabase → SQL Editor)

Rodar **uma vez**, na ordem:

1. `scripts/2026-08-29-agenda-prescricoes.sql` — se ainda não rodou.
   (cria `consultas` e `prescricoes`.)
2. `scripts/2026-08-29-catalogos-e-admin.sql` — **novo, obrigatório**.
   Cria: `catalogo_medicamentos` (já com ~12 itens de queimadura),
   `catalogo_exercicios`, colunas `pacientes.email` e `profissionais.registro`,
   o bucket de Storage `exercicios-midia` + policies, a policy de exclusão de
   paciente pelo admin, e o vínculo `catalogo_id` nas prescrições/exercícios.

> ⚠️ Antes de rodar o (2), confira no editor que os nomes de coluna batem com o
> banco vivo: `profissionais.clinica_id`, `pacientes.clinica_id`,
> `exercicios_prescritos(titulo, video_url, series, repeticoes, frequencia_semanal)`.
> Se algum diferir, me avise que ajusto o script.

Depois de rodar, o bloco de verificação no fim do script deve listar as 2
tabelas de catálogo e as policies.

---

## 2. Edge functions (Supabase CLI)

```bash
supabase functions deploy excluir-paciente
supabase functions deploy criar-fisioterapeuta
supabase functions deploy enviar-documento
```

- `excluir-paciente` e `criar-fisioterapeuta` já funcionam após o deploy
  (usam o service role padrão).
- `enviar-documento` precisa dos secrets do item 3 para realmente mandar e-mail;
  sem eles, os botões "Enviar por e-mail" mostram um aviso amigável e não quebram.

---

## 3. E-mail (Resend) — 1 conta só para o app inteiro

Fisioterapeutas **não** criam conta. É uma conta Resend do app.

1. Criar conta em resend.com.
2. Adicionar e **verificar o domínio** remetente (ex.: `dermia.com.br`) —
   registros DNS SPF/DKIM que o Resend indica.
3. Setar os secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set EMAIL_REMETENTE="DermIA <no-reply@seu-dominio>"
   ```
4. Re-deploy: `supabase functions deploy enviar-documento`.

Teste: cadastre um paciente com o **seu** e-mail, abra a tela dele →
"Remédios e curativos" → "Enviar por e-mail" (ou Atestado / Relatório).

---

## 4. Build do app

- **Android APK (piloto / teste interno):**
  ```bash
  npx eas-cli build --platform android --profile preview
  ```
- **Produção (Play Store, AAB):**
  ```bash
  npx eas-cli build --platform android --profile production
  ```
- **Web:** o Netlify já roda `npx expo export --platform web` no deploy.

> O `expo-image-picker` foi adicionado nesta rodada (upload de vídeo/imagem de
> exercício no app). Por isso o APK/IPA **precisa ser rebuildado** — no Expo Go
> já funciona sem rebuild.

---

## 5. Login real em produção

Já configurado: `.lib/dev.ts` usa `LOGIN_DESATIVADO = __DEV__`.

- `expo start` (dev): entra direto como `teste@dermia.local`.
- Build de produção: aparece a tela de login.

**Antes do 1º build de produção**, garanta ao menos um profissional real com
senha — via `scripts/onboarding-clinica.sql` **ou** cadastrando no painel de
Admin (aba Equipe) depois que o `criar-fisioterapeuta` estiver no ar.

---

## 6. Dados iniciais (opcional, recomendado para a demo)

- Cadastrar 1–2 pacientes de teste com e-mail.
- Cadastrar alguns exercícios no catálogo (com link de vídeo) para o
  fisioterapeuta só escolher na hora de prescrever.
- Conferir o catálogo de medicamentos (já vem populado; adicione o que faltar).

---

## Feito nesta rodada (código, não precisa fazer nada)

- Catálogos de remédios/exercícios com lista inline (busca + lista na tela).
- Upload de vídeo/imagem de exercício (web + nativo via image-picker).
- PDF de prescrição e de atestado; envio por e-mail de prescrição / atestado /
  relatório (fica ativo quando o item 3 estiver pronto).
- Painel de Admin: cadastrar fisioterapeuta + excluir paciente.
- Campo de e-mail no cadastro do paciente (e reaproveitado no acesso ao portal).
- Tema segue o navegador/SO; calendário com seletor de mês/ano; header "Derm.IA"
  em todas as telas; página `/nav` (dev) para transitar entre telas.
