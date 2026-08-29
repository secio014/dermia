import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { palette } from '@/constants/Colors';
import { supabase } from '@/.lib/supabase';

type Adesao = { exercicio_id: string; adesao_percentual: number | null; execucoes_30d: number | null };

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View className="flex-row justify-between py-2 border-b border-borda">
      <Text className="text-secundario">{rotulo}</Text>
      <Text className="text-texto font-semibold">{valor}</Text>
    </View>
  );
}

export default function SecaoEvolucao({
  pacienteId,
  desde,
}: {
  pacienteId: string;
  desde: string | null;
}) {
  const [adesoes, setAdesoes] = useState<Adesao[]>([]);
  const [execs7d, setExecs7d] = useState(0);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const seteDias = new Date();
    seteDias.setDate(seteDias.getDate() - 7);
    const [{ data: a }, { count }] = await Promise.all([
      supabase
        .from('vw_adesao_exercicios')
        .select('exercicio_id, adesao_percentual, execucoes_30d')
        .eq('paciente_id', pacienteId),
      supabase
        .from('execucoes_exercicio')
        .select('id', { count: 'exact', head: true })
        .gte('data', seteDias.toISOString().slice(0, 10)),
    ]);
    setAdesoes((a as Adesao[]) ?? []);
    setExecs7d(count ?? 0);
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

  const diasAcompanhamento = desde
    ? Math.max(0, Math.floor((Date.now() - new Date(desde).getTime()) / 86400000))
    : null;
  const comAdesao = adesoes.filter((x) => x.adesao_percentual != null);
  const adesaoMedia = comAdesao.length
    ? Math.round(comAdesao.reduce((s, x) => s + (x.adesao_percentual ?? 0), 0) / comAdesao.length)
    : null;

  return (
    <View>
      <View className="bg-superficie border border-borda rounded-2xl p-4 mb-4">
        <Text className="text-secundario text-xs mb-1">Em acompanhamento há</Text>
        <Text className="text-texto text-3xl font-bold">
          {diasAcompanhamento != null ? `${diasAcompanhamento} dias` : '—'}
        </Text>
      </View>

      <View className="bg-superficie border border-borda rounded-2xl px-4 py-1 mb-4">
        <Linha
          rotulo="Adesão média aos exercícios"
          valor={adesaoMedia != null ? `${adesaoMedia}%` : '—'}
        />
        <Linha rotulo="Exercícios feitos nos últimos 7 dias" valor={String(execs7d)} />
        <Linha rotulo="Exercícios prescritos" valor={String(adesoes.length)} />
      </View>

      <Text className="text-secundario text-xs">
        Continue marcando seus exercícios como feitos — é assim que sua equipe acompanha
        sua evolução entre as consultas.
      </Text>
    </View>
  );
}
