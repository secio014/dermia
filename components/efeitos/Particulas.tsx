import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { DRIVER_NATIVO, useMovimentoReduzido } from './movimento';

// Partículas suaves flutuando de baixo pra cima. Poucas (padrão 10), só
// opacidade + translate (animáveis no driver nativo) — custo baixo.

type Particula = { x: number; tamanho: number; duracao: number; atraso: number };

function gerar(qtd: number): Particula[] {
  return Array.from({ length: qtd }, (_, i) => ({
    x: (i + 0.5) / qtd + (Math.random() - 0.5) * 0.08,
    tamanho: 4 + Math.random() * 6,
    duracao: 7000 + Math.random() * 6000,
    atraso: Math.random() * 6000,
  }));
}

function Ponto({ p, cor, altura }: { p: Particula; cor: string; altura: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: p.duracao,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: DRIVER_NATIVO,
      })
    );
    const timer = setTimeout(() => loop.start(), p.atraso);
    return () => {
      clearTimeout(timer);
      loop.stop();
    };
  }, [t, p]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${p.x * 100}%`,
        bottom: -12,
        width: p.tamanho,
        height: p.tamanho,
        borderRadius: p.tamanho / 2,
        backgroundColor: cor,
        opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.55, 0.35, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -altura] }) },
          { translateX: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10, -6] }) },
        ],
      }}
    />
  );
}

export default function Particulas({
  cor,
  quantidade = 10,
  altura = 520,
}: {
  cor: string;
  quantidade?: number;
  altura?: number;
}) {
  const reduzido = useMovimentoReduzido();
  const particulas = useMemo(() => gerar(quantidade), [quantidade]);
  if (reduzido) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {particulas.map((p, i) => (
        <Ponto key={i} p={p} cor={cor} altura={altura} />
      ))}
    </View>
  );
}
