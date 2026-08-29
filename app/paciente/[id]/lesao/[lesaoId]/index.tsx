import { useCallback, useMemo, useState } from 'react';
import { Link, router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import GraficoEvolucao, { type PontoEvolucao } from '@/components/GraficoEvolucao';
import { palette } from '@/constants/Colors';
import GraficoVancouver, { type PontoVancouver } from '@/components/GraficoVancouver';
import { obterUrlAssinada } from '@/.lib/foto';
import { useLargo } from '@/.lib/responsivo';
import { supabase } from '@/.lib/supabase';
import { totalVancouver, type EscalaCicatriz } from '@/.lib/vancouver';

type Analise = {
  id: string;
  foto_path: string;
  status: string;
  criado_em: string;
  urlAssinada?: string | null;
};

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
  escala_cicatriz: EscalaCicatriz | null;
  data_atendimento: string;
};

export default function EvolucaoLesao() {
  const { id, lesaoId } = useLocalSearchParams<{ id: string; lesaoId: string }>();
  const largo = useLargo();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const [{ data: r }, { data: a }] = await Promise.all([
      supabase
        .from('registros_evolucao')
        .select('id, adm, descricao, dor_eva, escala_cicatriz, data_atendimento')
        .eq('lesao_id', lesaoId)
        .order('data_atendimento', { ascending: true }),
      supabase
        .from('analises_ia')
        .select('id, foto_path, status, criado_em')
        .eq('lesao_id', lesaoId)
        .order('criado_em', { ascending: false }),
    ]);
    setRegistros((r as Registro[]) ?? []);

    const listaAnalises = (a as Analise[]) ?? [];
    setAnalises(listaAnalises);
    Promise.all(
      listaAnalises.map(async (item) => ({ id: item.id, url: await obterUrlAssinada(item.foto_path) }))
    ).then((resultados) => {
      setAnalises((atual) =>
        atual.map((item) => ({
          ...item,
          urlAssinada: resultados.find((res) => res.id === item.id)?.url,
        }))
      );
    });

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

  const pontosVancouver: PontoVancouver[] = useMemo(
    () =>
      registros
        .filter((r) => r.escala_cicatriz !== null)
        .map((r) => ({ data: r.data_atendimento, total: totalVancouver(r.escala_cicatriz!) })),
    [registros]
  );

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  const blocoGraficos = (
    <>
      <Text className="text-texto font-semibold mb-2">Cicatriz (Vancouver)</Text>
      <View className="mb-4">
        <GraficoVancouver pontos={pontosVancouver} />
      </View>

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
    </>
  );

  const blocoRegistros = (
    <>
      <Text className="text-texto font-semibold mb-2">Registros</Text>
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
    </>
  );

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName={largo ? 'w-full max-w-5xl self-center' : undefined}
      contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ headerTitle: 'Derm.IA' }} />
      <Text className="text-texto text-lg font-bold mb-3">Evolução da lesão</Text>

      <Text className="text-texto font-semibold mb-2">Fotos</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <Link href={`/paciente/${id}/lesao/${lesaoId}/foto/nova`} asChild>
          <Pressable className="w-24 h-24 mr-3 rounded-xl border border-dashed border-borda items-center justify-center bg-superficie">
            <Text className="text-primaria text-xs font-semibold text-center">+ Nova{'\n'}foto</Text>
          </Pressable>
        </Link>
        {analises.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => router.push(`/paciente/${id}/lesao/${lesaoId}/foto/${a.id}`)}
            className="w-24 h-24 mr-3 rounded-xl overflow-hidden bg-superficie border border-borda">
            {a.urlAssinada ? (
              <Image source={{ uri: a.urlAssinada }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={palette.primaria} size="small" />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {analises.length >= 2 && (
        <Link href={`/paciente/${id}/lesao/${lesaoId}/comparar`} asChild>
          <Pressable className="bg-superficie border border-primaria rounded-xl py-2.5 items-center mb-4">
            <Text className="text-primaria font-semibold text-xs">Comparar fotos ao longo do tempo</Text>
          </Pressable>
        </Link>
      )}

      {largo ? (
        <View className="flex-row gap-6">
          <View className="flex-1">{blocoGraficos}</View>
          <View className="flex-1">{blocoRegistros}</View>
        </View>
      ) : (
        <>
          {blocoGraficos}
          <View className="mt-6" />
          {blocoRegistros}
        </>
      )}
    </ScrollView>
  );
}
