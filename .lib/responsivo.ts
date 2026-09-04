import { Platform, useWindowDimensions } from 'react-native';

// Ponto onde a web passa a ter espaço para layouts de mais de uma coluna.
// Igual ao usado no WebShell / (tabs)/_layout.
export const LARGURA_WEB = 768;

// Bloco de conteúdo na web: centralizado, com um teto largo para aproveitar
// monitores grandes sem esticar o texto de ponta a ponta, e um recuo lateral
// que respira. Usado pela landing (header, seções, rodapé) e pelo WebShell.
export const LARGURA_CONTEUDO = 1400;
export const RECUO_CONTEUDO = 40;

/**
 * `true` só na web quando a janela é larga o bastante para dividir a tela em
 * colunas. No app (iOS/Android) é sempre `false` — as telas seguem empilhadas.
 */
export function useLargo(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= LARGURA_WEB;
}
