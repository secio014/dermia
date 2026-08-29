import { useCallback, useMemo, useRef, useState } from 'react';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { palette } from '@/constants/Colors';
import { obterUrlAssinada } from '@/.lib/foto';
import { type ResultadoIA } from '@/components/ValidacaoIA';
import { supabase } from '@/.lib/supabase';

type Analise = {
  id: string;
  foto_path: string;
  criado_em: string;
  resultado: ResultadoIA | null;
  confianca: number | null;
  urlAssinada?: string | null;
};

const LARGURA_COMPARADOR = 320;
const ALTURA_COMPARADOR = 320;

export default function ComparadorTemporal() {
  const { lesaoId } = useLocalSearchParams<{ id: string; lesaoId: string }>();
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [antesId, setAntesId] = useState<string | null>(null);
  const [depoisId, setDepoisId] = useState<string | null>(null);
  const [posicao, setPosicao] = useState(LARGURA_COMPARADOR / 2);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('analises_ia')
      .select('id, foto_path, criado_em, resultado, confianca')
      .eq('lesao_id', lesaoId)
      .order('criado_em', { ascending: true });

    const lista = (data as Analise[]) ?? [];
    setAnalises(lista);
    if (lista.length >= 2) {
      setAntesId((atual) => atual ?? lista[0].id);
      setDepoisId((atual) => atual ?? lista[lista.length - 1].id);
    }

    Promise.all(lista.map(async (a) => ({ id: a.id, url: await obterUrlAssinada(a.foto_path) }))).then(
      (resultados) => {
        setAnalises((atual) =>
          atual.map((a) => ({ ...a, urlAssinada: resultados.find((r) => r.id === a.id)?.url }))
        );
      }
    );
    setCarregando(false);
  }, [lesaoId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const antes = analises.find((a) => a.id === antesId);
  const depois = analises.find((a) => a.id === depoisId);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_evento, gesto) => {
          const x = Math.max(0, Math.min(LARGURA_COMPARADOR, gesto.moveX - gesto.x0 + posicao));
          setPosicao(x);
        },
      }),
    [posicao]
  );

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  if (analises.length < 2) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-secundario text-center">
          É preciso pelo menos duas fotos para comparar.
        </Text>
      </View>
    );
  }

  const deltaConfianca =
    antes?.confianca != null && depois?.confianca != null
      ? (depois.confianca - antes.confianca) * 100
      : null;

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-2xl self-center"
      contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ headerTitle: 'Derm.IA' }} />
      <Text className="text-texto text-lg font-bold mb-3">Comparador temporal</Text>

      <Text className="text-secundario text-xs mb-1">Antes</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        {analises.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => setAntesId(a.id)}
            className="w-16 h-16 mr-2 rounded-lg overflow-hidden"
            style={{
              borderWidth: antesId === a.id ? 2 : 1,
              borderColor: antesId === a.id ? palette.primaria : palette.borda,
            }}>
            {a.urlAssinada && (
              <Image source={{ uri: a.urlAssinada }} style={{ width: '100%', height: '100%' }} />
            )}
          </Pressable>
        ))}
      </ScrollView>

      <Text className="text-secundario text-xs mb-1">Depois</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {analises.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => setDepoisId(a.id)}
            className="w-16 h-16 mr-2 rounded-lg overflow-hidden"
            style={{
              borderWidth: depoisId === a.id ? 2 : 1,
              borderColor: depoisId === a.id ? palette.primaria : palette.borda,
            }}>
            {a.urlAssinada && (
              <Image source={{ uri: a.urlAssinada }} style={{ width: '100%', height: '100%' }} />
            )}
          </Pressable>
        ))}
      </ScrollView>

      {antes?.urlAssinada && depois?.urlAssinada && (
        <View
          style={{
            width: LARGURA_COMPARADOR,
            height: ALTURA_COMPARADOR,
            alignSelf: 'center',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
          <Image
            source={{ uri: depois.urlAssinada }}
            style={{ width: LARGURA_COMPARADOR, height: ALTURA_COMPARADOR, position: 'absolute' }}
            resizeMode="cover"
          />
          <View
            style={{
              width: posicao,
              height: ALTURA_COMPARADOR,
              overflow: 'hidden',
              position: 'absolute',
            }}>
            <Image
              source={{ uri: antes.urlAssinada }}
              style={{ width: LARGURA_COMPARADOR, height: ALTURA_COMPARADOR }}
              resizeMode="cover"
            />
          </View>
          <View
            {...panResponder.panHandlers}
            style={{
              position: 'absolute',
              left: posicao - 16,
              top: 0,
              width: 32,
              height: ALTURA_COMPARADOR,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View style={{ width: 2, height: '100%', backgroundColor: palette.superficie }} />
            <View
              style={{
                position: 'absolute',
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: palette.superficie,
                borderWidth: 2,
                borderColor: palette.primaria,
              }}
            />
          </View>
        </View>
      )}

      <View className="flex-row justify-between mt-4 bg-superficie border border-borda rounded-xl p-4">
        <View>
          <Text className="text-secundario text-xs">Antes</Text>
          <Text className="text-texto font-semibold">
            {antes ? new Date(antes.criado_em).toLocaleDateString('pt-BR') : '—'}
          </Text>
          <Text className="text-secundario text-xs">{antes?.resultado?.grau_sugerido ?? '—'}</Text>
        </View>
        <View className="items-end">
          <Text className="text-secundario text-xs">Depois</Text>
          <Text className="text-texto font-semibold">
            {depois ? new Date(depois.criado_em).toLocaleDateString('pt-BR') : '—'}
          </Text>
          <Text className="text-secundario text-xs">{depois?.resultado?.grau_sugerido ?? '—'}</Text>
        </View>
      </View>

      {deltaConfianca != null && (
        <Text className="text-secundario text-xs mt-2 text-center">
          Δ confiança da IA: {deltaConfianca > 0 ? '+' : ''}
          {deltaConfianca.toFixed(1)}%
        </Text>
      )}
    </ScrollView>
  );
}
