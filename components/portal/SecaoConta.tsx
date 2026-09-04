import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import EditarMeusDados from '@/components/portal/EditarMeusDados';
import AlterarSenha from '@/components/ui/AlterarSenha';
import { supabase } from '@/.lib/supabase';

// Aba "Conta" do portal do paciente: ver/editar os próprios dados, trocar a
// senha do primeiro acesso e sair.
export default function SecaoConta() {
  return (
    <View>
      <View className="bg-superficie border border-borda rounded-xl mb-4">
        <EditarMeusDados />
      </View>

      <View className="bg-superficie border border-borda rounded-xl mb-4">
        <AlterarSenha />
      </View>

      <Pressable
        onPress={async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        }}
        className="border border-borda rounded-xl py-3 items-center">
        <Text className="text-risco font-semibold">Sair da conta</Text>
      </Pressable>
    </View>
  );
}
