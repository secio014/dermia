-- DermIA — Pacientes FICTÍCIOS para testar o app e o Assistente IA.
-- Entram na clínica do profissional de teste (teste@dermia.local).
-- Idempotente: se já existir paciente TESTE-01 nessa clínica, não faz nada.
-- Para remover tudo depois:
--   delete from public.pacientes where codigo_pseudonimo like 'TESTE-%';
--
-- Cenários:
--   TESTE-01 Ana     — 2º superficial no antebraço, melhorando bem, boa adesão
--   TESTE-02 Carlos  — 3º grau extenso (tronco/braço), enxerto, dor estagnada,
--                      ADM de ombro limitada, adesão baixa → CRÍTICO
--   TESTE-03 Beatriz — criança, 2º profundo na perna, cicatriz hipertrofiando
--   TESTE-04 João    — elétrica na mão, 3º grau, retração dos dedos
--   TESTE-05 Mariana — química no pescoço, já de alta (cicatrizada)

do $$
declare
  v_prof uuid;
  v_clin uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid;
  l1 uuid; l2 uuid; l3 uuid; l4 uuid; l5 uuid;
  e uuid;
begin
  select id, clinica_id into v_prof, v_clin from public.profissionais where email = 'teste@dermia.local';
  if v_prof is null then
    raise exception 'Profissional teste@dermia.local não encontrado.';
  end if;
  if exists (select 1 from public.pacientes where clinica_id = v_clin and codigo_pseudonimo = 'TESTE-01') then
    raise notice 'Pacientes de teste já existem — nada a fazer.';
    return;
  end if;

  -- ── Pacientes ─────────────────────────────────────────────────────────────
  insert into public.pacientes (clinica_id, criado_por, codigo_pseudonimo, nome_completo, data_nascimento, sexo, telefone, consentimento_em, consentimento_versao)
  values (v_clin, v_prof, 'TESTE-01', 'Ana Souza (teste)', '1991-04-12', 'F', '11999990001', now(), '1.0') returning id into p1;
  insert into public.pacientes (clinica_id, criado_por, codigo_pseudonimo, nome_completo, data_nascimento, sexo, telefone, consentimento_em, consentimento_versao)
  values (v_clin, v_prof, 'TESTE-02', 'Carlos Lima (teste)', '1973-09-30', 'M', '11999990002', now(), '1.0') returning id into p2;
  insert into public.pacientes (clinica_id, criado_por, codigo_pseudonimo, nome_completo, data_nascimento, sexo, telefone, consentimento_em, consentimento_versao)
  values (v_clin, v_prof, 'TESTE-03', 'Beatriz Rocha (teste)', '2017-06-03', 'F', '11999990003', now(), '1.0') returning id into p3;
  insert into public.pacientes (clinica_id, criado_por, codigo_pseudonimo, nome_completo, data_nascimento, sexo, telefone, consentimento_em, consentimento_versao)
  values (v_clin, v_prof, 'TESTE-04', 'João Pereira (teste)', '1980-01-21', 'M', '11999990004', now(), '1.0') returning id into p4;
  insert into public.pacientes (clinica_id, criado_por, codigo_pseudonimo, nome_completo, data_nascimento, sexo, telefone, consentimento_em, consentimento_versao)
  values (v_clin, v_prof, 'TESTE-05', 'Mariana Alves (teste)', '1996-11-08', 'F', '11999990005', now(), '1.0') returning id into p5;

  -- ── Lesões ────────────────────────────────────────────────────────────────
  insert into public.lesoes (paciente_id, regiao_corporal, mecanismo, data_ocorrencia, scq_percentual, scq_tabela, mapa_scq, grau_clinico, status, observacoes, criado_por)
  values (p1, 'Braço direito', 'escaldadura', current_date - 18, 4.5, 'wallace_adulto',
          '[{"regiao":"braco_dir","percentual":4.5}]', '2_superficial', 'ativa',
          'Água fervente no antebraço. Bolhas rompidas na admissão.', v_prof) returning id into l1;
  insert into public.lesoes (paciente_id, regiao_corporal, mecanismo, data_ocorrencia, scq_percentual, scq_tabela, mapa_scq, grau_clinico, status, observacoes, criado_por)
  values (p2, 'Múltiplas regiões', 'chama', current_date - 42, 22, 'wallace_adulto',
          '[{"regiao":"tronco_anterior","percentual":15},{"regiao":"braco_esq","percentual":7}]', '3', 'ativa',
          'Explosão de botijão. Enxerto em malha no tronco há 4 semanas; área doadora na coxa direita.', v_prof) returning id into l2;
  insert into public.lesoes (paciente_id, regiao_corporal, mecanismo, data_ocorrencia, scq_percentual, scq_tabela, mapa_scq, grau_clinico, status, observacoes, criado_por)
  values (p3, 'Perna direita', 'escaldadura', current_date - 26, 6, 'lund_browder_pediatrico',
          '[{"regiao":"perna_dir","percentual":6}]', '2_profundo', 'ativa',
          'Derramou panela no fogão. Pele nova rosada e começando a elevar.', v_prof) returning id into l3;
  insert into public.lesoes (paciente_id, regiao_corporal, mecanismo, data_ocorrencia, scq_percentual, scq_tabela, mapa_scq, grau_clinico, status, observacoes, criado_por)
  values (p4, 'Braço direito', 'eletrica', current_date - 60, 2.5, 'wallace_adulto',
          '[{"regiao":"braco_dir","percentual":2.5}]', '3', 'ativa',
          'Choque de alta tensão, entrada na mão direita. Retração em flexão dos dedos.', v_prof) returning id into l4;
  insert into public.lesoes (paciente_id, regiao_corporal, mecanismo, data_ocorrencia, scq_percentual, scq_tabela, mapa_scq, grau_clinico, status, observacoes, criado_por)
  values (p5, 'Cabeça e pescoço', 'quimica', current_date - 75, 3, 'wallace_adulto',
          '[{"regiao":"cabeca","percentual":3}]', '2_superficial', 'cicatrizada',
          'Respingo de soda cáustica. Cicatrizou sem sequela funcional; leve hipocromia.', v_prof) returning id into l5;

  -- ── Evolução (dor EVA, ADM, Vancouver) ────────────────────────────────────
  insert into public.registros_evolucao (lesao_id, profissional_id, data_atendimento, dor_eva, descricao, condutas, adm, escala_cicatriz) values
  (l1, v_prof, current_date - 16, 7, 'Leito rosado e úmido, sem sinais de infecção.', 'Curativo com hidrogel, orientação de elevação do membro.',
     '[{"articulacao":"Punho","movimento":"Extensão","grau_ativo":40,"grau_passivo":50,"referencia":70}]', null),
  (l1, v_prof, current_date - 9, 5, 'Epitelização em ~70% da área.', 'Mobilização ativa de punho e dedos.',
     '[{"articulacao":"Punho","movimento":"Extensão","grau_ativo":55,"grau_passivo":62,"referencia":70}]', '{"pigmentacao":1,"vascularidade":2,"elasticidade":1,"altura":0}'),
  (l1, v_prof, current_date - 2, 3, 'Epitelização quase completa, pele nova rosada.', 'Hidratação, protetor solar, manter exercícios.',
     '[{"articulacao":"Punho","movimento":"Extensão","grau_ativo":66,"grau_passivo":70,"referencia":70}]', '{"pigmentacao":1,"vascularidade":1,"elasticidade":1,"altura":0}'),

  (l2, v_prof, current_date - 28, 8, 'Enxerto integrado ~85%, áreas cruentas no flanco.', 'Curativo, posicionamento antideformidade do ombro.',
     '[{"articulacao":"Ombro esquerdo","movimento":"Abdução","grau_ativo":80,"grau_passivo":95,"referencia":180}]', '{"pigmentacao":2,"vascularidade":3,"elasticidade":3,"altura":2}'),
  (l2, v_prof, current_date - 14, 7, 'Cicatriz hiperemiada e espessa no tronco; queixa de prurido.', 'Alongamento, início de malha compressiva.',
     '[{"articulacao":"Ombro esquerdo","movimento":"Abdução","grau_ativo":95,"grau_passivo":110,"referencia":180}]', '{"pigmentacao":2,"vascularidade":3,"elasticidade":3,"altura":3}'),
  (l2, v_prof, current_date - 3, 7, 'Pequena área aberta no flanco com secreção amarelada; pele ao redor quente.', 'Limpeza, encaminhado para avaliação médica (suspeita de infecção).',
     '[{"articulacao":"Ombro esquerdo","movimento":"Abdução","grau_ativo":100,"grau_passivo":112,"referencia":180}]', '{"pigmentacao":2,"vascularidade":3,"elasticidade":4,"altura":3}'),

  (l3, v_prof, current_date - 20, 6, 'Criança chorosa no curativo. Leito vermelho, sem odor.', 'Curativo com espuma de prata, brincar com movimento de joelho.',
     '[{"articulacao":"Joelho direito","movimento":"Flexão","grau_ativo":90,"grau_passivo":110,"referencia":140}]', null),
  (l3, v_prof, current_date - 6, 4, 'Fechou. Cicatriz avermelhada e levemente elevada, dentro dos limites da lesão.', 'Massagem cicatricial, silicone em gel, malha compressiva.',
     '[{"articulacao":"Joelho direito","movimento":"Flexão","grau_ativo":115,"grau_passivo":125,"referencia":140}]', '{"pigmentacao":1,"vascularidade":2,"elasticidade":2,"altura":2}'),

  (l4, v_prof, current_date - 40, 5, 'Mão em garra leve, rigidez de MCF.', 'Órtese de posicionamento noturna, mobilização passiva.',
     '[{"articulacao":"MCF 2º-5º dedos","movimento":"Extensão","grau_ativo":-25,"grau_passivo":-10,"referencia":0}]', '{"pigmentacao":2,"vascularidade":2,"elasticidade":4,"altura":2}'),
  (l4, v_prof, current_date - 7, 4, 'Retração persiste; ganho pequeno de extensão.', 'Manter órtese, avaliar com cirurgia plástica a necessidade de liberação.',
     '[{"articulacao":"MCF 2º-5º dedos","movimento":"Extensão","grau_ativo":-20,"grau_passivo":-5,"referencia":0}]', '{"pigmentacao":2,"vascularidade":2,"elasticidade":4,"altura":2}'),

  (l5, v_prof, current_date - 70, 4, 'Eritema e descamação no pescoço.', 'Hidratação e fotoproteção.', '[]', null),
  (l5, v_prof, current_date - 45, 1, 'Cicatrizado, mancha mais clara (hipocrômica) discreta.', 'Alta da fisioterapia com orientações.', '[]',
     '{"pigmentacao":1,"vascularidade":0,"elasticidade":0,"altura":0}');

  -- ── Exercícios + execuções (adesão) ──────────────────────────────────────
  insert into public.exercicios_prescritos (paciente_id, profissional_id, titulo, instrucoes, series, repeticoes, frequencia_semanal)
  values (p1, v_prof, 'Extensão ativa de punho', 'Apoiar o antebraço na mesa e levantar a mão devagar.', 3, 12, 7) returning id into e;
  insert into public.execucoes_exercicio (exercicio_id, data)
  select e, current_date - d from generate_series(0, 13) d where d not in (4, 9);   -- ~86%

  insert into public.exercicios_prescritos (paciente_id, profissional_id, titulo, instrucoes, series, repeticoes, frequencia_semanal)
  values (p2, v_prof, 'Abdução de ombro na parede', 'Subir os dedos pela parede até sentir alongamento, segurar 20 s.', 3, 10, 7) returning id into e;
  insert into public.execucoes_exercicio (exercicio_id, data)
  select e, current_date - d from generate_series(0, 27, 5) d;                       -- baixa

  insert into public.exercicios_prescritos (paciente_id, profissional_id, titulo, instrucoes, series, repeticoes, frequencia_semanal)
  values (p3, v_prof, 'Agachamento brincando', 'Pegar brinquedos do chão dobrando os joelhos.', 2, 10, 5) returning id into e;
  insert into public.execucoes_exercicio (exercicio_id, data)
  select e, current_date - d from generate_series(0, 20) d where d % 7 not in (0, 6);

  insert into public.exercicios_prescritos (paciente_id, profissional_id, titulo, instrucoes, series, repeticoes, frequencia_semanal)
  values (p4, v_prof, 'Extensão passiva dos dedos', 'Com a outra mão, estender os dedos e segurar 30 s.', 4, 5, 14) returning id into e;
  insert into public.execucoes_exercicio (exercicio_id, data)
  select e, current_date - d from generate_series(0, 29, 2) d;

  -- ── Prescrições ───────────────────────────────────────────────────────────
  insert into public.prescricoes (paciente_id, profissional_id, nome, dose, frequencia, inicio) values
  (p1, v_prof, 'Hidrogel', 'preencher o leito da ferida', 'a cada 2 dias', current_date - 16),
  (p2, v_prof, 'Sulfadiazina de prata 1%', 'camada fina nas áreas abertas', '2x ao dia', current_date - 30),
  (p2, v_prof, 'Dipirona 500 mg', '1 comprimido', 'a cada 6 h se dor', current_date - 30),
  (p3, v_prof, 'Gel de silicone', 'camada fina na cicatriz', '2x ao dia', current_date - 6),
  (p4, v_prof, 'Ácido graxo essencial (AGE)', 'cobrir a área', '1x ao dia', current_date - 40);

  -- ── Agenda ────────────────────────────────────────────────────────────────
  insert into public.consultas (paciente_id, profissional_id, inicio_em, duracao_min, motivo, status) values
  (p1, v_prof, date_trunc('day', now()) + interval '1 day 9 hours',  45, 'Reavaliação e progressão de exercícios', 'agendada'),
  (p2, v_prof, date_trunc('day', now()) + interval '1 day 14 hours', 60, 'Curativo + reavaliar área aberta no flanco', 'agendada'),
  (p3, v_prof, date_trunc('day', now()) + interval '3 days 10 hours', 45, 'Massagem cicatricial e ajuste da malha', 'agendada'),
  (p4, v_prof, date_trunc('day', now()) + interval '5 days 16 hours', 60, 'Reavaliação da órtese', 'agendada'),
  (p2, v_prof, date_trunc('day', now()) - interval '3 days' + interval '14 hours', 60, 'Curativo', 'realizada'),
  (p4, v_prof, date_trunc('day', now()) - interval '8 days' + interval '16 hours', 60, 'Sessão de mobilização', 'faltou');

  raise notice 'Criados 5 pacientes de teste na clínica %', v_clin;
end $$;
