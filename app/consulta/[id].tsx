import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';

import { palette } from '@/constants/Colors';
import { avisar } from '@/.lib/aviso';
import {
  atualizarConsulta,
  excluirConsulta,
  obterConsulta,
  ESTILO_STATUS,
  STATUS_CONSULTA,
  type ConsultaComPaciente,
  type StatusConsulta,
} from '@/.lib/agenda';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DetalheConsulta() {
  const { id, nova } = useLocalSearchParams<{ id: string; nova?: string }>();
  const [consulta, setConsulta] = useState<ConsultaComPaciente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<StatusConsulta | null>(null);
  const salvandoStatus = useRef(false);

  const carregar = useCallback(async () => {
    setConsulta(await obterConsulta(id));
    setCarregando(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  // O aviso de "status alterado" some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  async function mudarStatus(status: StatusConsulta) {
    if (!consulta || consulta.status === status || salvandoStatus.current) return;
    const anterior = consulta.status;
    salvandoStatus.current = true;
    setErro(null);
    // Atualização otimista: a UI muda na hora, sem esperar o servidor.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setConsulta({ ...consulta, status });
    setAviso(status);
    const { error } = await atualizarConsulta(id, { status });
    salvandoStatus.current = false;
    if (error) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setConsulta((c) => (c ? { ...c, status: anterior } : c));
      setAviso(null);
      setErro(error);
    }
  }

  async function excluir() {
    const { error } = await excluirConsulta(id);
    if (error) setErro(error);
    else {
      avisar('Consulta excluída.');
      router.back();
    }
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
      contentContainerClassName="w-full max-w-3xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      {nova === '1' && (
        <View className="bg-superficie border border-ok rounded-xl p-3 mb-4 flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={18} color={palette.ok} />
          <Text className="text-ok font-semibold text-sm">Consulta agendada com sucesso.</Text>
        </View>
      )}

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
      <View className="flex-row flex-wrap gap-2 mb-3">
        {STATUS_CONSULTA.map((s) => {
          const est = ESTILO_STATUS[s.id];
          const ativo = consulta.status === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => mudarStatus(s.id)}
              style={{
                backgroundColor: ativo ? est.cor : palette.superficie,
                borderColor: est.cor,
              }}
              className="rounded-full px-4 py-2 border flex-row items-center gap-1.5">
              {!ativo && (
                <View
                  style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: est.cor }}
                />
              )}
              <Text
                style={{
                  color: ativo ? '#fff' : est.cor,
                  textDecorationLine: est.riscado ? 'line-through' : 'none',
                }}
                className="text-xs font-semibold">
                {s.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {aviso && (
        <View
          style={{ borderColor: ESTILO_STATUS[aviso].cor }}
          className="bg-superficie border rounded-xl p-3 mb-4 flex-row items-center gap-2">
          <Ionicons name="checkmark-circle" size={16} color={ESTILO_STATUS[aviso].cor} />
          <Text
            style={{ color: ESTILO_STATUS[aviso].cor }}
            className="font-semibold text-sm">
            Status alterado para "{ESTILO_STATUS[aviso].rotulo}".
          </Text>
        </View>
      )}

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
