import { Platform, useWindowDimensions } from 'react-native';

// Ponto onde a web passa a ter espaço para layouts de mais de uma coluna.
// Igual ao usado no WebShell / (tabs)/_layout.
export const LARGURA_WEB = 768;

/**
 * `true` só na web quando a janela é larga o bastante para dividir a tela em
 * colunas. No app (iOS/Android) é sempre `false` — as telas seguem empilhadas.
 */
export function useLargo(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= LARGURA_WEB;
}
