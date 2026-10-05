import { Platform, useWindowDimensions } from 'react-native';

// Ponto onde a web passa a ter espaço para layouts de mais de uma coluna.
// Igual ao usado no WebShell / (tabs)/_layout.
export const LARGURA_WEB = 768;

// Bloco de conteúdo na web: centralizado, com um teto largo para aproveitar
// monitores grandes sem esticar o texto de ponta a ponta, e um recuo lateral
// que respira. Usado pela landing (header, seções, rodapé) e pelo WebShell.
export const LARGURA_CONTEUDO = 1920;
export const RECUO_CONTEUDO = 40;

/**
 * `true` só na web quando a janela é larga o bastante para dividir a tela em
 * colunas. No app (iOS/Android) é sempre `false` — as telas seguem empilhadas.
 */
export function useLargo(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= LARGURA_WEB;
}

/**
 * Quantas colunas cabem pra grades de cartões (lista de pacientes,
 * sugestões etc.): 1 no celular/janela estreita, 2 em telas médias e 3+ em
 * monitores largos. Use com `larguraColuna(colunas)` em cada item.
 */
export function useColunas(maximo = 3): number {
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 900) return 1;
  if (width < 1400 || maximo === 2) return 2;
  if (width < 2000 || maximo === 3) return 3;
  return maximo;
}

/** Largura de um item numa grade com `gap` de 12px (flex-wrap). */
export function larguraColuna(colunas: number): `${number}%` | '100%' {
  if (colunas <= 1) return '100%';
  // desconta o gap pra não quebrar a linha
  return `${(100 / colunas) - 1.2}%` as `${number}%`;
}
