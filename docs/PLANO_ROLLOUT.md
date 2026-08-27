# DermIA — Plano de roll-out para outras clínicas

Rascunho do modelo para levar o DermIA de "1 clínica piloto" para "várias
clínicas". Cobre a decisão de arquitetura de dados, LGPD, custo e o processo de
onboarding.

---

## 1. Arquitetura de dados: um projeto por clínica vs. multi-tenant compartilhado

O schema **já foi desenhado multi-tenant**: existe `clinicas`, e `profissionais`,
`pacientes` etc. carregam `clinica_id`, com RLS isolando por clínica. Ou seja, os
dois modelos abaixo são viáveis.

### Opção A — Banco compartilhado, isolado por `clinica_id` (multi-tenant)

Todas as clínicas no mesmo projeto Supabase; RLS garante que uma não vê a outra.

| Prós | Contras |
|---|---|
| Uma infra só para manter, um deploy, um backup | Uma falha de RLS vaza dados entre clínicas — risco concentrado |
| Custo marginal por clínica ~zero | Limites do plano (DB, Storage, egress) somados entre todas |
| Indicadores agregados triviais | "Os dados ficam na clínica deles" (LGPD) fica mais difícil de argumentar |
| Onboarding = rodar um SQL | Migração/rollback afeta todo mundo ao mesmo tempo |

### Opção B — Um projeto Supabase por clínica

Cada clínica tem seu próprio projeto (URL + chaves próprias).

| Prós | Contras |
|---|---|
| Isolamento físico — argumento LGPD forte, "seus dados no seu ambiente" | N projetos para manter, deployar Edge Functions, migrar schema, backupear |
| Limites de plano por clínica (cada uma tem seu 500 MB / 1 GB Storage) | Precisa de automação para não virar trabalho manual linear |
| Falha/manutenção isolada por clínica | App precisa saber qual URL/chave usar (config por build ou seletor) |
| Cada clínica pode ter plano grátis ou Pro independente | Sem visão agregada entre clínicas sem ETL |

### Recomendação

- **Piloto e primeiras 2–3 clínicas:** Opção B (um projeto por clínica). O
  isolamento físico simplifica o discurso de LGPD e cada clínica cabe no plano
  grátis. O custo é o trabalho de manutenção, que nesse volume ainda é gerenciável.
- **A partir de ~5 clínicas:** reavaliar. Ou automatizar a Opção B (script que
  provisiona projeto + roda migrações + deploya functions), ou migrar para a
  Opção A com um projeto Pro e uma auditoria de RLS séria.

Definir isso **antes da 2ª clínica** — trocar de modelo depois é migração de dados.

---

## 2. O que falta no produto para suportar multi-clínica

- [ ] **Login real ativado** (ver `docs/PROXIMOS_PASSOS.md` seção 5) — hoje o app
      é single-user hardcoded.
- [ ] **Cadastro de clínica/profissional pela aplicação** — hoje é `INSERT` manual
      no SQL Editor (`GUIA_ADMINISTRADOR.md` seção 2). Aceitável para 2–3 clínicas,
      vira gargalo depois. Uma tela de admin "super" ou um script CLI resolve.
- [ ] **Seleção de ambiente (só se Opção B)** — o app lê `EXPO_PUBLIC_SUPABASE_URL`
      do `.env` em build. Para várias clínicas: um build por clínica, ou uma tela
      inicial que pede o "código da clínica" e resolve URL/chave.
- [ ] **Convite de profissional** — fluxo de "admin da clínica adiciona colega"
      sem passar por você.
- [ ] **Reset de senha** self-service (hoje não há).
- [ ] **Provisionamento automatizado (só se Opção B)** — script que: cria projeto
      via Management API, roda as migrações de `supabase/migrations`, deploya as 2
      Edge Functions, cria o bucket de fotos com as policies, insere a clínica +
      admin.

---

## 3. LGPD / conformidade

- [ ] **Contrato de tratamento de dados** com cada clínica (a clínica é
      controladora, você/DermIA é operador — ou co-controlador, definir com
      jurídico).
- [ ] **Política de privacidade** e **termo de consentimento** do paciente
      revisados por advogado. O app já coleta consentimento (`consentimento_em`,
      `consentimento_versao`) e bloqueia foto sem ele.
- [ ] **Registro de operações de tratamento** (art. 37 LGPD).
- [ ] **Retenção e descarte** — definir por quanto tempo os dados ficam e como são
      apagados quando a clínica sai.
- [ ] **Direitos do titular** — processo para atender pedido de acesso/exclusão de
      um paciente.
- [ ] **Auditoria de acesso a foto** — já existe (`auditoria_acessos` /
      `registrar_acesso` ao abrir foto). Confirmar que cobre todos os pontos de
      visualização.
- [ ] **Anonimização de EXIF/GPS no upload** — já feito em `.lib/foto.ts`.
- [ ] **Região dos dados** — projeto Supabase em região do Brasil (`sa-east-1`) se
      for requisito da clínica.
- [ ] **Backup** — cópias contêm dados sensíveis; criptografar em repouso e
      controlar acesso (ver `PROXIMOS_PASSOS.md` seção 2).

---

## 4. Custo por clínica

Estimativa mensal, Opção B (projeto por clínica):

| Item | Grátis | Pro (US$ 25/mês) |
|---|---|---|
| DB | 500 MB | 8 GB |
| Storage (fotos) | 1 GB | 100 GB |
| Egress | 5 GB/mês | 250 GB/mês |
| Backup automático (PITR) | ❌ (dump manual) | ✅ 7 dias |
| Pausa por inatividade | 7 dias sem uso | não pausa |

- Uma clínica de porte pequeno com uso diário e fotos reais provavelmente
  **estoura o Storage grátis (1 GB) em poucos meses**. Planejar migração para Pro
  quando o piloto virar uso real.
- Ollama (se ligado): custo de uma máquina/VM com GPU, ou CPU-only mais lento.
- Domínio + host da web estática: ~US$ 0–12/ano.

Modelo de cobrança para a clínica: repassar o custo de infra + mensalidade de
software. Definir com base no piloto.

---

## 5. Checklist de onboarding de uma clínica nova

1. [ ] Contrato + termos LGPD assinados
2. [ ] Decidir modelo de dados (A ou B) — se ainda não foi decidido, decidir agora
3. [ ] (Opção B) Criar projeto Supabase na região `sa-east-1`
4. [ ] Rodar migrações do schema no projeto
5. [ ] Deployar Edge Functions `analisar-lesao` e `criar-acesso-paciente`
6. [ ] Criar bucket `fotos-lesoes` (privado) + policies
7. [ ] Inserir a clínica + profissional admin (SQL do `GUIA_ADMINISTRADOR.md` §2)
8. [ ] (Opção B) Gerar o build/config do app apontando para o projeto da clínica
9. [ ] Configurar backup agendado + destino externo
10. [ ] Rodar `scripts/seed-piloto.mjs` num ambiente separado só para treinar a
        equipe, depois `scripts/limpar-seed.mjs`
11. [ ] Treinamento da equipe (usar `GUIA_ADMINISTRADOR.md` §3 como roteiro)
12. [ ] Definir canal e SLA de suporte
13. [ ] Primeira semana acompanhada de perto (usar a tela de feedback com
        cronômetro para medir tempo por etapa)

---

## 6. Suporte e manutenção

- **Canal de suporte:** definir (WhatsApp/e-mail/ferramenta de tickets).
- **SLA:** tempo de resposta para bug bloqueante vs. dúvida de uso.
- **Atualizações de schema:** usar `supabase/migrations` versionadas; nunca editar
  o banco de produção direto pelo dashboard sem registrar a migração
  (o repo já sofre com `supabase/schema/*.sql` desatualizado — não repetir).
- **Monitoramento:** checar semanalmente uso de DB/Storage/egress de cada clínica
  no dashboard; alertar antes de bater limite.
- **Rotina de pausa (plano grátis):** um cron simples que faz um request leve em
  cada projeto a cada poucos dias evita a pausa por inatividade.

---

## 7. Ordem sugerida

1. Fechar o piloto da 1ª clínica com login real + backup + RLS confirmado.
2. Coletar feedback (tela de feedback já existe) e fazer ajustes de UX.
3. **Decidir Opção A vs B** com base no que o piloto mostrou sobre volume e
   exigência de LGPD das clínicas.
4. Automatizar o onboarding do modelo escolhido.
5. Escrever a política de privacidade e o contrato-modelo com apoio jurídico.
6. Onboardar a 2ª clínica seguindo o checklist da seção 5.
