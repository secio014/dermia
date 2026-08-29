import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { limparAviso, useAviso } from '@/.lib/aviso';
import { useTema } from '@/.lib/tema';

const ICONE = {
  ok: 'checkmark-circle',
  erro: 'alert-circle',
  info: 'information-circle',
} as const;

const DURACAO = 2800;

/**
 * Toast global de ações concluídas. Montado uma única vez no _layout, sobre a
 * navegação. Aparece embaixo, some sozinho ou ao toque.
 */
export default function Aviso() {
  const aviso = useAviso();
  const { cores } = useTema();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!aviso) return;
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(
        ({ finished }) => finished && limparAviso()
      );
    }, DURACAO);
    return () => clearTimeout(t);
  }, [aviso, anim]);

  if (!aviso) return null;

  const cor =
    aviso.tom === 'erro' ? cores.risco : aviso.tom === 'info' ? cores.primaria : cores.ok;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 28,
        alignItems: 'center',
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        ],
      }}>
      <Pressable
        onPress={limparAviso}
        style={{
          borderColor: cor,
          maxWidth: 460,
          boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
          elevation: 4,
        }}
        className="bg-superficie border rounded-xl px-4 py-3 mx-4 flex-row items-center gap-2">
        <Ionicons name={ICONE[aviso.tom]} size={18} color={cor} />
        <Text style={{ color: cor }} className="font-semibold text-sm flex-shrink">
          {aviso.texto}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
