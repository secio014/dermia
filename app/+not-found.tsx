import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function TelaNaoEncontrada() {
  return (
    <>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-texto text-lg font-semibold mb-2 text-center">
          Esta tela não existe.
        </Text>
        <Link href="/painel" className="mt-4 py-3">
          <Text className="text-primaria font-semibold">Voltar para o início</Text>
        </Link>
      </View>
    </>
  );
}
