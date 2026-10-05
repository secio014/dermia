-- DermIA — 03 Fotos, análise de IA e auditoria
-- Fluxo: app sobe a foto em fotos-lesoes/<clinica>/<lesao>/<arquivo>.jpg,
-- insere analises_ia (status pendente) e chama a edge function analisar-lesao,
-- que grava resultado/confianca/status. O profissional valida depois.

create table if not exists public.analises_ia (
  id uuid primary key default gen_random_uuid(),
  lesao_id uuid not null references public.lesoes (id) on delete cascade,
  foto_path text not null,
  foto_hash text not null,               -- sha-256, auditoria
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'concluida', 'erro')),
  resultado jsonb,                       -- { grau_sugerido, confianca, fase, achados, observacao }
  confianca numeric(4, 3) check (confianca between 0 and 1),  -- FRAÇÃO, não %
  modelo text,
  latencia_ms integer,
  erro_mensagem text,                    -- 'IMAGEM_INADEQUADA: ...' = foto ruim
  validacao_profissional text check (validacao_profissional in ('aceita', 'editada', 'rejeitada')),
  validado_por uuid references public.profissionais (id) on delete set null,
  validado_em timestamptz,
  criado_por uuid references public.profissionais (id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint ck_validacao_completa check (
    validacao_profissional is null or (validado_por is not null and validado_em is not null)
  )
);

create index if not exists analises_lesao_idx on public.analises_ia (lesao_id, criado_em);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'registros_evolucao_analise_ia_id_fkey') then
    alter table public.registros_evolucao
      add constraint registros_evolucao_analise_ia_id_fkey
      foreign key (analise_ia_id) references public.analises_ia (id) on delete set null;
  end if;
end $$;

-- LGPD: sem consentimento registrado, nada de foto.
create or replace function public.exige_consentimento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.lesoes l
    join public.pacientes pa on pa.id = l.paciente_id
    where l.id = new.lesao_id and pa.consentimento_em is not null
  ) then
    raise exception 'Paciente sem consentimento registrado para captura de imagem.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_exige_consentimento on public.analises_ia;
create trigger trg_exige_consentimento before insert on public.analises_ia
  for each row execute function public.exige_consentimento();

-- Trilha de auditoria (ex.: quem abriu qual foto).
create table if not exists public.auditoria_acessos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid(),
  clinica_id uuid references public.clinicas (id) on delete set null,
  acao text not null,
  entidade text,
  entidade_id uuid,
  criado_em timestamptz not null default now()
);

create index if not exists auditoria_clinica_idx on public.auditoria_acessos (clinica_id, criado_em);

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('fotos-lesoes', 'fotos-lesoes', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('fotos-perfil', 'fotos-perfil', true)
on conflict (id) do nothing;

-- fotos-lesoes: 1ª pasta do caminho = clinica_id. Compara como texto (um cast
-- pra uuid poderia estourar em objetos de outros buckets).
create or replace function public.ve_pasta_clinica(p_nome text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.e_admin_geral()
      or (storage.foldername(p_nome))[1] = public.auth_clinica_id()::text
$$;

drop policy if exists "fotos_lesoes_leitura" on storage.objects;
create policy "fotos_lesoes_leitura" on storage.objects for select to authenticated
  using (bucket_id = 'fotos-lesoes' and public.ve_pasta_clinica(name));

drop policy if exists "fotos_lesoes_insercao" on storage.objects;
create policy "fotos_lesoes_insercao" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-lesoes' and public.ve_pasta_clinica(name));

drop policy if exists "fotos_lesoes_remocao" on storage.objects;
create policy "fotos_lesoes_remocao" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-lesoes' and public.pode_apagar()
         and public.ve_pasta_clinica(name));

-- fotos-perfil: público pra ler; cada um escreve só na própria pasta (<user_id>/foto.jpg).
drop policy if exists "fotos_perfil_escrita" on storage.objects;
create policy "fotos_perfil_escrita" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos_perfil_atualizacao" on storage.objects;
create policy "fotos_perfil_atualizacao" on storage.objects for update to authenticated
  using (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos_perfil_remocao" on storage.objects;
create policy "fotos_perfil_remocao" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = auth.uid()::text);
