-- DermIA — Agenda de consultas + Prescrições (remédios/curativos)
-- Rodar no SQL Editor do Supabase (uma vez). Idempotente (IF NOT EXISTS / OR REPLACE).
--
-- RLS: as duas tabelas herdam a visibilidade de `public.pacientes` — ou seja,
-- quem já enxerga o paciente (profissional da clínica / admin, pelas policies
-- existentes de `pacientes`) enxerga as consultas e prescrições dele; o próprio
-- paciente lê as suas via `pacientes.user_id = auth.uid()`.
-- >>> Confira que `public.pacientes` tem a coluna `user_id` e RLS ativo antes de rodar.
--     (padrão do projeto: ver as policies de `public.exercicios_prescritos`.)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CONSULTAS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  profissional_id uuid not null references public.profissionais (id),
  inicio_em timestamptz not null,
  duracao_min integer not null default 30 check (duracao_min between 5 and 480),
  motivo text,
  observacoes text,
  status text not null default 'agendada'
    check (status in ('agendada', 'realizada', 'faltou', 'cancelada')),
  criado_em timestamptz not null default now()
);

create index if not exists consultas_profissional_inicio_idx
  on public.consultas (profissional_id, inicio_em);
create index if not exists consultas_paciente_inicio_idx
  on public.consultas (paciente_id, inicio_em);

alter table public.consultas enable row level security;

drop policy if exists "consultas_profissional" on public.consultas;
create policy "consultas_profissional"
  on public.consultas for all
  using (
    exists (select 1 from public.pacientes pa where pa.id = consultas.paciente_id)
  )
  with check (
    exists (select 1 from public.pacientes pa where pa.id = consultas.paciente_id)
  );

drop policy if exists "consultas_paciente_le" on public.consultas;
create policy "consultas_paciente_le"
  on public.consultas for select
  using (
    exists (
      select 1 from public.pacientes pa
      where pa.id = consultas.paciente_id and pa.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. PRESCRIÇÕES (remédios, pomadas, curativos)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.prescricoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  profissional_id uuid not null references public.profissionais (id),
  nome text not null,
  dose text,
  frequencia text,
  inicio date,
  fim date,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists prescricoes_paciente_idx
  on public.prescricoes (paciente_id, ativo);

alter table public.prescricoes enable row level security;

drop policy if exists "prescricoes_profissional" on public.prescricoes;
create policy "prescricoes_profissional"
  on public.prescricoes for all
  using (
    exists (select 1 from public.pacientes pa where pa.id = prescricoes.paciente_id)
  )
  with check (
    exists (select 1 from public.pacientes pa where pa.id = prescricoes.paciente_id)
  );

drop policy if exists "prescricoes_paciente_le" on public.prescricoes;
create policy "prescricoes_paciente_le"
  on public.prescricoes for select
  using (
    exists (
      select 1 from public.pacientes pa
      where pa.id = prescricoes.paciente_id and pa.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. VERIFICAÇÃO (deve retornar as 2 tabelas, RLS = true, e 2 policies cada)
-- ─────────────────────────────────────────────────────────────────────────────
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('consultas', 'prescricoes');

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('consultas', 'prescricoes')
order by tablename, policyname;
