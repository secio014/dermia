import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, Text, View } from 'react-native';

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
    <View className="border-t border-borda bg-superficie px-6 py-3 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View className="w-5 h-5 rounded-md bg-primaria items-center justify-center">
          <Ionicons name="pulse" size={12} color="#fff" />
        </View>
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
  );
}
