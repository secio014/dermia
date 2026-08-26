import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import TelaPlaceholder from '@/components/TelaPlaceholder';

export default function TelaInicio() {
  return (
    <View className="flex-1 bg-fundo">
      <View className="flex-1">
        <TelaPlaceholder
          titulo="Painel de Pacientes"
          descricao="A lista de pacientes com prioridade, SCQ e dias desde a lesão vai aparecer aqui na Etapa 2."
        />
      </View>
      <Link href="/admin" asChild>
        <Pressable className="mx-6 mb-8 bg-superficie border border-borda rounded-xl py-3 items-center">
          <Text className="text-primaria font-semibold">Painel de Admin</Text>
        </Pressable>
      </Link>
    </View>
  );
}
