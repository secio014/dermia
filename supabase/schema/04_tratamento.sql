-- DermIA — 04 Tratamento: exercícios, prescrições, agenda e catálogos
-- (consultas/prescricoes/catalogos vêm dos scripts de 2026-08-29 do git.)

-- ─────────────────────────────────────────────────────────────────────────────
-- Catálogos (clinica_id null = item global, visível a todas as clínicas)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.catalogo_medicamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinicas (id) on delete cascade,
  nome text not null,
  apresentacao text,
  via text,
  dose_padrao text,
  frequencia_padrao text,
  observacoes text,
  criado_por uuid references public.profissionais (id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists catalogo_medicamentos_clinica_idx on public.catalogo_medicamentos (clinica_id, ativo);

create table if not exists public.catalogo_exercicios (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinicas (id) on delete cascade,
  titulo text not null,
  instrucoes text,
  video_url text,
  video_path text,    -- bucket exercicios-midia
  imagem_path text,   -- bucket exercicios-midia
  criado_por uuid references public.profissionais (id) on delete set null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists catalogo_exercicios_clinica_idx on public.catalogo_exercicios (clinica_id, ativo);

-- ─────────────────────────────────────────────────────────────────────────────
-- Exercícios prescritos e execuções (portal do paciente marca "feito hoje")
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.exercicios_prescritos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  profissional_id uuid references public.profissionais (id) on delete set null,
  catalogo_id uuid references public.catalogo_exercicios (id) on delete set null,
  titulo text not null,
  instrucoes text,
  video_url text,
  series integer check (series > 0),
  repeticoes integer check (repeticoes > 0),
  frequencia_semanal integer check (frequencia_semanal between 1 and 21),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists exercicios_paciente_idx on public.exercicios_prescritos (paciente_id, ativo);

create table if not exists public.execucoes_exercicio (
  id uuid primary key default gen_random_uuid(),
  exercicio_id uuid not null references public.exercicios_prescritos (id) on delete cascade,
  data date not null default current_date,
  criado_em timestamptz not null default now()
);
create index if not exists execucoes_exercicio_idx on public.execucoes_exercicio (exercicio_id, data);

-- Adesão nos últimos 30 dias: execuções / esperado (frequência semanal × 30/7).
-- security_invoker: a view respeita o RLS de quem consulta.
create or replace view public.vw_adesao_exercicios with (security_invoker = true) as
select
  ex.id as exercicio_id,
  ex.paciente_id,
  ex.titulo,
  ex.frequencia_semanal,
  count(exe.id) filter (where exe.data >= current_date - 6)  as execucoes_7d,
  count(exe.id) filter (where exe.data >= current_date - 29) as execucoes_30d,
  case
    when coalesce(ex.frequencia_semanal, 0) = 0 then null
    else least(100, round(
      100.0 * count(exe.id) filter (where exe.data >= current_date - 29)
      / (ex.frequencia_semanal * 30.0 / 7)
    ))
  end as adesao_percentual
from public.exercicios_prescritos ex
left join public.execucoes_exercicio exe on exe.exercicio_id = ex.id
where ex.ativo
group by ex.id, ex.paciente_id, ex.titulo, ex.frequencia_semanal;

-- ─────────────────────────────────────────────────────────────────────────────
-- Prescrições (remédios, pomadas, curativos)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.prescricoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  profissional_id uuid references public.profissionais (id) on delete set null,
  catalogo_id uuid references public.catalogo_medicamentos (id) on delete set null,
  nome text not null,
  dose text,
  frequencia text,
  inicio date,
  fim date,
  observacoes text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index if not exists prescricoes_paciente_idx on public.prescricoes (paciente_id, ativo);

-- ─────────────────────────────────────────────────────────────────────────────
-- Agenda
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  profissional_id uuid references public.profissionais (id) on delete set null,
  inicio_em timestamptz not null,
  duracao_min integer not null default 30 check (duracao_min between 5 and 480),
  motivo text,
  observacoes text,
  status text not null default 'agendada' check (status in ('agendada', 'realizada', 'faltou', 'cancelada')),
  criado_em timestamptz not null default now()
);
create index if not exists consultas_profissional_inicio_idx on public.consultas (profissional_id, inicio_em);
create index if not exists consultas_paciente_inicio_idx on public.consultas (paciente_id, inicio_em);

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: mídia dos exercícios do catálogo (privado, signed URL)
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('exercicios-midia', 'exercicios-midia', false)
on conflict (id) do nothing;

drop policy if exists "exercicios_midia_leitura" on storage.objects;
create policy "exercicios_midia_leitura" on storage.objects for select to authenticated
  using (bucket_id = 'exercicios-midia');

drop policy if exists "exercicios_midia_insercao" on storage.objects;
create policy "exercicios_midia_insercao" on storage.objects for insert to authenticated
  with check (bucket_id = 'exercicios-midia' and public.e_profissional());

drop policy if exists "exercicios_midia_atualizacao" on storage.objects;
create policy "exercicios_midia_atualizacao" on storage.objects for update to authenticated
  using (bucket_id = 'exercicios-midia' and public.e_profissional());

drop policy if exists "exercicios_midia_remocao" on storage.objects;
create policy "exercicios_midia_remocao" on storage.objects for delete to authenticated
  using (bucket_id = 'exercicios-midia' and public.e_profissional());

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: itens globais comuns em queimadura
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.catalogo_medicamentos (clinica_id, nome, apresentacao, via, dose_padrao, frequencia_padrao)
select null::uuid, v.nome, v.apresentacao, v.via, v.dose_padrao, v.frequencia_padrao
from (values
  ('Sulfadiazina de prata 1%',        'creme 1%',   'tópica',   'camada fina cobrindo a lesão', '1 a 2x ao dia'),
  ('Colagenase',                      'pomada',     'tópica',   'camada fina',                  '1x ao dia'),
  ('Hidrogel',                        'gel',        'curativo', 'preencher o leito da ferida',  'a cada 1 a 3 dias'),
  ('Espuma com prata',                'placa',      'curativo', 'recortar do tamanho da lesão', 'a cada 3 a 7 dias'),
  ('Ácido graxo essencial (AGE)',     'óleo',       'tópica',   'cobrir a área',                'a cada troca de curativo'),
  ('Hidrocoloide',                    'placa',      'curativo', 'recortar do tamanho da lesão', 'a cada 3 a 7 dias'),
  ('Gaze não aderente (petrolatum)',  'compressa',  'curativo', 'cobrir a lesão',               'a cada 1 a 2 dias'),
  ('Clorexidina degermante 2%',       'solução',    'tópica',   'limpeza da ferida',            'a cada troca de curativo'),
  ('Dipirona 500 mg',                 'comprimido', 'oral',     '1 comprimido',                 'a cada 6 h se dor'),
  ('Paracetamol 750 mg',              'comprimido', 'oral',     '1 comprimido',                 'a cada 6 h se dor'),
  ('Ibuprofeno 400 mg',               'comprimido', 'oral',     '1 comprimido',                 'a cada 8 h se dor'),
  ('Tramadol 50 mg',                  'comprimido', 'oral',     '1 comprimido',                 'a cada 8 h se dor intensa')
) as v(nome, apresentacao, via, dose_padrao, frequencia_padrao)
where not exists (
  select 1 from public.catalogo_medicamentos c
  where c.clinica_id is null and lower(c.nome) = lower(v.nome)
);
