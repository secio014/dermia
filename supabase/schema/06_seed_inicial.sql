-- DermIA — 06 Dados iniciais: clínica de teste + profissional de teste
--
-- O app em modo dev (`expo start`) entra sozinho com teste@dermia.local
-- (credenciais em .lib/dev.ts). Este script cria essa conta.
--
-- Colunas de token do auth.users precisam ser '' (string vazia), NUNCA null,
-- senão o login quebra com "Database error querying schema".

do $$
declare
  v_clinica_id uuid;
  v_teste_id   uuid;
begin
  select id into v_clinica_id from public.clinicas where nome = 'Clínica Teste DermIA';
  if v_clinica_id is null then
    insert into public.clinicas (nome, tipo) values ('Clínica Teste DermIA', 'clinica')
    returning id into v_clinica_id;
  end if;

  select id into v_teste_id from auth.users where email = 'teste@dermia.local';
  if v_teste_id is null then
    v_teste_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
    ) values (
      '00000000-0000-0000-0000-000000000000', v_teste_id, 'authenticated', 'authenticated',
      'teste@dermia.local', crypt('senha-teste-123', gen_salt('bf')),
      '', '', '', '', '', '', '', '',
      now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
    );
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
    values (gen_random_uuid(), v_teste_id, v_teste_id::text, 'email',
            jsonb_build_object('sub', v_teste_id::text, 'email', 'teste@dermia.local', 'email_verified', true),
            now(), now(), now());
  end if;

  insert into public.profissionais (id, clinica_id, nome, email, papel, ativo)
  values (v_teste_id, v_clinica_id, 'Profissional Teste', 'teste@dermia.local', 'admin', true)
  on conflict (id) do nothing;

  raise notice 'clinica_id = %, teste_id = %', v_clinica_id, v_teste_id;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sua conta de admin_geral (visão da plataforma, /global).
-- 1) Crie o usuário em Authentication → Users → "Add user" (marque Auto Confirm).
-- 2) Troque o e-mail abaixo e rode:
--
-- insert into public.profissionais (id, clinica_id, nome, email, papel, ativo)
-- select id, null, 'Pedro', email, 'admin_geral', true
-- from auth.users where email = 'SEU-EMAIL-AQUI'
-- on conflict (id) do update set papel = 'admin_geral', ativo = true, clinica_id = null;
-- ─────────────────────────────────────────────────────────────────────────────
