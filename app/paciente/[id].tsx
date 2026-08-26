import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { GRAUS_CLINICOS } from '@/.lib/scq';
import { supabase } from '@/.lib/supabase';

type Paciente = { id: string; nome_completo: string; codigo_pseudonimo: string };
type Lesao = {
  id: string;
  scq_percentual: number | null;
  scq_tabela: string | null;
  grau_clinico: string | null;
  status: string;
  data_ocorrencia: string | null;
  regiao_corporal: string;
};

function rotuloGrau(grau: string | null): string {
  return GRAUS_CLINICOS.find((g) => g.id === grau)?.rotulo ?? 'Grau não informado';
}

export default function DetalhePaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [lesoes, setLesoes] = useState<Lesao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase.from('pacientes').select('id, nome_completo, codigo_pseudonimo').eq('id', id).single(),
      supabase
        .from('lesoes')
        .select('id, scq_percentual, scq_tabela, grau_clinico, status, data_ocorrencia, regiao_corporal')
        .eq('paciente_id', id)
        .order('data_ocorrencia', { ascending: false }),
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
      <Text className="text-texto text-xl font-bold mb-1">{paciente?.nome_completo}</Text>
      <Text className="text-secundario mb-6">{paciente?.codigo_pseudonimo}</Text>

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
                  {item.data_ocorrencia
                    ? new Date(item.data_ocorrencia).toLocaleDateString('pt-BR')
                    : 'Data não informada'}
                </Text>
                <Text className="text-secundario text-xs">
                  {item.scq_tabela === 'wallace_pediatrico' ? 'Pediátrico' : 'Adulto'}
                </Text>
              </View>
              <Text className="text-secundario">
                {item.regiao_corporal} · SCQ {item.scq_percentual ?? 0}% · {rotuloGrau(item.grau_clinico)}
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
