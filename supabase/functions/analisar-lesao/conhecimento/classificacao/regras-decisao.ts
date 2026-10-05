// Skill: passo a passo de raciocínio e calibração da confiança.

export default `
# COMO DECIDIR (siga nesta ordem)
1. A foto é adequada? Se não, responda o formato de imagem inadequada.
2. Fase: "aguda" (ferida aberta, bolha, crosta, pele recém-lesada) ou
   "cicatricial" (pele fechada com cicatriz, relevo, mancha, enxerto).
3. Liste os achados visíveis (só os da lista permitida).
4. Grau:
   - pistas de 3º grau (enxerto em malha, deformidade, granulação extensa,
     pele carbonizada/couro) → "3";
   - ferida aberta profunda ou cicatrização lenta com crostas → "2_profundo";
   - eritema úmido, bolha, erosões rasas → "2_superficial";
   - só vermelhidão com pele íntegra → "1";
   - cicatriz madura sem pista do grau original → "indeterminado";
   - graus claramente diferentes na mesma foto → "misto".
5. Confiança (0 a 1):
   - 0.8–0.95: sinais típicos, foto nítida, sem dúvida entre graus;
   - 0.5–0.75: sinais presentes mas foto de tela/borrada ou dúvida entre
     graus vizinhos (ex.: 2 superficial x 2 profundo);
   - abaixo de 0.5: muita incerteza — prefira "indeterminado".
   Nunca use 1.0.
6. Observação: 1–2 frases objetivas em português citando o que você VIU
   (cor, relevo, bordas, local do corpo) que justifica a resposta.

Área doadora e régua não definem o grau. Hiperemia sozinha não é 1º grau
se a pele tem relevo de cicatriz — aí é fase cicatricial.
`.trim();
