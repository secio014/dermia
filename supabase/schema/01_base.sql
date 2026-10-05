-- DermIA — 01 Base: clínicas, profissionais e funções de acesso (RLS)
--
-- Reconstruído em 2026-10-05 depois que o projeto Supabase original sumiu.
-- O schema vivo nunca tinha sido versionado; este é o schema reconstruído a
-- partir do código do app (queries, inserts, edge functions), dos scripts
-- antigos do git e das notas de introspecção. A partir de agora, ESTA pasta é
-- a fonte da verdade: mudou o banco → muda aqui também.
--
-- Rodar no SQL Editor, em ordem: 01 → 02 → 03 → 04 → 05 → 06.
-- Todos são idempotentes (dá pra rodar de novo sem quebrar).

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Instituições (clínica, hospital ou rede)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.clinicas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'clinica' check (tipo in ('clinica', 'hospital', 'grupo')),
  telefone text,
  endereco text,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Profissionais (quem faz login na área clínica).
-- Não há trigger em auth.users: a linha é criada pela edge function
-- criar-fisioterapeuta (upsert) ou pelo seed (06).
-- admin_geral = equipe da plataforma, sem clínica, acesso a tudo.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profissionais (
  id uuid primary key references auth.users (id) on delete cascade,
  clinica_id uuid references public.clinicas (id),
  nome text not null,
  email text,
  papel text not null default 'fisioterapeuta'
    check (papel in ('admin_geral', 'admin', 'fisioterapeuta', 'estagiario')),
  registro text,     -- CRM/COREN/CREFITO, sai nos PDFs
  foto_url text,     -- bucket público fotos-perfil
  biografia text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint ck_clinica_obrigatoria check (papel = 'admin_geral' or clinica_id is not null)
);

create index if not exists profissionais_clinica_idx on public.profissionais (clinica_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Funções de acesso usadas pelas policies. SECURITY DEFINER para não cair em
-- recursão de RLS ao consultar `profissionais` de dentro de uma policy.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.auth_clinica_id()
returns uuid language sql stable security definer set search_path = public as $$
  select clinica_id from public.profissionais where id = auth.uid() and ativo
$$;

create or replace function public.auth_papel()
returns text language sql stable security definer set search_path = public as $$
  select papel from public.profissionais where id = auth.uid() and ativo
$$;

create or replace function public.e_profissional()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profissionais where id = auth.uid() and ativo)
$$;

create or replace function public.e_admin_geral()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_papel() = 'admin_geral', false)
$$;

-- admin da clínica ou admin_geral
create or replace function public.pode_apagar()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.auth_papel() in ('admin', 'admin_geral'), false)
$$;

-- Profissional enxerga a clínica? (a própria, ou todas se admin_geral)
create or replace function public.ve_clinica(p_clinica_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.e_admin_geral() or (p_clinica_id is not null and p_clinica_id = public.auth_clinica_id())
$$;

-- Impede que um profissional comum se promova ou troque de clínica pela
-- policy de "editar o próprio perfil". Só admin/admin_geral mexem nesses campos
-- (e admin de clínica não cria admin_geral nem tira gente da sua clínica).
create or replace function public.proteger_campos_profissional()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new; -- service role (edge functions) / SQL Editor
  end if;
  if public.e_admin_geral() then
    return new;
  end if;
  if new.papel = 'admin_geral' and old.papel is distinct from 'admin_geral' then
    raise exception 'Só a equipe da plataforma pode conceder admin_geral.';
  end if;
  if public.auth_papel() = 'admin' then
    if new.clinica_id is distinct from old.clinica_id then
      raise exception 'Não é possível mover profissional para outra clínica.';
    end if;
    return new;
  end if;
  if new.papel is distinct from old.papel
     or new.ativo is distinct from old.ativo
     or new.clinica_id is distinct from old.clinica_id then
    raise exception 'Sem permissão para alterar papel, status ou clínica.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_campos_profissional on public.profissionais;
create trigger trg_proteger_campos_profissional
  before update on public.profissionais
  for each row execute function public.proteger_campos_profissional();
