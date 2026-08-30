import { Pressable, Text, View } from 'react-native';

import { supabase } from '@/.lib/supabase';

/**
 * Tela de bloqueio: o usuário está autenticado, mas não pode ver o que pediu
 * (conta não vinculada à clínica, acesso desativado ou papel insuficiente).
 */
export default function SemAcesso({ mensagem }: { mensagem: string }) {
  return (
    <View className="flex-1 bg-fundo items-center justify-center px-8">
      <Text className="text-texto text-center text-base leading-6 mb-5 max-w-sm">{mensagem}</Text>
      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="border border-borda rounded-xl px-5 py-2.5">
        <Text className="text-primaria font-semibold">Sair</Text>
      </Pressable>
    </View>
  );
}
