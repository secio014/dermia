import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, Linking, Pressable, Text, View } from 'react-native';

import { useTema } from '@/.lib/tema';

export type Plano = {
  nome: string;
  publico: string;
  itens: string[];
  destaque?: boolean;
};

const EMAIL_COMERCIAL = 'comercial@dermia.tech';

/**
 * Cartão de plano da landing (B2B2C). Só apresentação — preço "Sob consulta" e o
 * CTA abre um e-mail para o comercial. Entra com fade/subida (`delay` em ms) e,
 * no web, sobe + ganha sombra + acende a borda no hover.
 */
export default function CartaoPlano({ plano, delay = 0 }: { plano: Plano; delay?: number }) {
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

  function falarComVendas() {
    const assunto = encodeURIComponent(`Interesse no plano ${plano.nome} — DermIA`);
    Linking.openURL(`mailto:${EMAIL_COMERCIAL}?subject=${assunto}`);
  }

  const corBordaBase = plano.destaque ? cores.primaria : cores.borda;

  return (
    <Animated.View
      style={{
        alignSelf: 'stretch',
        flexGrow: 1,
        opacity: entrada,
        transform: [
          {
            translateY: Animated.add(
              entrada.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              hover.interpolate({ inputRange: [0, 1], outputRange: [0, -8] })
            ),
          },
          { scale: hover.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) },
        ],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: hover.interpolate({ inputRange: [0, 1], outputRange: [6, 24] }),
        shadowOpacity: hover.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.16] }),
        borderRadius: 16,
        borderWidth: 1,
        borderColor: hover.interpolate({
          inputRange: [0, 1],
          outputRange: [corBordaBase, cores.primaria],
        }),
        backgroundColor: cores.superficie,
      }}>
      <Pressable
        onPress={falarComVendas}
        onHoverIn={() => animarHover(1)}
        onHoverOut={() => animarHover(0)}
        style={{ padding: 24 }}>
        {plano.destaque && (
          <Text
            className="text-primaria text-xs font-bold uppercase mb-2"
            style={{ letterSpacing: 1 }}>
            Mais escolhido
          </Text>
        )}
        <Text className="text-texto text-xl font-bold">{plano.nome}</Text>
        <Text className="text-secundario text-sm mt-1 mb-4">{plano.publico}</Text>

        <Text className="text-texto text-2xl font-bold">Sob consulta</Text>
        <Text className="text-secundario text-xs mb-4">valor conforme porte da instituição</Text>

        <View className="gap-2 mb-6">
          {plano.itens.map((item) => (
            <View key={item} className="flex-row items-start gap-2">
              <Ionicons name="checkmark-circle" size={18} color={cores.primaria} />
              <Text className="text-texto text-sm flex-1">{item}</Text>
            </View>
          ))}
        </View>

        <View
          className={`rounded-xl py-3 items-center ${
            plano.destaque ? 'bg-primaria' : 'border border-primaria'
          }`}>
          <Text className={`font-semibold ${plano.destaque ? 'text-white' : 'text-primaria'}`}>
            Falar com vendas
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
