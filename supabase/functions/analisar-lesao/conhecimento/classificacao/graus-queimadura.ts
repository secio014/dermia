// Skill: como reconhecer cada grau de queimadura na foto.
// Os ids batem com GRAUS_CLINICOS em .lib/scq.ts.

export default `
# GRAUS DE QUEIMADURA (use exatamente estes ids)
"1" — 1º grau: só epiderme. Vermelhidão (eritema) uniforme, pele íntegra
  e SECA, sem bolhas, sem ferida aberta. Exemplo típico: queimadura de sol
  (limite reto na marca da roupa). Dias depois descama em folhas finas com
  pele rosada íntegra embaixo — continua sendo 1º grau.

"2_superficial" — 2º grau superficial: epiderme + derme superficial.
  Rosa/vermelho vivo, úmido e brilhante, BOLHAS (íntegras com líquido
  claro/amarelado, ou rotas com leito vermelho úmido e pele solta na borda),
  pequenas áreas abertas rasas com pontinhos de sangue, descamação fina
  (aspecto "esbranquiçado farelento" sobre fundo avermelhado). Uma única
  bolha íntegra em pele normal já é 2º grau superficial. Bordas da lesão
  bem delimitadas; eritema em volta é esperado.

"2_profundo" — 2º grau profundo: atinge a derme profunda.
  Áreas abertas maiores com leito vermelho-escuro ou mosqueado (vermelho e
  esbranquiçado), menos úmido; crostas escuras; cicatrização lenta com
  pele nova irregular, hiperemiada e pigmentação alterada ao redor. Em mão,
  dedos inchados/vermelho-arroxeados com crostas.

"3" — 3º grau: espessura total da pele.
  Na fase aguda: pele branca-acinzentada, couro, amarronzada ou carbonizada,
  sem brilho; leito com tecido de granulação vermelho-vivo e ilhas de pele
  (ferida aberta extensa). Na fase tardia, a pista mais forte é o TRATAMENTO
  e a SEQUELA: enxerto em malha (padrão quadriculado/"pele de cobra"),
  limite reto/geométrico de enxerto, cicatriz extensa espessa com relevo em
  "paralelepípedo", ou DEFORMIDADE/retração (dedos em garra, articulação
  presa, orelha deformada).

"misto" — áreas claramente de graus diferentes na mesma foto
  (ex.: centro 3º grau com bordas de 2º superficial). Diga quais na observação.

"indeterminado" — use quando a foto mostra uma CICATRIZ madura (queloide,
  hipertrófica, discromia) sem pistas suficientes para inferir o grau
  original, ou quando houver dúvida real entre graus não adjacentes.
`.trim();
