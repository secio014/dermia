import Constants from 'expo-constants';
import { Linking, Pressable, Text, View } from 'react-native';

import LogoDermia from '@/components/ui/LogoDermia';
import { LARGURA_CONTEUDO } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';

/**
 * Rodapé fino da área de conteúdo na web (só aparece no layout de barra lateral,
 * que já é exclusivo de web larga). Marca + versão + ano.
 */
export default function WebFooter() {
  const { cores } = useTema();
  const versao = Constants.expoConfig?.version ?? '1.0.0';
  const ano = new Date().getFullYear();

  return (
    <View className="border-t border-borda bg-superficie" style={{ alignItems: 'center' }}>
      <View
        className="w-full px-6 py-3 flex-row items-center justify-between"
        style={{ maxWidth: LARGURA_CONTEUDO }}>
        <View className="flex-row items-center gap-2">
          <LogoDermia size={16} />
          <Text className="text-secundario text-xs">
            DermIA · acompanhamento clínico de queimaduras
          </Text>
        </View>

        <View className="flex-row items-center gap-4">
          <Pressable onPress={() => Linking.openURL('mailto:suporte@dermia.app')}>
            <Text className="text-secundario text-xs">Suporte</Text>
          </Pressable>
          <Text className="text-secundario text-xs">v{versao}</Text>
          <Text className="text-secundario text-xs">© {ano}</Text>
        </View>
      </View>
    </View>
  );
}
