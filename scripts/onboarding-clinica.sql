-- DermIA — Onboarding de clínica + profissionais reais
-- Rode no SQL Editor do Supabase. Substitua os valores em <...> antes de rodar.
-- Ver docs/GUIA_ADMINISTRADOR.md seção 2 e docs/PROXIMOS_PASSOS.md seção 5.
--
-- ATENÇÃO: as colunas de token em auth.users PRECISAM ser '' (string vazia),
-- NUNCA null — null quebra o login com "Database error querying schema".
--
-- Este script cria: 1 clínica + 1 profissional admin + 1 fisioterapeuta comum,
-- o mínimo para testar o isolamento de RLS entre profissionais.

do $$
declare
  v_clinica_id  uuid;
  v_admin_id    uuid := gen_random_uuid();
  v_fisio_id    uuid := gen_random_uuid();

  -- >>> EDITE AQUI <<<
  c_clinica_nome   text := '<Nome da Clínica>';
  c_admin_nome     text := '<Nome do Admin>';
  c_admin_email    text := '<admin@clinica.com>';
  c_admin_senha    text := '<senha-forte-admin>';
  c_fisio_nome     text := '<Nome do Fisioterapeuta>';
  c_fisio_email    text := '<fisio@clinica.com>';
  c_fisio_senha    text := '<senha-forte-fisio>';
begin
  -- 1. Clínica
  insert into public.clinicas (nome, ativa)
  values (c_clinica_nome, true)
  returning id into v_clinica_id;

  -- 2. auth.users — admin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
    c_admin_email, crypt(c_admin_senha, gen_salt('bf')),
    '', '', '', '', '', '', '', '',
    now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
  );

  -- 3. auth.users — fisioterapeuta comum
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_fisio_id, 'authenticated', 'authenticated',
    c_fisio_email, crypt(c_fisio_senha, gen_salt('bf')),
    '', '', '', '', '', '', '', '',
    now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
  );

  -- 4. profissionais vinculados à clínica
  insert into public.profissionais (id, clinica_id, nome, email, papel, ativo)
  values
    (v_admin_id, v_clinica_id, c_admin_nome, c_admin_email, 'admin', true),
    (v_fisio_id, v_clinica_id, c_fisio_nome, c_fisio_email, 'fisioterapeuta', true);

  raise notice 'clinica_id = %', v_clinica_id;
  raise notice 'admin_id   = %', v_admin_id;
  raise notice 'fisio_id   = %', v_fisio_id;
end $$;

-- Confira:
-- select p.nome, p.papel, p.email, c.nome as clinica
-- from public.profissionais p join public.clinicas c on c.id = p.clinica_id
-- order by c.nome, p.papel;
--
-- Se `profissionais.papel` recusar 'fisioterapeuta' com erro de check constraint,
-- rode para ver os valores aceitos:
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where contype='c' and connamespace='public'::regnamespace and conname like '%profissionais%';
