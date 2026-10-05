-- DermIA — 02 Núcleo clínico: pacientes, lesões, evolução e painel
-- Valores dos CHECKs batem com .lib/scq.ts e com o app (ver memória de
-- constraints: mecanismo/grau/status/scq_tabela são enums fechados).

create table if not exists public.pacientes (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas (id),
  criado_por uuid references public.profissionais (id) on delete set null,
  user_id uuid unique references auth.users (id) on delete set null, -- login do portal
  codigo_pseudonimo text not null,
  nome_completo text not null,
  email text,
  telefone text,
  data_nascimento date,
  sexo text check (sexo in ('F', 'M', 'outro', 'nao_informado')),
  consentimento_em timestamptz,      -- LGPD: sem isso não dá pra subir foto
  consentimento_versao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (clinica_id, codigo_pseudonimo)
);

create index if not exists pacientes_clinica_idx on public.pacientes (clinica_id);

create table if not exists public.lesoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  regiao_corporal text,
  mecanismo text check (mecanismo in ('escaldadura', 'chama', 'eletrica', 'quimica', 'contato', 'radiacao', 'outro')),
  data_ocorrencia date not null default current_date,
  scq_percentual numeric(5, 2) check (scq_percentual between 0 and 100),
  scq_tabela text check (scq_tabela in ('wallace_adulto', 'lund_browder_pediatrico')),
  mapa_scq jsonb not null default '[]',  -- [{ regiao, percentual }]
  grau_clinico text check (grau_clinico in ('1', '2_superficial', '2_profundo', '3', 'misto', 'indeterminado')),
  status text not null default 'ativa' check (status in ('ativa', 'cicatrizada', 'alta')),
  observacoes text,
  criado_por uuid references public.profissionais (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists lesoes_paciente_idx on public.lesoes (paciente_id);

create table if not exists public.registros_evolucao (
  id uuid primary key default gen_random_uuid(),
  lesao_id uuid not null references public.lesoes (id) on delete cascade,
  profissional_id uuid references public.profissionais (id) on delete set null,
  data_atendimento date not null default current_date,
  adm jsonb not null default '[]',       -- amplitude de movimento (goniometria)
  descricao text,
  condutas text,
  dor_eva integer check (dor_eva between 0 and 10),
  escala_cicatriz jsonb,                 -- Escala de Vancouver
  analise_ia_id uuid,                    -- FK adicionada no 03 (analises_ia ainda não existe)
  criado_em timestamptz not null default now()
);

create index if not exists registros_lesao_idx on public.registros_evolucao (lesao_id, data_atendimento);

-- atualizado_em automático
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists trg_pacientes_atualizado on public.pacientes;
create trigger trg_pacientes_atualizado before update on public.pacientes
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists trg_lesoes_atualizado on public.lesoes;
create trigger trg_lesoes_atualizado before update on public.lesoes
  for each row execute function public.tocar_atualizado_em();

-- Helpers de visibilidade (SECURITY DEFINER: evitam recursão entre policies).
create or replace function public.paciente_visivel(p_paciente_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pacientes pa
    where pa.id = p_paciente_id and public.ve_clinica(pa.clinica_id)
  )
$$;

create or replace function public.lesao_visivel(p_lesao_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lesoes l
    join public.pacientes pa on pa.id = l.paciente_id
    where l.id = p_lesao_id and public.ve_clinica(pa.clinica_id)
  )
$$;

-- Paciente logado no portal: id do próprio cadastro.
create or replace function public.meu_paciente_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.pacientes where user_id = auth.uid()
$$;
