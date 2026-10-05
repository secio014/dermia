import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, type View } from 'react-native';

/**
 * Anima `t` de 0→1 quando o elemento entra na tela (IntersectionObserver na
 * web). Sem observer (nativo/SSR), anima ao montar. Coloque o `sentinela`
 * num <View> absoluto de 1px dentro do bloco animado — assim mede a posição
 * sem interferir no layout.
 */
export function useRevelar(delay = 0, duracao = 520) {
  const t = useRef(new Animated.Value(0)).current;
  const sentinela = useRef<View>(null);

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    const iniciar = () => {
      anim = Animated.timing(t, {
        toValue: 1,
        duration: duracao,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      anim.start();
    };

    const no = sentinela.current as unknown as Element | null;
    if (Platform.OS !== 'web' || typeof IntersectionObserver === 'undefined' || !no) {
      iniciar();
      return () => anim?.stop();
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          iniciar();
          obs.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(no);
    return () => {
      obs.disconnect();
      anim?.stop();
    };
  }, [t, delay, duracao]);

  return { t, sentinela };
}

export const ESTILO_SENTINELA = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  width: 1,
  height: 1,
};
