import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';

import { useTema } from '@/.lib/tema';

/**
 * Cartão decorativo da landing. Entra com fade/subida ao montar (`delay` em ms)
 * e, no web, reage ao hover: sobe alguns pixels, ganha sombra e acende a borda.
 * O Pressable externo só capta o hover (react-native-web) — não é clicável.
 */
export default function CartaoHover({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { cores } = useTema();
  const entrada = useRef(new Animated.Value(0)).current;
  const hover = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(entrada, {
      toValue: 1,
      duration: 460,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [entrada, delay]);

  function animarHover(para: number) {
    Animated.timing(hover, { toValue: para, duration: 170, useNativeDriver: false }).start();
  }

  return (
    <Pressable
      focusable={false}
      onHoverIn={() => animarHover(1)}
      onHoverOut={() => animarHover(0)}
      style={{ alignSelf: 'stretch', flexGrow: 1 }}>
      <Animated.View
        style={{
          alignSelf: 'stretch',
          flexGrow: 1,
          opacity: entrada,
          transform: [
            { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { translateY: hover.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
          ],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: hover.interpolate({ inputRange: [0, 1], outputRange: [4, 18] }),
          shadowOpacity: hover.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.12] }),
          borderRadius: 16,
          borderWidth: 1,
          borderColor: hover.interpolate({
            inputRange: [0, 1],
            outputRange: [cores.borda, cores.primaria],
          }),
          backgroundColor: cores.fundo,
        }}>
        <View className={className}>{children}</View>
      </Animated.View>
    </Pressable>
  );
}
