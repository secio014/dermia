import type { ComponentProps, ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Text, View } from 'react-native';

import Surgir from '@/components/efeitos/Surgir';
import { useTema } from '@/.lib/tema';

/**
 * Cabeçalho padrão das telas: ícone em destaque (com brilho suave da marca),
 * título, subtítulo opcional e uma ação à direita. Entra deslizando.
 * Use no lugar do <Text text-2xl> solto — dá identidade e hierarquia a cada tela.
 */
export default function CabecalhoTela({
  icone,
  titulo,
  subtitulo,
  acao,
  className = 'mb-5',
}: {
  icone: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
  className?: string;
}) {
  const { cores } = useTema();
  const brilho =
    Platform.OS === 'web'
      ? ({
          backgroundImage: `linear-gradient(135deg, ${cores.primaria}26, ${cores.primaria}0D)`,
          boxShadow: `0 8px 22px -12px ${cores.primaria}99`,
        } as object)
      : null;

  return (
    <Surgir className={`flex-row items-center gap-3 ${className}`}>
      <View
        style={[
          {
            width: 46,
            height: 46,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: cores.primariaSuave,
            borderWidth: 1,
            borderColor: `${cores.primaria}2E`,
          },
          brilho,
        ]}>
        <Ionicons name={icone} size={22} color={cores.primaria} />
      </View>
      <View className="flex-1">
        <Text className="text-texto text-2xl font-bold" style={{ letterSpacing: -0.3 }}>
          {titulo}
        </Text>
        {!!subtitulo && <Text className="text-secundario text-sm mt-0.5">{subtitulo}</Text>}
      </View>
      {acao}
    </Surgir>
  );
}
