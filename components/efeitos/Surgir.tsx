import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

import { DRIVER_NATIVO, useMovimentoReduzido } from './movimento';

/**
 * Entrada suave: dissolve (opacidade) + leve deslize. Troque a `key` do
 * componente pra repetir a animação (ex.: ao passar da câmera pra prévia).
 */
export default function Surgir({
  children,
  de = 'baixo',
  duracao = 320,
  atraso = 0,
  style,
  className,
}: {
  children: ReactNode;
  de?: 'baixo' | 'direita' | 'nenhum';
  duracao?: number;
  atraso?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  const reduzido = useMovimentoReduzido();
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: duracao,
      delay: atraso,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: DRIVER_NATIVO,
    }).start();
  }, [t, duracao, atraso]);

  const distancia = reduzido || de === 'nenhum' ? 0 : 14;
  const deslize = t.interpolate({ inputRange: [0, 1], outputRange: [distancia, 0] });
  const transform =
    de === 'direita' ? [{ translateX: deslize }] : [{ translateY: deslize }];

  return (
    <Animated.View className={className} style={[{ opacity: t, transform }, style]}>
      {children}
    </Animated.View>
  );
}
