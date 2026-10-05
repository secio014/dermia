import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform } from 'react-native';
import { cssInterop } from 'nativewind';

// O NativeWind não liga `className` no Animated.View por padrão — sem isto,
// classes de layout (flex-row, self-end, gap…) passadas aos efeitos animados
// são ignoradas e o conteúdo "estica" na largura toda.
cssInterop(Animated.View, { className: 'style' });

// O driver nativo do Animated não existe na web (cai pro JS com aviso).
export const DRIVER_NATIVO = Platform.OS !== 'web';

/**
 * true quando o usuário pediu "reduzir movimento" no sistema. Os efeitos
 * decorativos (partículas, pulso, deslize) desligam nesse caso — só ficam as
 * mudanças de opacidade, que não causam desconforto.
 */
export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    let vivo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => vivo && setReduzido(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzido);
    return () => {
      vivo = false;
      sub?.remove?.();
    };
  }, []);
  return reduzido;
}
