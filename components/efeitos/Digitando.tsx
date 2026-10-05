import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { DRIVER_NATIVO, useMovimentoReduzido } from './movimento';

// Três pontinhos "pulando" em sequência — indicador de "a IA está pensando".
export default function Digitando({ cor }: { cor: string }) {
  const reduzido = useMovimentoReduzido();
  const valores = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduzido) return;
    const animacoes = valores.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(v, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: DRIVER_NATIVO }),
          Animated.timing(v, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: DRIVER_NATIVO }),
          Animated.delay((2 - i) * 140 + 200),
        ])
      )
    );
    animacoes.forEach((a) => a.start());
    return () => animacoes.forEach((a) => a.stop());
  }, [valores, reduzido]);

  return (
    <View className="flex-row items-center gap-1.5">
      {valores.map((v, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: cor,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }],
          }}
        />
      ))}
    </View>
  );
}
