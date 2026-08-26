import { useCallback, useMemo, useState } from 'react';
import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import GraficoEvolucao, { type PontoEvolucao } from '@/components/GraficoEvolucao';
import { supabase } from '@/.lib/supabase';

type Adm = {
  articulacao: string;
  movimento: string;
  grau_ativo: number;
  grau_passivo: number;
  referencia?: number;
};

type Registro = {
  id: string;
  adm: Adm[];
  descricao: string | null;
  dor_eva: number | null;
  data_atendimento: string;
};

export default function EvolucaoLesao() {
  const { id, lesaoId } = useLocalSearchParams<{ id: string; lesaoId: string }>();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('registros_evolucao')
      .select('id, adm, descricao, dor_eva, data_atendimento')
      .eq('lesao_id', lesaoId)
      .order('data_atendimento', { ascending: true });
    setRegistros((data as Registro[]) ?? []);
    setCarregando(false);
  }, [lesaoId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const combinacoes = useMemo(() => {
    const chaves = new Set<string>();
    registros.forEach((r) => r.adm.forEach((g) => chaves.add(`${g.articulacao} — ${g.movimento}`)));
    return Array.from(chaves);
  }, [registros]);

  const chaveAtiva = filtro ?? combinacoes[0] ?? null;

  const pontos: PontoEvolucao[] = useMemo(() => {
    if (!chaveAtiva) return [];
    return registros
      .map((r) => {
        const medida = r.adm.find((g) => `${g.articulacao} — ${g.movimento}` === chaveAtiva);
        if (!medida) return null;
        return {
          data: r.data_atendimento,
          grauAtivo: medida.grau_ativo,
          grauPassivo: medida.grau_passivo,
        };
      })
      .filter((p): p is PontoEvolucao => p !== null);
  }, [registros, chaveAtiva]);

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color="#0E5FD8" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-fundo px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-texto text-lg font-bold mb-3">Evolução da lesão</Text>

      {combinacoes.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-3">
          {combinacoes.map((c) => (
            <Pressable
              key={c}
              onPress={() => setFiltro(c)}
              className={`px-3 py-1.5 rounded-lg border ${
                c === chaveAtiva ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
              }`}>
              <Text className={c === chaveAtiva ? 'text-superficie text-xs' : 'text-secundario text-xs'}>
                {c}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <GraficoEvolucao pontos={pontos} />

      <Text className="text-texto font-semibold mt-6 mb-2">Registros</Text>
      {registros.length === 0 ? (
        <Text className="text-secundario mb-4">Nenhum registro de evolução ainda.</Text>
      ) : (
        [...registros].reverse().map((r) => (
          <View key={r.id} className="bg-superficie border border-borda rounded-xl p-4 mb-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-texto font-semibold">
                {new Date(r.data_atendimento).toLocaleDateString('pt-BR')}
              </Text>
              {r.dor_eva != null && (
                <Text className="text-secundario text-xs">Dor (EVA): {r.dor_eva}/10</Text>
              )}
            </View>
            {r.adm.map((g, i) => (
              <Text key={i} className="text-secundario text-xs">
                {g.articulacao} · {g.movimento}: ativo {g.grau_ativo}° / passivo {g.grau_passivo}°
                {g.referencia ? ` (ref. ${g.referencia}°)` : ''}
              </Text>
            ))}
            {r.descricao && <Text className="text-secundario text-xs mt-1">{r.descricao}</Text>}
          </View>
        ))
      )}

      <Link href={`/paciente/${id}/lesao/${lesaoId}/registro/novo`} asChild>
        <Pressable className="bg-primaria rounded-xl py-3 items-center mt-2">
          <Text className="text-superficie font-semibold">+ Novo registro</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
