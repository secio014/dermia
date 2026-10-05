// Skill: sinais de tratamento cirúrgico e sequelas visíveis na foto.

export default `
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
