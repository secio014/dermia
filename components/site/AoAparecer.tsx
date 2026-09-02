import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Envolve um bloco da landing e faz ele surgir com fade + leve subida ao montar.
 * `delay` (ms) escalona as seções para uma entrada em cascata.
 *
 * Layout fica no `style` (não em className) — o NativeWind não aplica className
 * em `Animated.View` neste projeto, então quem chama passa flex/alinhamento via
 * `style` e deixa as classes nos <View>/<Text> filhos.
 */
export default function AoAparecer({
  children,
  delay = 0,
  distancia = 16,
  style,
}: {
  children: ReactNode;
  delay?: number;
  distancia?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 460,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [t, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distancia, 0] }) },
          ],
        },
        style,
      ]}>
      {children}
    </Animated.View>
  );
}
