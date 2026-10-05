// Skill: sinais da queimadura RECENTE (fase aguda) — bolha, descamação,
// eritema e as armadilhas que fazem a IA errar o grau. Baseada nas fotos de
// queimadura aguda acrescentadas ao material clínico em 2026-10-05.

export default `
# LESÕES AGUDAS (queimadura recente)
BOLHA ("bolha")
  Pele levantada com líquido embaixo. ÍNTEGRA: cúpula lisa, brilhante,
  tensa, com líquido transparente ou amarelado (cor de mel). ROTA: a
  cúpula estourou e sobra um círculo de leito vermelho úmido com restos de
  pele branca/acinzentada solta na borda. Bolha com conteúdo vermelho-
  escuro (sangue) também é bolha. Qualquer bolha = no mínimo 2º grau
  superficial — NUNCA marque 1º grau se houver bolha.

DESCAMAÇÃO ("descamacao")
  Pele morta soltando em FOLHAS ou lascas finas, brancas/translúcidas,
  com bordas enroladas, como papel. Aparece dias depois da queimadura.
  Olhe EMBAIXO da pele que solta:
  - pele rosada, SECA e íntegra → era 1º grau (ex.: queimadura de sol);
  - leito vermelho, úmido, brilhante ou sangrando → 2º grau superficial.
  Descamação branca NÃO é hipocromia e NÃO é cicatriz.

ERITEMA AGUDO (marque como "hiperemia")
  Vermelhidão difusa e uniforme de pele íntegra, sem relevo de cicatriz.
  Sozinha = 1º grau. Em volta de bolhas/feridas é o halo normal do 2º grau
  e NÃO transforma a foto em "misto".

QUEIMADURA DE SOL — pistas: vermelho em toda a área exposta (nuca, ombro,
  costas, decote), limite RETO e nítido no desenho da roupa/alça/gola.
  A pele clara que ficou coberta pela roupa é pele NORMAL do paciente:
  não marque "hipocromica" nela.

PROFUNDIDADE NO LEITO ABERTO
  Pontinhos vermelho-escuros de sangue, rosa vivo, úmido e brilhante →
  derme superficial viva → "2_superficial".
  Branco-porcelana ou acinzentado, SECO, sem pontinhos de sangue, ou
  vermelho-escuro fixo e opaco → derme profunda → "2_profundo" (ou "misto"
  se só parte da área for assim).
  Branco brilhante e úmido que parece pele solta/enrugada é EPIDERME
  descolada (bolha rota), não sinal de profundidade.
`.trim();
