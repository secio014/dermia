import { useCallback, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { palette } from '@/constants/Colors';
import {
  atualizarConsulta,
  excluirConsulta,
  obterConsulta,
  STATUS_CONSULTA,
  type ConsultaComPaciente,
  type StatusConsulta,
} from '@/.lib/agenda';

export default function DetalheConsulta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [consulta, setConsulta] = useState<ConsultaComPaciente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setConsulta(await obterConsulta(id));
    setCarregando(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function mudarStatus(status: StatusConsulta) {
    const { error } = await atualizarConsulta(id, { status });
    if (error) setErro(error);
    else carregar();
  }

  async function excluir() {
    const { error } = await excluirConsulta(id);
    if (error) setErro(error);
    else router.back();
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  if (!consulta) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-secundario text-center">Consulta não encontrada.</Text>
      </View>
    );
  }

  const inicio = new Date(consulta.inicio_em);

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-2xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-texto text-xl font-bold mb-1">
        {consulta.paciente?.nome_completo ?? consulta.paciente?.codigo_pseudonimo ?? 'Consulta'}
      </Text>
      <Text className="text-secundario mb-4">
        {inicio.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} ·{' '}
        {inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
        {consulta.duracao_min} min
      </Text>

      {consulta.motivo ? (
        <View className="bg-superficie border border-borda rounded-xl p-4 mb-3">
          <Text className="text-secundario text-xs mb-1">Motivo</Text>
          <Text className="text-texto">{consulta.motivo}</Text>
        </View>
      ) : null}

      {consulta.observacoes ? (
        <View className="bg-superficie border border-borda rounded-xl p-4 mb-3">
          <Text className="text-secundario text-xs mb-1">Observações</Text>
          <Text className="text-texto">{consulta.observacoes}</Text>
        </View>
      ) : null}

      <Text className="text-secundario text-xs font-semibold mb-2 mt-2">STATUS</Text>
      <View className="flex-row flex-wrap gap-2 mb-6">
        {STATUS_CONSULTA.map((s) => {
          const ativo = consulta.status === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => mudarStatus(s.id)}
              className={`rounded-full px-4 py-2 border ${
                ativo ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
              }`}>
              <Text
                className={`text-xs font-semibold ${ativo ? 'text-white' : 'text-secundario'}`}>
                {s.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={() => router.push(`/consulta/nova?pacienteId=${consulta.paciente_id}`)}
        className="bg-superficie border border-primaria rounded-xl py-3 items-center mb-3">
        <Text className="text-primaria font-semibold">Nova consulta para este paciente</Text>
      </Pressable>

      <Pressable onPress={excluir} className="py-3 items-center">
        <Text className="text-risco font-semibold">Excluir consulta</Text>
      </Pressable>
    </ScrollView>
  );
}
