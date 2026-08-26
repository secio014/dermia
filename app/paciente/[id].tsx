import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { supabase } from '@/.lib/supabase';

type Paciente = { id: string; nome: string; codigo: string };
type Lesao = {
  id: string;
  scq_percentual: number;
  pediatrico: boolean;
  data_lesao: string;
  regioes_marcadas: string[];
};

export default function DetalhePaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [lesoes, setLesoes] = useState<Lesao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from('pacientes').select('id, nome, codigo').eq('id', id).single(),
      supabase
        .from('lesoes')
        .select('id, scq_percentual, pediatrico, data_lesao, regioes_marcadas')
        .eq('paciente_id', id)
        .order('data_lesao', { ascending: false }),
    ]);
    setPaciente(p);
    setLesoes(l ?? []);
    setCarregando(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color="#0E5FD8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-fundo px-4 pt-4">
      <Text className="text-texto text-xl font-bold mb-1">{paciente?.nome}</Text>
      <Text className="text-secundario mb-6">{paciente?.codigo}</Text>

      <Text className="text-texto font-semibold mb-2">Lesões</Text>

      {lesoes.length === 0 ? (
        <Text className="text-secundario mb-6">Nenhuma lesão registrada ainda.</Text>
      ) : (
        <FlatList
          className="mb-4"
          data={lesoes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/paciente/${id}/lesao/${item.id}`)}
              className="bg-superficie border border-borda rounded-xl p-4 mb-3">
              <View className="flex-row justify-between mb-1">
                <Text className="text-texto font-semibold">
                  {new Date(item.data_lesao).toLocaleDateString('pt-BR')}
                </Text>
                <Text className="text-secundario text-xs">
                  {item.pediatrico ? 'Pediátrico' : 'Adulto'}
                </Text>
              </View>
              <Text className="text-secundario">
                SCQ {item.scq_percentual}% · {item.regioes_marcadas.length}{' '}
                {item.regioes_marcadas.length === 1 ? 'região' : 'regiões'}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Link href={`/paciente/${id}/lesao/novo`} asChild>
        <Pressable className="bg-primaria rounded-xl py-3 items-center mb-8">
          <Text className="text-superficie font-semibold">+ Nova lesão</Text>
        </Pressable>
      </Link>
    </View>
  );
}
