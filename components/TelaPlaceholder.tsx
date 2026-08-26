import { Text, View } from 'react-native';

export default function TelaPlaceholder({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao: string;
}) {
  return (
    <View className="flex-1 bg-fundo items-center justify-center px-8">
      <Text className="text-texto text-xl font-bold mb-2 text-center">{titulo}</Text>
      <Text className="text-secundario text-center">{descricao}</Text>
    </View>
  );
}
