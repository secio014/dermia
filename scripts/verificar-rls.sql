-- DermIA — Auditoria de RLS
-- Rode este arquivo inteiro no SQL Editor do Supabase (Dashboard → SQL Editor).
-- Não altera nada; só relata. Ver docs/PROXIMOS_PASSOS.md seção 3.

-- 1) Tabelas do schema public SEM row level security ativo.
--    Resultado ideal: nenhuma linha.
select 'SEM RLS ATIVO' as problema, tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false
order by tablename;

-- 2) Tabelas com RLS ativo mas SEM nenhuma policy.
--    Nesse estado ninguém (exceto service_role) lê/escreve — ou, se a policy
--    for adicionada errada depois, vira falha aberta. Resultado ideal: nenhuma linha.
select 'RLS ATIVO SEM POLICY' as problema, t.tablename
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
  and t.rowsecurity = true
group by t.tablename
having count(p.policyname) = 0
order by t.tablename;

-- 3) Panorama: cada tabela public, se tem RLS e quantas policies.
--    Confira à mão as tabelas mais novas: feedback_piloto, execucoes_exercicio,
--    exercicios_prescritos, e a tabela de acesso do portal do paciente.
select
  t.tablename,
  t.rowsecurity                              as rls_ativo,
  count(p.policyname)                        as qtd_policies,
  string_agg(p.policyname, ', ' order by p.policyname) as policies
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
group by t.tablename, t.rowsecurity
order by t.rowsecurity, t.tablename;

-- 4) Se alguma tabela aparecer sem RLS, ative e crie policies espelhando
--    uma tabela irmã (ex.: as policies de `lesoes` ou `pacientes`):
--
--    alter table public.<tabela> enable row level security;
--
--    Veja o texto das policies existentes com:
--    select tablename, policyname, cmd, qual, with_check
--    from pg_policies where schemaname = 'public' order by tablename, policyname;
