-- DermIA — 05 RLS (quem vê o quê) + view do painel
--
-- Regra geral:
--   • profissional ativo vê tudo da PRÓPRIA clínica  (ve_clinica / paciente_visivel)
--   • admin_geral vê e edita tudo                    (e_admin_geral)
--   • paciente do portal lê só o que é dele          (meu_paciente_id)
--   • apagar paciente/clínica = admin                (pode_apagar)
-- Edge functions usam service role e passam por cima do RLS de propósito.

-- Liga RLS em todas as tabelas.
do $$
declare t text;
begin
  foreach t in array array[
    'clinicas','profissionais','pacientes','lesoes','registros_evolucao','analises_ia',
    'auditoria_acessos','catalogo_medicamentos','catalogo_exercicios','exercicios_prescritos',
    'execucoes_exercicio','prescricoes','consultas'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Remove policies antigas destas tabelas (deixa o script re-executável).
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'clinicas','profissionais','pacientes','lesoes','registros_evolucao','analises_ia',
      'auditoria_acessos','catalogo_medicamentos','catalogo_exercicios','exercicios_prescritos',
      'execucoes_exercicio','prescricoes','consultas')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── clinicas ────────────────────────────────────────────────────────────────
create policy clinicas_leitura on public.clinicas for select to authenticated
  using (public.ve_clinica(id)
         or id = (select clinica_id from public.pacientes where id = public.meu_paciente_id()));
create policy clinicas_admin_geral on public.clinicas for all to authenticated
  using (public.e_admin_geral()) with check (public.e_admin_geral());
create policy clinicas_admin_edita on public.clinicas for update to authenticated
  using (public.auth_papel() = 'admin' and id = public.auth_clinica_id())
  with check (id = public.auth_clinica_id());

-- ── profissionais ───────────────────────────────────────────────────────────
create policy profissionais_leitura on public.profissionais for select to authenticated
  using (id = auth.uid() or public.ve_clinica(clinica_id)
         -- paciente vê o profissional responsável pelo cadastro dele
         or id = (select criado_por from public.pacientes where id = public.meu_paciente_id()));
create policy profissionais_edita_proprio on public.profissionais for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profissionais_admin on public.profissionais for all to authenticated
  using (public.e_admin_geral() or (public.auth_papel() = 'admin' and clinica_id = public.auth_clinica_id()))
  with check (public.e_admin_geral() or (public.auth_papel() = 'admin' and clinica_id = public.auth_clinica_id()));

-- ── pacientes ───────────────────────────────────────────────────────────────
create policy pacientes_profissional on public.pacientes for select to authenticated
  using (public.ve_clinica(clinica_id));
create policy pacientes_insere on public.pacientes for insert to authenticated
  with check (public.e_profissional() and public.ve_clinica(clinica_id));
create policy pacientes_edita on public.pacientes for update to authenticated
  using (public.ve_clinica(clinica_id)) with check (public.ve_clinica(clinica_id));
create policy pacientes_apaga on public.pacientes for delete to authenticated
  using (public.pode_apagar() and public.ve_clinica(clinica_id));
-- portal: lê o próprio cadastro (edição vai pela edge function atualizar-meus-dados-paciente)
create policy pacientes_portal on public.pacientes for select to authenticated
  using (user_id = auth.uid());

-- ── lesoes / registros_evolucao / analises_ia (só profissionais) ──────────
create policy lesoes_profissional on public.lesoes for all to authenticated
  using (public.paciente_visivel(paciente_id)) with check (public.paciente_visivel(paciente_id));

create policy registros_profissional on public.registros_evolucao for all to authenticated
  using (public.lesao_visivel(lesao_id)) with check (public.lesao_visivel(lesao_id));

create policy analises_leitura on public.analises_ia for select to authenticated
  using (public.lesao_visivel(lesao_id));
create policy analises_insere on public.analises_ia for insert to authenticated
  with check (public.lesao_visivel(lesao_id));
create policy analises_edita on public.analises_ia for update to authenticated
  using (public.lesao_visivel(lesao_id)) with check (public.lesao_visivel(lesao_id));
-- sem DELETE no client: excluir vai pela edge function excluir-analise

-- ── auditoria ───────────────────────────────────────────────────────────────
create policy auditoria_insere on public.auditoria_acessos for insert to authenticated
  with check (usuario_id = auth.uid());
create policy auditoria_leitura on public.auditoria_acessos for select to authenticated
  using (public.e_admin_geral() or (public.auth_papel() = 'admin' and clinica_id = public.auth_clinica_id()));

-- ── catálogos ───────────────────────────────────────────────────────────────
create policy catalogo_medicamentos_leitura on public.catalogo_medicamentos for select to authenticated
  using (clinica_id is null or public.ve_clinica(clinica_id));
create policy catalogo_medicamentos_escrita on public.catalogo_medicamentos for all to authenticated
  using (public.ve_clinica(clinica_id)) with check (public.ve_clinica(clinica_id));

create policy catalogo_exercicios_leitura on public.catalogo_exercicios for select to authenticated
  using (clinica_id is null or public.ve_clinica(clinica_id));
create policy catalogo_exercicios_escrita on public.catalogo_exercicios for all to authenticated
  using (public.ve_clinica(clinica_id)) with check (public.ve_clinica(clinica_id));

-- ── exercícios / execuções ─────────────────────────────────────────────────
create policy exercicios_profissional on public.exercicios_prescritos for all to authenticated
  using (public.paciente_visivel(paciente_id)) with check (public.paciente_visivel(paciente_id));
create policy exercicios_portal on public.exercicios_prescritos for select to authenticated
  using (paciente_id = public.meu_paciente_id());

create policy execucoes_profissional on public.execucoes_exercicio for select to authenticated
  using (exists (select 1 from public.exercicios_prescritos ex
                 where ex.id = exercicio_id and public.paciente_visivel(ex.paciente_id)));
create policy execucoes_portal on public.execucoes_exercicio for all to authenticated
  using (exists (select 1 from public.exercicios_prescritos ex
                 where ex.id = exercicio_id and ex.paciente_id = public.meu_paciente_id()))
  with check (exists (select 1 from public.exercicios_prescritos ex
                      where ex.id = exercicio_id and ex.paciente_id = public.meu_paciente_id()));

-- ── prescrições / consultas ────────────────────────────────────────────────
create policy prescricoes_profissional on public.prescricoes for all to authenticated
  using (public.paciente_visivel(paciente_id)) with check (public.paciente_visivel(paciente_id));
create policy prescricoes_portal on public.prescricoes for select to authenticated
  using (paciente_id = public.meu_paciente_id());

create policy consultas_profissional on public.consultas for all to authenticated
  using (public.paciente_visivel(paciente_id)) with check (public.paciente_visivel(paciente_id));
create policy consultas_portal on public.consultas for select to authenticated
  using (paciente_id = public.meu_paciente_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- Painel: uma linha por lesão ATIVA (paciente sem lesão ativa não aparece aqui;
-- o app lista esses à parte). prioridade: 3º grau = 1, 2º profundo = 2, resto 3.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.vw_painel_pacientes with (security_invoker = true) as
select
  pa.id as paciente_id,
  pa.clinica_id,
  pa.codigo_pseudonimo,
  pa.nome_completo,
  l.id as lesao_id,
  l.regiao_corporal,
  l.scq_percentual,
  l.grau_clinico,
  l.status,
  l.data_ocorrencia,
  (current_date - l.data_ocorrencia) as dias_desde_lesao,
  (select max(r.data_atendimento) from public.registros_evolucao r where r.lesao_id = l.id) as ultimo_atendimento,
  (select count(*) from public.analises_ia a
     where a.lesao_id = l.id and a.validacao_profissional is null
       and a.status in ('pendente', 'processando', 'concluida'))::int as analises_pendentes,
  case l.grau_clinico when '3' then 1 when '2_profundo' then 2 else 3 end as prioridade
from public.pacientes pa
join public.lesoes l on l.paciente_id = pa.id and l.status = 'ativa';
