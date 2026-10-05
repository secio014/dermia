import { useEffect, useId, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { DRIVER_NATIVO, useMovimentoReduzido } from './movimento';

/**
 * Fundo com manchas de luz difusas que derivam bem devagar — tira o aspecto
 * "chapado" sem custar nada: dois gradientes SVG estáticos, só o contêiner
 * se move (transform no driver nativo).
 */
export default function Aurora({ cor, intensidade = 0.18 }: { cor: string; intensidade?: number }) {
  const id = useId().replace(/:/g, '');
  const reduzido = useMovimentoReduzido();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduzido) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: DRIVER_NATIVO }),
        Animated.timing(t, { toValue: 0, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: DRIVER_NATIVO }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, reduzido]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.View
        style={{
          position: 'absolute',
          top: '-30%',
          left: '-20%',
          width: '140%',
          height: '160%',
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-30, 40] }) },
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, 30] }) },
          ],
        }}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={`a${id}`} cx="38%" cy="28%" rx="20%" ry="18%">
              <Stop offset="0" stopColor={cor} stopOpacity={intensidade} />
              <Stop offset="1" stopColor={cor} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`b${id}`} cx="64%" cy="66%" rx="18%" ry="18%">
              <Stop offset="0" stopColor="#FFB49A" stopOpacity={intensidade * 0.7} />
              <Stop offset="1" stopColor="#FFB49A" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#a${id})`} />
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#b${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}
