-- Etapa 2 — Núcleo Clínico
-- Pacientes, lesões e registros de evolução (mapa corporal + goniometria)

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references public.profissionais (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null, -- login do próprio paciente (etapa 4)
  codigo text not null,
  nome text not null,
  data_nascimento date,
  criado_em timestamptz not null default now(),
  unique (profissional_id, codigo)
);

alter table public.pacientes enable row level security;

create policy "pacientes_dono"
  on public.pacientes for all
  using (
    profissional_id = auth.uid()
    or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin')
  )
  with check (
    profissional_id = auth.uid()
    or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin')
  );

create table if not exists public.lesoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  regioes_marcadas jsonb not null default '[]', -- regiões de Wallace tocadas no mapa
  pediatrico boolean not null default false,
  scq_percentual numeric(5, 2) not null default 0,
  data_lesao date not null default current_date,
  observacoes text,
  criado_em timestamptz not null default now()
);

alter table public.lesoes enable row level security;

create policy "lesoes_via_paciente"
  on public.lesoes for all
  using (
    exists (
      select 1 from public.pacientes pa
      where pa.id = lesoes.paciente_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.pacientes pa
      where pa.id = lesoes.paciente_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  );

create table if not exists public.registros_evolucao (
  id uuid primary key default gen_random_uuid(),
  lesao_id uuid not null references public.lesoes (id) on delete cascade,
  goniometria jsonb not null default '[]', -- [{ articulacao, movimento, grau_ativo, grau_passivo, referencia }]
  observacoes text,
  criado_por uuid not null references public.profissionais (id),
  criado_em timestamptz not null default now()
);

alter table public.registros_evolucao enable row level security;

create policy "registros_via_lesao"
  on public.registros_evolucao for all
  using (
    exists (
      select 1 from public.lesoes l
      join public.pacientes pa on pa.id = l.paciente_id
      where l.id = registros_evolucao.lesao_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.lesoes l
      join public.pacientes pa on pa.id = l.paciente_id
      where l.id = registros_evolucao.lesao_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  );

-- painel inicial: um card por paciente com a lesão mais recente
create or replace view public.vw_painel_pacientes as
select
  pa.id as paciente_id,
  pa.profissional_id,
  pa.codigo,
  pa.nome,
  l.id as lesao_id,
  l.regioes_marcadas,
  l.scq_percentual,
  l.data_lesao,
  (current_date - l.data_lesao) as dias_desde_lesao
from public.pacientes pa
left join lateral (
  select * from public.lesoes le
  where le.paciente_id = pa.id
  order by le.data_lesao desc, le.criado_em desc
  limit 1
) l on true;
