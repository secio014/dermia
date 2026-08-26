import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Link, router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import PacienteCard, { type PainelPaciente } from '@/components/PacienteCard';
import { supabase } from '@/.lib/supabase';

export default function TelaInicio() {
  const [pacientes, setPacientes] = useState<PainelPaciente[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('vw_painel_pacientes')
      .select('*')
      .order('prioridade', { ascending: true });
    setPacientes((data as PainelPaciente[] | null) ?? []);
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  return (
    <View className="flex-1 bg-fundo px-4 pt-4">
      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0E5FD8" />
        </View>
      ) : pacientes.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-texto text-lg font-semibold mb-2 text-center">
            Nenhum paciente com lesão ativa
          </Text>
          <Text className="text-secundario text-center">
            Toque em "Novo paciente" para cadastrar o primeiro.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pacientes}
          keyExtractor={(item) => item.paciente_id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/paciente/${item.paciente_id}`)}>
              <PacienteCard paciente={item} />
            </Pressable>
          )}
        />
      )}

      <Link href="/paciente/novo" asChild>
        <Pressable className="bg-primaria rounded-xl py-3 items-center mb-4">
          <Text className="text-superficie font-semibold">+ Novo paciente</Text>
        </Pressable>
      </Link>
      <Link href="/admin" asChild>
        <Pressable className="bg-superficie border border-borda rounded-xl py-3 items-center mb-8">
          <Text className="text-primaria font-semibold">Painel de Admin</Text>
        </Pressable>
      </Link>
    </View>
  );
}
