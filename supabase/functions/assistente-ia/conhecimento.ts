// Conhecimento clínico de referência para o chat de TEXTO do assistente.
// (Era lido de analisar-lesao/conhecimento/, que virou checklist + regras
// em código e não tem mais texto de prompt.) Fotos no chat usam o mesmo
// pipeline do analisar-lesao — ver index.ts.


const grausQueimadura = `
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


const cicatrizes = `
# CICATRIZES ELEVADAS
QUELOIDE ("queloide")
  Cicatriz elevada e FIRME que CRESCE ALÉM DO LIMITE DA FERIDA original,
  avançando sobre tecido saudável, por excesso de colágeno.
  Na foto: massa saliente, brilhante, rosada a arroxeada ou amarronzada,
  bordas que "transbordam" (formato de flor, garra, cordão ou lóbulo),
  superfície lisa ou com dobras. Comum em tórax, ombro, braço, orelha.

HIPERTRÓFICA ("hipertrofica")
  Lesão/cicatriz ELEVADA que fica DENTRO dos limites da ferida original.
  Na foto: relevo acima da pele vizinha acompanhando o desenho da lesão;
  pode ter faixas/cordões elevados (ex.: listras paralelas) ou superfície
  irregular em "paralelepípedo". Costuma ser avermelhada no início.

COMO DIFERENCIAR: se a cicatriz invade claramente a pele sã além do formato
da lesão → queloide. Se é elevada mas respeita o contorno → hipertrófica.
Em dúvida, marque "hipertrofica" e explique na observação.
`.trim();


const pigmentacaoEVascular = `
# ALTERAÇÕES DE COR
HIPERCRÔMICA ("hipercromica")
  Região MAIS ESCURA que a pele normal do paciente, por excesso/acúmulo de
  melanina. Na foto: manchas marrons, castanho-escuras ou arroxeadas-
  amarronzadas, inclusive em volta de cicatrizes.

HIPOCRÔMICA ("hipocromica")
  Região MAIS CLARA que a pele normal, por diminuição da melanina.
  Na foto: manchas rosadas-claras/esbranquiçadas sobre pele mais escura
  (aspecto "mapa" ou "vitiligo-like"), muito visível em pele morena/negra.

HIPEREMIA / HIPEREMIADA ("hiperemia")
  Vermelhidão (e calor local) por aumento do fluxo de sangue.
  Na foto: tom vermelho a rosa-avermelhado intenso, difuso, em cicatriz
  recente, em área enxertada ou em ÁREA DOADORA de enxerto. Também use
  para o eritema da queimadura aguda (queimadura de sol, halo de bolhas).

A mesma foto pode ter várias ao mesmo tempo (ex.: hiperemia + hipercromia;
hipercromia em uma parte e hipocromia em outra). Liste todas que vir.
Compare sempre com a pele saudável do próprio paciente visível na foto.
`.trim();


const procedimentosESequelas = `
# PROCEDIMENTOS E SEQUELAS
ENXERTO EM MALHA ("enxerto_malha")
  Pele enxertada que foi expandida em rede: padrão regular de pequenos
  losangos/furos, aspecto quadriculado ou "pele de cobra"; ou fileiras de
  pequenos cortes paralelos. Indica queimadura de 3º grau tratada.

ÁREA DOADORA ("area_doadora")
  Local de onde se retirou pele para enxerto (geralmente coxa).
  Na foto: faixa(s) RETANGULAR(ES) de bordas retas, vermelhas/hiperemiadas,
  superfície uniforme e brilhante; em fase tardia, retângulo mais claro.
  Área doadora NÃO é a queimadura em si — não use ela para definir o grau.

DEFORMIDADE ("deformidade")
  Retração ou perda de forma: dedos em garra ou fundidos, articulação
  fixa, unhas deformadas, orelha/nariz retraídos. Sequela de 3º grau.

FERIDA ABERTA ("ferida_aberta")
  Área sem pele cobrindo: leito vermelho (granulação), amarelado (fibrina)
  ou escuro (necrose/crosta), úmido, às vezes com secreção. Pode ser de
  2º grau profundo ou 3º grau — veja profundidade e extensão.
`.trim();

export const CONHECIMENTO = [grausQueimadura, cicatrizes, pigmentacaoEVascular, procedimentosESequelas].join('\n\n');
