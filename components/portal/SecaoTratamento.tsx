import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Linking, Text, View } from 'react-native';

import { palette } from '@/constants/Colors';
import { useTema } from '@/.lib/tema';
import { proximaConsulta, type Consulta } from '@/.lib/agenda';
import { listarPrescricoes, type Prescricao } from '@/.lib/prescricoes';
import { supabase } from '@/.lib/supabase';

type Exercicio = {
  id: string;
  titulo: string;
  frequencia_semanal: number | null;
  video_url: string | null;
};

export default function SecaoTratamento({ pacienteId }: { pacienteId: string }) {
  const { cores } = useTema();
  const [proxima, setProxima] = useState<Consulta | null>(null);
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const [prox, presc, { data: e }] = await Promise.all([
      proximaConsulta(pacienteId),
      listarPrescricoes(pacienteId, { somenteAtivas: true }),
      supabase
        .from('exercicios_prescritos')
        .select('id, titulo, frequencia_semanal, video_url')
        .eq('paciente_id', pacienteId)
        .eq('ativo', true),
    ]);
    setProxima(prox);
    setPrescricoes(presc);
    setExercicios((e as Exercicio[]) ?? []);
    setCarregando(false);
  }, [pacienteId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  if (carregando) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  return (
    <View>
      <View className="bg-superficie border border-borda rounded-2xl p-4 mb-4 flex-row items-center gap-3">
        <Ionicons name="calendar-outline" size={22} color={cores.primaria} />
        <View className="flex-1">
          <Text className="text-secundario text-xs">Próxima consulta</Text>
          <Text className="text-texto font-semibold">
            {proxima
              ? new Date(proxima.inicio_em).toLocaleString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Nenhuma agendada'}
          </Text>
          {proxima?.motivo ? (
            <Text className="text-secundario text-xs">{proxima.motivo}</Text>
          ) : null}
        </View>
      </View>

      <Text className="text-texto font-bold mb-2">Remédios e curativos</Text>
      {prescricoes.length === 0 ? (
        <Text className="text-secundario mb-4">Nada prescrito no momento.</Text>
      ) : (
        prescricoes.map((p) => (
          <View key={p.id} className="bg-superficie border border-borda rounded-xl p-4 mb-2">
            <Text className="text-texto font-semibold mb-1">{p.nome}</Text>
            <Text className="text-secundario text-xs">
              {[p.dose, p.frequencia].filter(Boolean).join(' · ') || 'Conforme orientação'}
            </Text>
            {p.observacoes ? (
              <Text className="text-secundario text-xs mt-1">{p.observacoes}</Text>
            ) : null}
          </View>
        ))
      )}

      <Text className="text-texto font-bold mb-2 mt-4">Exercícios do plano</Text>
      {exercicios.length === 0 ? (
        <Text className="text-secundario">Nenhum exercício no plano.</Text>
      ) : (
        exercicios.map((e) => (
          <View key={e.id} className="py-2 border-b border-borda">
            <View className="flex-row justify-between">
              <Text className="text-texto">{e.titulo}</Text>
              {e.frequencia_semanal ? (
                <Text className="text-secundario text-xs">{e.frequencia_semanal}x/sem</Text>
              ) : null}
            </View>
            {e.video_url ? (
              <Text
                onPress={() => Linking.openURL(e.video_url!)}
                className="text-primaria text-xs font-semibold mt-1">
                ▶ Ver vídeo
              </Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
