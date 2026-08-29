-- DermIA — Catálogos (remédios/curativos e exercícios) + e-mail do paciente
--            + storage de mídia de exercício + exclusão de paciente pelo admin
--
-- Rodar UMA vez no SQL Editor do Supabase. Idempotente
-- (IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING).
--
-- Convenções do schema VIVO (o repo tem .sql antigos que divergem):
--   profissionais(id, clinica_id, nome, email, papel, ativo)   papel in ('admin','fisioterapeuta',...)
--   pacientes(id, clinica_id, criado_por, nome_completo, codigo_pseudonimo, user_id, ...)
--   exercicios_prescritos(id, paciente_id, profissional_id, titulo, instrucoes, video_url,
--                         series, repeticoes, frequencia_semanal, ativo, ...)
--   prescricoes(id, paciente_id, profissional_id, nome, dose, frequencia, inicio, fim, observacoes, ativo, ...)
-- >>> Confira esses nomes antes de rodar. Ajuste se o banco vivo usar outros.

-- Helper implícito: clínica do profissional logado.
--   (select clinica_id from public.profissionais where id = auth.uid())

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. profissionais.registro  (CRM/COREN/CREFITO — opcional, sai nos PDFs)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profissionais add column if not exists registro text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. pacientes.email  (portal + envio de documentos por e-mail)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.pacientes add column if not exists email text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CATÁLOGO DE MEDICAMENTOS / CURATIVOS
--    clinica_id null = item global do app (visível a todas as clínicas).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.catalogo_medicamentos (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinicas (id) on delete cascade,
  nome text not null,
  apresentacao text,               -- ex.: "creme 1%", "pomada 30 g", "comprimido 500 mg"
  via text,                        -- ex.: "tópica", "oral", "curativo"
  dose_padrao text,                -- ex.: "camada fina"
  frequencia_padrao text,          -- ex.: "2x ao dia"
  observacoes text,
  criado_por uuid references public.profissionais (id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists catalogo_medicamentos_clinica_idx
  on public.catalogo_medicamentos (clinica_id, ativo);

alter table public.catalogo_medicamentos enable row level security;

drop policy if exists "catalogo_medicamentos_leitura" on public.catalogo_medicamentos;
create policy "catalogo_medicamentos_leitura"
  on public.catalogo_medicamentos for select
  using (
    clinica_id is null
    or clinica_id = (select p.clinica_id from public.profissionais p where p.id = auth.uid())
  );

drop policy if exists "catalogo_medicamentos_escrita" on public.catalogo_medicamentos;
create policy "catalogo_medicamentos_escrita"
  on public.catalogo_medicamentos for all
  using (
    clinica_id = (select p.clinica_id from public.profissionais p where p.id = auth.uid())
  )
  with check (
    clinica_id = (select p.clinica_id from public.profissionais p where p.id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CATÁLOGO DE EXERCÍCIOS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.catalogo_exercicios (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid references public.clinicas (id) on delete cascade,
  titulo text not null,
  instrucoes text,
  video_url text,                  -- link (YouTube/Drive/etc.)
  video_path text,                 -- arquivo no bucket 'exercicios-midia'
  imagem_path text,                -- arquivo no bucket 'exercicios-midia'
  criado_por uuid references public.profissionais (id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists catalogo_exercicios_clinica_idx
  on public.catalogo_exercicios (clinica_id, ativo);

alter table public.catalogo_exercicios enable row level security;

drop policy if exists "catalogo_exercicios_leitura" on public.catalogo_exercicios;
create policy "catalogo_exercicios_leitura"
  on public.catalogo_exercicios for select
  using (
    clinica_id is null
    or clinica_id = (select p.clinica_id from public.profissionais p where p.id = auth.uid())
  );

drop policy if exists "catalogo_exercicios_escrita" on public.catalogo_exercicios;
create policy "catalogo_exercicios_escrita"
  on public.catalogo_exercicios for all
  using (
    clinica_id = (select p.clinica_id from public.profissionais p where p.id = auth.uid())
  )
  with check (
    clinica_id = (select p.clinica_id from public.profissionais p where p.id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Ligações opcionais das prescrições ao item de catálogo (rastreabilidade)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.exercicios_prescritos
  add column if not exists catalogo_id uuid references public.catalogo_exercicios (id) on delete set null;

alter table public.prescricoes
  add column if not exists catalogo_id uuid references public.catalogo_medicamentos (id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. STORAGE: bucket privado para vídeo/imagem de exercício
-- ─────────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('exercicios-midia', 'exercicios-midia', false)
on conflict (id) do nothing;

drop policy if exists "exercicios_midia_leitura" on storage.objects;
create policy "exercicios_midia_leitura"
  on storage.objects for select to authenticated
  using (bucket_id = 'exercicios-midia');

drop policy if exists "exercicios_midia_insercao" on storage.objects;
create policy "exercicios_midia_insercao"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'exercicios-midia');

drop policy if exists "exercicios_midia_atualizacao" on storage.objects;
create policy "exercicios_midia_atualizacao"
  on storage.objects for update to authenticated
  using (bucket_id = 'exercicios-midia');

drop policy if exists "exercicios_midia_remocao" on storage.objects;
create policy "exercicios_midia_remocao"
  on storage.objects for delete to authenticated
  using (bucket_id = 'exercicios-midia');

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ADMIN: pode APAGAR paciente (hard delete; cascata cuida do resto).
--    Policy permissiva e aditiva — não mexe nas policies existentes.
--    (Pacientes com login no portal também precisam da edge function
--     'excluir-paciente', que remove o usuário no auth.)
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "pacientes_admin_delete" on public.pacientes;
create policy "pacientes_admin_delete"
  on public.pacientes for delete
  using (
    exists (select 1 from public.profissionais p where p.id = auth.uid() and p.papel = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. SEED — itens globais comuns em queimadura (clinica_id = null).
--    Só insere se ainda não existir item global com o mesmo nome.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.catalogo_medicamentos (clinica_id, nome, apresentacao, via, dose_padrao, frequencia_padrao)
select null::uuid, v.nome, v.apresentacao, v.via, v.dose_padrao, v.frequencia_padrao
from (values
  ('Sulfadiazina de prata 1%', 'creme 1%',        'tópica',   'camada fina cobrindo a lesão', '1 a 2x ao dia'),
  ('Colagenase',               'pomada',          'tópica',   'camada fina',                  '1x ao dia'),
  ('Hidrogel',                 'gel',             'curativo', 'preencher o leito da ferida',  'a cada 1 a 3 dias'),
  ('Espuma com prata',         'placa',           'curativo', 'recortar do tamanho da lesão', 'a cada 3 a 7 dias'),
  ('Ácido graxo essencial (AGE)', 'óleo',         'tópica',   'cobrir a área',                'a cada troca de curativo'),
  ('Hidrocoloide',             'placa',           'curativo', 'recortar do tamanho da lesão', 'a cada 3 a 7 dias'),
  ('Gaze não aderente (petrolatum)', 'compressa', 'curativo', 'cobrir a lesão',               'a cada 1 a 2 dias'),
  ('Clorexidina degermante 2%', 'solução',        'tópica',   'limpeza da ferida',            'a cada troca de curativo'),
  ('Dipirona 500 mg',          'comprimido',      'oral',     '1 comprimido',                 'a cada 6 h se dor'),
  ('Paracetamol 750 mg',       'comprimido',      'oral',     '1 comprimido',                 'a cada 6 h se dor'),
  ('Ibuprofeno 400 mg',        'comprimido',      'oral',     '1 comprimido',                 'a cada 8 h se dor'),
  ('Tramadol 50 mg',           'comprimido',      'oral',     '1 comprimido',                 'a cada 8 h se dor intensa')
) as v(nome, apresentacao, via, dose_padrao, frequencia_padrao)
where not exists (
  select 1 from public.catalogo_medicamentos c
  where c.clinica_id is null and lower(c.nome) = lower(v.nome)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. VERIFICAÇÃO
-- ─────────────────────────────────────────────────────────────────────────────
select 'catalogo_medicamentos' as tabela, count(*) from public.catalogo_medicamentos
union all
select 'catalogo_exercicios', count(*) from public.catalogo_exercicios;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('catalogo_medicamentos', 'catalogo_exercicios', 'pacientes')
order by tablename, policyname;
