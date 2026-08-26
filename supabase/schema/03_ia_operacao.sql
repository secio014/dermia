-- Etapas 3 e 4 — IA, fotos, exercícios e portal do paciente
-- Criado já na Etapa 1 para o schema completo subir de uma vez.

create table if not exists public.analises_ia (
  id uuid primary key default gen_random_uuid(),
  lesao_id uuid not null references public.lesoes (id) on delete cascade,
  registro_evolucao_id uuid references public.registros_evolucao (id) on delete set null,
  foto_path text not null, -- caminho no bucket privado do Storage
  foto_hash text not null, -- sha-256 para auditoria
  grau_sugerido text,
  confianca numeric(5, 2),
  latencia_ms integer,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'editado', 'rejeitado')),
  resultado_bruto jsonb,
  criado_por uuid not null references public.profissionais (id),
  criado_em timestamptz not null default now()
);

alter table public.analises_ia enable row level security;

create policy "analises_via_lesao"
  on public.analises_ia for all
  using (
    exists (
      select 1 from public.lesoes l
      join public.pacientes pa on pa.id = l.paciente_id
      where l.id = analises_ia.lesao_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.lesoes l
      join public.pacientes pa on pa.id = l.paciente_id
      where l.id = analises_ia.lesao_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  );

create table if not exists public.acessos_fotos (
  id uuid primary key default gen_random_uuid(),
  analise_id uuid not null references public.analises_ia (id) on delete cascade,
  acessado_por uuid not null references public.profissionais (id),
  acessado_em timestamptz not null default now()
);

alter table public.acessos_fotos enable row level security;

create policy "acessos_fotos_leitura_admin"
  on public.acessos_fotos for select
  using (
    exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin')
    or acessado_por = auth.uid()
  );

create or replace function public.registrar_acesso(p_analise_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.acessos_fotos (analise_id, acessado_por)
  values (p_analise_id, auth.uid());
end;
$$;

create table if not exists public.exercicios_prescritos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  prescrito_por uuid not null references public.profissionais (id),
  titulo text not null,
  video_url text,
  series integer,
  repeticoes integer,
  frequencia_semanal integer,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.exercicios_prescritos enable row level security;

create policy "exercicios_profissional"
  on public.exercicios_prescritos for all
  using (
    exists (
      select 1 from public.pacientes pa
      where pa.id = exercicios_prescritos.paciente_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  )
  with check (
    exists (
      select 1 from public.pacientes pa
      where pa.id = exercicios_prescritos.paciente_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  );

create policy "exercicios_paciente_le_os_proprios"
  on public.exercicios_prescritos for select
  using (
    exists (
      select 1 from public.pacientes pa
      where pa.id = exercicios_prescritos.paciente_id and pa.user_id = auth.uid()
    )
  );

create table if not exists public.execucoes_exercicio (
  id uuid primary key default gen_random_uuid(),
  exercicio_id uuid not null references public.exercicios_prescritos (id) on delete cascade,
  executado_em date not null default current_date,
  criado_em timestamptz not null default now()
);

alter table public.execucoes_exercicio enable row level security;

create policy "execucoes_paciente"
  on public.execucoes_exercicio for all
  using (
    exists (
      select 1 from public.exercicios_prescritos ex
      join public.pacientes pa on pa.id = ex.paciente_id
      where ex.id = execucoes_exercicio.exercicio_id and pa.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercicios_prescritos ex
      join public.pacientes pa on pa.id = ex.paciente_id
      where ex.id = execucoes_exercicio.exercicio_id and pa.user_id = auth.uid()
    )
  );

create policy "execucoes_leitura_profissional"
  on public.execucoes_exercicio for select
  using (
    exists (
      select 1 from public.exercicios_prescritos ex
      join public.pacientes pa on pa.id = ex.paciente_id
      where ex.id = execucoes_exercicio.exercicio_id
        and (pa.profissional_id = auth.uid()
          or exists (select 1 from public.profissionais p where p.id = auth.uid() and p.cargo = 'admin'))
    )
  );

create or replace view public.vw_adesao_exercicios as
select
  ex.id as exercicio_id,
  ex.paciente_id,
  ex.titulo,
  ex.frequencia_semanal,
  count(exe.id) filter (where exe.executado_em >= current_date - interval '7 days') as execucoes_ultima_semana
from public.exercicios_prescritos ex
left join public.execucoes_exercicio exe on exe.exercicio_id = ex.id
group by ex.id, ex.paciente_id, ex.titulo, ex.frequencia_semanal;
