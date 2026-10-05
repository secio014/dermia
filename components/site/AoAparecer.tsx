import type { ReactNode } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

import { ESTILO_SENTINELA, useRevelar } from './useRevelar';

/**
 * Envolve um bloco da landing e faz ele surgir com fade + leve subida quando
 * entra na tela (rolagem). `delay` (ms) escalona os itens de uma mesma seção.
 *
 * Layout fica no `style` — quem chama passa flex/alinhamento via `style` e
 * deixa as classes nos <View>/<Text> filhos.
 */
export default function AoAparecer({
  children,
  delay = 0,
  distancia = 18,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distancia?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { t, sentinela } = useRevelar(delay);

  return (
    <Animated.View
      style={[
        {
          opacity: t,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distancia, 0] }) }],
        },
        style,
      ]}>
      <View ref={sentinela} pointerEvents="none" style={ESTILO_SENTINELA} />
      {children}
    </Animated.View>
  );
}
