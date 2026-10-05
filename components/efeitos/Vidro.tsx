import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTema } from '@/.lib/tema';

/**
 * Painel "vidro fosco": na web usa backdrop-filter (desfoque real do que está
 * atrás); no app nativo, sem módulo de blur instalado, cai num fundo
 * translúcido — mesmo visual geral, sem custo de performance.
 *
 * tom "auto" (padrão) segue o tema claro/escuro do app. "escuro" é fixo —
 * pra controles sobre a imagem da câmera.
 */
export default function Vidro({
  children,
  tom = 'auto',
  style,
  className,
}: {
  children: ReactNode;
  tom?: 'auto' | 'claro' | 'escuro';
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  const { esquema } = useTema();
  const escuro = tom === 'escuro' || (tom === 'auto' && esquema === 'dark');
  // Na câmera (tom "escuro" fixo) o fundo é a foto; no app escuro é o tema.
  const base = tom === 'escuro' ? '20,10,10' : escuro ? '36,20,19' : '255,255,255';
  const alfa = Platform.OS === 'web' ? (escuro ? 0.55 : 0.6) : escuro ? 0.82 : 0.88;
  const borda = escuro ? 'rgba(255,255,255,0.08)' : 'rgba(200,30,58,0.10)';
  const web =
    Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(14px) saturate(1.1)', WebkitBackdropFilter: 'blur(14px) saturate(1.1)' } as object)
      : null;

  return (
    <View
      className={className}
      style={[{ backgroundColor: `rgba(${base},${alfa})`, borderWidth: 1, borderColor: borda }, web, style]}>
      {children}
    </View>
  );
}
