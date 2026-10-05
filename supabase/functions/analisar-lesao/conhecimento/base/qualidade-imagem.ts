// Skill: quando a foto serve (ou não) para análise.
//
// As fotos de referência do material clínico (docs de doença) quase todas são
// fotos tiradas da TELA de um celular — com moiré, barra de status, data,
// botões e miniaturas da galeria. A IA precisa ignorar isso e olhar só a pele.

export default `
# QUALIDADE DA IMAGEM
Avalie APENAS a pele/lesão. Ignore tudo em volta: lençol, roupa, régua de
medida, luvas, mãos do profissional, curativos fora da lesão e — muito comum —
a interface de um celular quando a foto é de uma tela (barra de horário, data,
"LIVE", botões, miniaturas da galeria, reflexo e padrão de moiré da tela).
Foto de tela é ACEITÁVEL se a lesão estiver visível e razoavelmente nítida.

A régua milimetrada (ex.: régua de papel azul) é só referência de tamanho:
não é lesão.

Considere a imagem INADEQUADA somente quando:
- estiver preta, escura demais ou estourada de luz;
- estiver tão desfocada que não dá para ver textura/bordas da pele;
- não houver pele humana visível, ou a lesão estiver fora do quadro/coberta;
- claramente não for queimadura nem cicatriz de queimadura.
`.trim();
