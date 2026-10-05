// Skill: casos rotulados do material clínico (dermia-docs-doenca.docx).
//
// Cada caso = o que se vê na foto + o rótulo dado pela equipe clínica. Servem
// de exemplos (few-shot em texto) para a IA calibrar o que cada termo parece.
// `imagem` é o arquivo dentro do .docx (word/media/) — ver
// conhecimento/README.md para como reorganizar/expandir este conjunto.

export type CasoReferencia = {
  imagem: string;
  rotulo: string; // legenda original do documento
  descricao: string; // o que aparece na foto
  grau?: '1' | '2_superficial' | '2_profundo' | '3';
  achados: string[];
};

export const CASOS: CasoReferencia[] = [
  { imagem: 'image17.jpg', rotulo: 'Quelóide e hipercrômica', descricao: 'Abdome com régua: cordão espesso, brilhante, rosado, elevado, ultrapassando a borda da lesão; ao lado, placa avermelhada-acastanhada.', achados: ['queloide', 'hipercromica'] },
  { imagem: 'image11.jpg', rotulo: 'Hipercrômica e hipocrômica', descricao: 'Braço com cicatriz extensa: metade vermelho-escura/arroxeada (mais escura) e metade rosa-clara (mais clara), com bordas irregulares.', achados: ['hipercromica', 'hipocromica'] },
  { imagem: 'image10.jpg', rotulo: 'Hipertrófica', descricao: 'Antebraço com várias listras paralelas elevadas, arroxeadas, dentro da área lesada; partes esbranquiçadas descamativas.', achados: ['hipertrofica'] },
  { imagem: 'image16.jpg', rotulo: 'Queimadura 2º grau profundo', descricao: 'Ombro e braço: grande área rosa-arroxeada com várias ilhas abertas vermelho-vivo, bordas irregulares, pele nova frágil.', grau: '2_profundo', achados: ['ferida_aberta', 'hiperemia'] },
  { imagem: 'image6.jpg', rotulo: 'Hipercrômica, 2º grau profundo', descricao: 'Dorso da mão e dedos vermelho-arroxeados, inchados, com crostas pequenas e faixas amarronzadas entre os dedos.', grau: '2_profundo', achados: ['hipercromica', 'hiperemia'] },
  { imagem: 'image13.jpg', rotulo: '3º grau, hiperemia e hipercromia', descricao: 'Costas e braço: cicatriz extensa rosa-arroxeada com faixa de pele sã preservada no meio; manchas escuras arroxeadas.', grau: '3', achados: ['hiperemia', 'hipercromica'] },
  { imagem: 'image12.jpg', rotulo: '(sem legenda — mesma paciente do anterior)', descricao: 'Costas: padrão quadriculado de enxerto em malha na nuca/ombros, cicatriz rosa-arroxeada extensa, faixa de pele sã horizontal.', grau: '3', achados: ['enxerto_malha', 'hiperemia', 'hipercromica'] },
  { imagem: 'image2.jpg', rotulo: 'Hipocrômico', descricao: 'Coxa de pele morena com área retangular rosa-clara/esbranquiçada, nitidamente mais clara que a pele ao redor.', achados: ['hipocromica', 'area_doadora'] },
  { imagem: 'image20.jpg', rotulo: 'Hipocrômica', descricao: 'Tornozelo/perna com grandes manchas claras rosadas entremeadas com pele marrom (aspecto de mapa).', achados: ['hipocromica'] },
  { imagem: 'image9.jpg', rotulo: '3º grau', descricao: 'Close de cicatriz rosa-arroxeada com relevo em "paralelepípedo"/nódulos, crostas escuras, área aberta amarelada e descamação.', grau: '3', achados: ['hipertrofica', 'ferida_aberta'] },
  { imagem: 'image21.jpg', rotulo: 'Queloide', descricao: 'Braço com placa elevada vermelho-arroxeada, brilhante, que avança além do contorno, com pequenos nódulos acima.', achados: ['queloide', 'hiperemia'] },
  { imagem: 'image23.jpg', rotulo: '2º grau superficial', descricao: 'Braço com placa avermelhada, descamação fina esbranquiçada, área central rosa úmida; bordas definidas.', grau: '2_superficial', achados: ['hiperemia'] },
  { imagem: 'image5.jpg', rotulo: '3º grau — deformidade', descricao: 'Mão amarronzada e brilhante, dedos retraídos/ponta rosada, cicatriz linear, lesão vermelha no punho.', grau: '3', achados: ['deformidade', 'hipercromica'] },
  { imagem: 'image26.jpg', rotulo: 'Queloide', descricao: 'Tórax: massa elevada em forma de flor/lóbulos, rosa-amarronzada, firme, bem acima da pele.', achados: ['queloide'] },
  { imagem: 'image24.jpg', rotulo: '3º grau — enxerto em malha', descricao: 'Coxa/quadril: lâmina de enxerto com fileiras de pequenos cortes paralelos, bordas vermelhas, áreas cruentas.', grau: '3', achados: ['enxerto_malha', 'hiperemia'] },
  { imagem: 'image18.jpg', rotulo: '2º grau, hiperemia, hipertrófica, hipocrômica', descricao: 'Antebraço peludo: placa vermelho-vinho irregular, levemente elevada, com áreas mais claras dentro.', grau: '2_profundo', achados: ['hiperemia', 'hipertrofica', 'hipocromica'] },
  { imagem: 'image4.jpg', rotulo: 'Queloide', descricao: 'Antebraço com placa elevada brilhante vinho-arroxeada, bordas que se expandem além da lesão.', achados: ['queloide'] },
  { imagem: 'image22.jpg', rotulo: 'Ferida aberta, 2º grau profundo', descricao: 'Perna com ferida redonda pequena, leito vermelho com fibrina amarela e crosta escura; pele arroxeada ao redor.', grau: '2_profundo', achados: ['ferida_aberta', 'hiperemia'] },
  { imagem: 'image15.jpg', rotulo: 'Queloide', descricao: 'Nádega/coxa de pele morena com cicatriz extensa, bordas elevadas espessas e nódulos, tom acastanhado.', achados: ['queloide', 'hipercromica'] },
  { imagem: 'image7.jpg', rotulo: '3º grau — deformidade', descricao: 'Mão com dedos fletidos/retraídos, unhas deformadas, pele amarelada; faixa de crosta escura e tecido aberto no punho.', grau: '3', achados: ['deformidade', 'ferida_aberta'] },
  { imagem: 'image19.jpg', rotulo: 'Queloide', descricao: 'Braço com cordão grosso arroxeado elevado, brilhante, que se estende além da mancha da lesão.', achados: ['queloide', 'hipercromica'] },
  { imagem: 'image3.jpg', rotulo: '2º grau superficial', descricao: 'Área vermelha úmida com régua, várias pequenas erosões rasas e uma crosta; bordas definidas.', grau: '2_superficial', achados: ['hiperemia', 'ferida_aberta'] },
  { imagem: 'image8.jpg', rotulo: 'Queloide', descricao: 'Orelha e região retroauricular: cicatriz elevada que deforma a hélice e se estende para a pele atrás da orelha.', achados: ['queloide', 'deformidade'] },
  { imagem: 'image14.jpg', rotulo: 'Área doadora — hiperemia', descricao: 'Coxa com dois retângulos vermelho-vinho, bordas retas, superfície uniforme brilhante (pele retirada para enxerto).', achados: ['area_doadora', 'hiperemia'] },
  { imagem: 'image25.jpg', rotulo: '3º grau hiperêmica', descricao: 'Perna inteira com cicatriz/enxerto vermelho-rosado intenso, aspecto reticulado irregular, bordas esbranquiçadas.', grau: '3', achados: ['hiperemia', 'enxerto_malha'] },
  // Fase aguda (acrescentados em 2026-10-05, rótulos propostos — validar com a equipe).
  { imagem: 'image27.jpg', rotulo: '2º grau superficial — bolhas rotas', descricao: 'Dorso da mão vermelho difuso com várias bolhas pequenas redondas estouradas: leito vermelho úmido, algumas com sangue escuro; pele em volta íntegra.', grau: '2_superficial', achados: ['bolha', 'hiperemia', 'ferida_aberta'] },
  { imagem: 'image28.jpg', rotulo: '2º grau superficial — bolha íntegra', descricao: 'Mão fechada com UMA bolha tensa, lisa, brilhante, com líquido amarelado claro; pele em volta normal, sem vermelhidão.', grau: '2_superficial', achados: ['bolha'] },
  { imagem: 'image29.jpg', rotulo: '1º grau — queimadura solar', descricao: 'Nuca e ombros vermelhos uniformes, pele íntegra e seca; limite reto onde estava a gola da camisa, pele clara normal abaixo (não é hipocromia).', grau: '1', achados: ['hiperemia'] },
  { imagem: 'image30.jpg', rotulo: '2º grau superficial — escaldadura', descricao: 'Costas/ombro: grande área de borda irregular, leito rosa-vermelho úmido com pontinhos de sangue, placas branco-rosadas brilhantes de pele solta, borda acastanhada; lesão menor no braço.', grau: '2_superficial', achados: ['bolha', 'ferida_aberta', 'hiperemia'] },
  { imagem: 'image31.jpg', rotulo: '1º grau — queimadura solar descamando', descricao: 'Ombro avermelhado com pele soltando em folhas finas brancas de bordas enroladas; embaixo pele rosada seca e íntegra, sem bolhas.', grau: '1', achados: ['hiperemia', 'descamacao'] },
  { imagem: 'image1.jpg', rotulo: '3º grau profundo — ferida aberta', descricao: 'Tórax lateral/axila: várias ilhas vermelho-vivo de granulação sobre fundo esbranquiçado, crostas escuras.', grau: '3', achados: ['ferida_aberta', 'hiperemia'] },
];

function formatar(caso: CasoReferencia): string {
  const grau = caso.grau ? `grau ${caso.grau}` : 'grau indeterminado (cicatriz)';
  return `- ${caso.descricao} → ${grau}; achados: ${caso.achados.join(', ')}.`;
}

export default `
# EXEMPLOS ROTULADOS PELA EQUIPE CLÍNICA
(descrição da foto → rótulo correto)
${CASOS.map(formatar).join('\n')}
`.trim();
