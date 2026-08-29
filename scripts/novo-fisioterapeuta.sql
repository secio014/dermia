-- DermIA — Adicionar 1 fisioterapeuta a uma clínica que já existe
-- Rode no SQL Editor do Supabase. Substitua os valores em <...>.
--
-- Pré-requisito: a clínica e o admin já existem (rodou scripts/onboarding-clinica.sql).
-- Este script só cria o auth.users + o registro em profissionais do novo fisio.
--
-- ATENÇÃO: as colunas de token em auth.users PRECISAM ser '' (string vazia),
-- NUNCA null — null quebra o login com "Database error querying schema".

do $$
declare
  v_fisio_id uuid := gen_random_uuid();
  v_clinica_id uuid;

  -- >>> EDITE AQUI <<<
  c_clinica_nome text := '<Nome exato da clínica já cadastrada>';
  c_fisio_nome   text := '<Nome do Fisioterapeuta>';
  c_fisio_email  text := '<fisio@clinica.com>';
  c_fisio_senha  text := '<senha-forte>';
begin
  select id into v_clinica_id from public.clinicas where nome = c_clinica_nome;
  if v_clinica_id is null then
    raise exception 'Clínica "%" não encontrada. Rode onboarding-clinica.sql primeiro.', c_clinica_nome;
  end if;

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

  insert into public.profissionais (id, clinica_id, nome, email, papel, ativo)
  values (v_fisio_id, v_clinica_id, c_fisio_nome, c_fisio_email, 'fisioterapeuta', true);

  raise notice 'fisio_id = %  (clinica %)', v_fisio_id, v_clinica_id;
end $$;

-- Confira:
-- select p.nome, p.papel, p.email, c.nome as clinica
-- from public.profissionais p join public.clinicas c on c.id = p.clinica_id
-- order by c.nome, p.papel;
