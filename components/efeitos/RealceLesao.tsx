import { useEffect, useId, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { DRIVER_NATIVO, useMovimentoReduzido } from './movimento';

// Tom pêssego suave: acolhedor, não clínico/alarmante (evita o vermelho do
// tema sobre uma lesão que já é vermelha).
export const COR_ACOLHEDORA = '#FFD3C2';

/**
 * Realça a área central (onde a lesão deve ficar): as bordas da imagem ganham
 * um véu quente e difuso, o centro fica limpo, e uma moldura suave "respira"
 * devagar. É só sobreposição visual — não altera a foto enviada.
 */
export default function RealceLesao({
  tamanho = '72%',
  veu = 0.42,
  pulsar = true,
}: {
  /** Largura da área realçada, relativa ao contêiner. */
  tamanho?: `${number}%`;
  /** Intensidade do véu nas bordas (0–1). */
  veu?: number;
  pulsar?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const reduzido = useMovimentoReduzido();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulsar || reduzido) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: DRIVER_NATIVO }),
        Animated.timing(t, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: DRIVER_NATIVO }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, pulsar, reduzido]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`veu${id}`} cx="50%" cy="50%" rx="62%" ry="62%">
            <Stop offset="0.45" stopColor={COR_ACOLHEDORA} stopOpacity={0} />
            <Stop offset="0.8" stopColor={COR_ACOLHEDORA} stopOpacity={veu * 0.6} />
            <Stop offset="1" stopColor="#E8A898" stopOpacity={veu} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#veu${id})`} />
      </Svg>

      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {/* halo difuso */}
        <Animated.View
          style={{
            position: 'absolute',
            width: tamanho,
            aspectRatio: 1,
            borderRadius: 28,
            borderWidth: 10,
            borderColor: COR_ACOLHEDORA,
            opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.32] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }],
          }}
        />
        {/* moldura */}
        <View
          style={{
            width: tamanho,
            aspectRatio: 1,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: 'rgba(255,240,234,0.95)',
          }}
        />
      </View>
    </View>
  );
}
