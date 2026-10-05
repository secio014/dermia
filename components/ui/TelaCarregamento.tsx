import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Text, View } from 'react-native';

import { DRIVER_NATIVO, useMovimentoReduzido } from '@/components/efeitos/movimento';
import LogoDermia from '@/components/ui/LogoDermia';
import { palette } from '@/constants/Colors';

/**
 * Tela de carregamento com a marca: aparece enquanto a sessão é verificada e
 * a conta é encaminhada para a área certa — no lugar de "piscar" o
 * formulário de login para quem já está logado.
 */
export default function TelaCarregamento({ mensagem = 'Carregando…' }: { mensagem?: string }) {
  const reduzido = useMovimentoReduzido();
  const pulso = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduzido) return;
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: DRIVER_NATIVO,
        }),
        Animated.timing(pulso, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: DRIVER_NATIVO,
        }),
      ])
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [pulso, reduzido]);

  const escala = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacidade = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  return (
    <View
      className="flex-1 bg-fundo items-center justify-center"
      accessibilityRole="progressbar"
      accessibilityLabel={mensagem}>
      <Animated.View
        className="w-20 h-20 rounded-3xl bg-superficie border border-borda items-center justify-center mb-6"
        style={{ transform: [{ scale: escala }], opacity: opacidade }}>
        <LogoDermia size={44} />
      </Animated.View>
      <Text className="text-texto text-xl font-bold mb-4">DermIA</Text>
      <ActivityIndicator color={palette.primaria} />
      <Text className="text-secundario text-sm mt-3">{mensagem}</Text>
    </View>
  );
}
