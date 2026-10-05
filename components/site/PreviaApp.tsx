import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, Platform, Text, View } from 'react-native';

import Digitando from '@/components/efeitos/Digitando';
import { useMovimentoReduzido } from '@/components/efeitos/movimento';
import Vidro from '@/components/efeitos/Vidro';
import { useTema } from '@/.lib/tema';

// Ilustração do produto no hero: uma "janela" do app com o cartão de análise
// de IA e um trecho do chat do assistente. Flutua devagar; a barra de
// confiança e as etiquetas aparecem em sequência. Dados fictícios.

const ACHADOS = ['Hiperemia', 'Hipertrófica', 'Fase cicatricial'];

export default function PreviaApp() {
  const { cores } = useTema();
  const reduzido = useMovimentoReduzido();
  const flutuar = useRef(new Animated.Value(0)).current;
  const barra = useRef(new Animated.Value(0)).current;
  const etiquetas = useRef(ACHADOS.map(() => new Animated.Value(0))).current;
  const resposta = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacoes: Animated.CompositeAnimation[] = [];
    if (!reduzido) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(flutuar, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          Animated.timing(flutuar, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ])
      );
      loop.start();
      animacoes.push(loop);
    }
    const seq = Animated.sequence([
      Animated.delay(500),
      Animated.timing(barra, { toValue: 0.78, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.stagger(
        140,
        etiquetas.map((v) => Animated.timing(v, { toValue: 1, duration: 280, useNativeDriver: false }))
      ),
      Animated.delay(900),
      Animated.timing(resposta, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]);
    seq.start();
    animacoes.push(seq);
    return () => animacoes.forEach((a) => a.stop());
  }, [flutuar, barra, etiquetas, resposta, reduzido]);

  const sombra =
    Platform.OS === 'web'
      ? ({ boxShadow: `0 30px 80px -30px ${cores.primaria}66, 0 10px 30px -10px rgba(0,0,0,0.35)` } as object)
      : null;

  return (
    <Animated.View
      style={{
        width: '100%',
        maxWidth: 440,
        transform: [{ translateY: flutuar.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
      }}>
      <Vidro style={[{ borderRadius: 22, padding: 14 }, sombra]}>
        {/* barra da janela */}
        <View className="flex-row items-center gap-1.5 mb-3 px-1">
          {['#FF6B6B', '#FBBF24', '#34D399'].map((c) => (
            <View key={c} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c, opacity: 0.8 }} />
          ))}
          <Text className="text-secundario text-[11px] ml-2">DermIA · Análise da lesão</Text>
        </View>

        {/* cartão de análise */}
        <View className="bg-superficie border border-borda rounded-2xl p-3.5 mb-3">
          <View className="flex-row items-center gap-3 mb-3">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: '#FFD3C2' }}>
              <Ionicons name="scan-outline" size={22} color="#B3473A" />
            </View>
            <View className="flex-1">
              <Text className="text-secundario text-[11px]">Sugestão da IA · validação pendente</Text>
              <Text className="text-texto font-bold">2º grau profundo</Text>
            </View>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text className="text-secundario text-[11px]">Confiança</Text>
            <Text className="text-texto text-[11px] font-semibold">78%</Text>
          </View>
          <View className="h-2 rounded-full bg-fundo overflow-hidden mb-3">
            <Animated.View
              style={{
                height: '100%',
                borderRadius: 999,
                backgroundColor: cores.primaria,
                width: barra.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }}
            />
          </View>
          <View className="flex-row flex-wrap gap-1.5">
            {ACHADOS.map((a, i) => (
              <Animated.View
                key={a}
                style={{
                  opacity: etiquetas[i],
                  transform: [{ scale: etiquetas[i].interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                }}>
                <View className="rounded-full px-2.5 py-1 bg-primaria/10 border border-primaria/30">
                  <Text className="text-primaria text-[11px] font-semibold">{a}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* trecho do chat */}
        <View className="self-end bg-primaria rounded-2xl rounded-br-sm px-3 py-2 mb-2" style={{ maxWidth: '85%' }}>
          <Text className="text-white text-xs">Quais pacientes precisam de atenção hoje?</Text>
        </View>
        <View className="flex-row gap-2 items-start">
          <View
            className="w-6 h-6 rounded-full items-center justify-center"
            style={{ backgroundColor: cores.primariaSuave }}>
            <Ionicons name="sparkles" size={12} color={cores.primaria} />
          </View>
          <View className="flex-1 bg-superficie border border-borda rounded-2xl rounded-tl-sm px-3 py-2">
            <Animated.View style={{ position: 'absolute', left: 12, top: 10, opacity: resposta.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
              <Digitando cor={cores.primaria} />
            </Animated.View>
            <Animated.View style={{ opacity: resposta }}>
              <Text className="text-texto text-xs leading-4">
                2 pacientes críticos: um com suspeita de infecção no enxerto e outro com retração dos dedos.
              </Text>
            </Animated.View>
          </View>
        </View>
      </Vidro>
    </Animated.View>
  );
}
