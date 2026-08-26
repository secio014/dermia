-- Etapa 1 — Fundação
-- Profissionais (perfil de quem faz login) + RLS básico
-- Rodar no SQL Editor do Supabase, nesta ordem: 01, 02, 03.

create extension if not exists "pgcrypto";

create table if not exists public.profissionais (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  cargo text not null default 'fisioterapeuta' check (cargo in ('fisioterapeuta', 'admin')),
  clinica text,
  criado_em timestamptz not null default now()
);

alter table public.profissionais enable row level security;

-- cada profissional vê e edita só o próprio registro
create policy "profissionais_select_proprio"
  on public.profissionais for select
  using (auth.uid() = id);

create policy "profissionais_update_proprio"
  on public.profissionais for update
  using (auth.uid() = id);

-- admins enxergam todos os profissionais da clínica
create policy "profissionais_select_admin"
  on public.profissionais for select
  using (
    exists (
      select 1 from public.profissionais p
      where p.id = auth.uid() and p.cargo = 'admin'
    )
  );

-- cria a linha em profissionais automaticamente após o cadastro em auth.users
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profissionais (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();
