import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { rotuloEtapaFeedback } from '@/.lib/feedback';
import { supabase } from '@/.lib/supabase';

type Indicadores = {
  totalPacientesAtivos: number;
  pacientesCriticos: number;
  adesaoMedia: number | null;
  tempoMedioCicatrizacaoDias: number | null;
};

type ResumoFeedbackEtapa = {
  etapa: string;
  quantidade: number;
  notaMedia: number | null;
  tempoMedioSegundos: number | null;
};

function CartaoIndicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 flex-1">
      <Text className="text-secundario text-xs mb-1">{titulo}</Text>
      <Text className="text-texto text-2xl font-bold">{valor}</Text>
    </View>
  );
}

export default function TelaAdmin() {
  const [papel, setPapel] = useState<string | null>(null);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [resumoFeedback, setResumoFeedback] = useState<ResumoFeedbackEtapa[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario.user) {
      setCarregando(false);
      return;
    }

    const { data: perfil } = await supabase
      .from('profissionais')
      .select('papel')
      .eq('id', usuario.user.id)
      .single();
    setPapel(perfil?.papel ?? null);

    if (perfil?.papel !== 'admin') {
      setCarregando(false);
      return;
    }

    const [{ data: painel }, { data: adesoes }, { data: lesoesResolvidas }, { data: feedbacks }] =
      await Promise.all([
        supabase.from('vw_painel_pacientes').select('prioridade'),
        supabase.from('vw_adesao_exercicios').select('adesao_percentual'),
        supabase.from('lesoes').select('data_ocorrencia, atualizado_em').neq('status', 'ativa'),
        supabase.from('feedback_piloto').select('etapa, nota, tempo_gasto_segundos'),
      ]);

    const adesoesValidas = (adesoes ?? []).map((a) => a.adesao_percentual).filter((v): v is number => v != null);
    const adesaoMedia =
      adesoesValidas.length > 0
        ? Math.round((adesoesValidas.reduce((s, v) => s + v, 0) / adesoesValidas.length) * 10) / 10
        : null;

    const diasCicatrizacao = (lesoesResolvidas ?? [])
      .filter((l) => l.data_ocorrencia)
      .map((l) => {
        const inicio = new Date(l.data_ocorrencia as string).getTime();
        const fim = new Date(l.atualizado_em as string).getTime();
        return Math.max(0, Math.round((fim - inicio) / (1000 * 60 * 60 * 24)));
      });
    const tempoMedioCicatrizacaoDias =
      diasCicatrizacao.length > 0
        ? Math.round(diasCicatrizacao.reduce((s, v) => s + v, 0) / diasCicatrizacao.length)
        : null;

    setIndicadores({
      totalPacientesAtivos: painel?.length ?? 0,
      pacientesCriticos: (painel ?? []).filter((p) => p.prioridade === 1).length,
      adesaoMedia,
      tempoMedioCicatrizacaoDias,
    });

    const porEtapa = new Map<string, { nota: number[]; tempo: number[]; total: number }>();
    for (const f of feedbacks ?? []) {
      const atual = porEtapa.get(f.etapa) ?? { nota: [], tempo: [], total: 0 };
      atual.total += 1;
      if (f.nota != null) atual.nota.push(f.nota);
      if (f.tempo_gasto_segundos != null) atual.tempo.push(f.tempo_gasto_segundos);
      porEtapa.set(f.etapa, atual);
    }
    const media = (lista: number[]) =>
      lista.length > 0 ? Math.round((lista.reduce((s, v) => s + v, 0) / lista.length) * 10) / 10 : null;

    setResumoFeedback(
      Array.from(porEtapa.entries()).map(([etapa, v]) => ({
        etapa,
        quantidade: v.total,
        notaMedia: media(v.nota),
        tempoMedioSegundos: v.tempo.length > 0 ? Math.round(v.tempo.reduce((s, x) => s + x, 0) / v.tempo.length) : null,
      }))
    );

    setCarregando(false);
  }, []);

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

  if (papel !== 'admin') {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-texto text-center">
          Este painel é restrito a administradores da clínica.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-fundo px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-texto text-xl font-bold mb-4">Painel de Admin</Text>

      <View className="flex-row gap-3 mb-3">
        <CartaoIndicador
          titulo="Pacientes com lesão ativa"
          valor={String(indicadores?.totalPacientesAtivos ?? 0)}
        />
        <CartaoIndicador titulo="Críticos" valor={String(indicadores?.pacientesCriticos ?? 0)} />
      </View>

      <View className="flex-row gap-3">
        <CartaoIndicador
          titulo="Adesão média aos exercícios"
          valor={indicadores?.adesaoMedia != null ? `${indicadores.adesaoMedia}%` : '—'}
        />
        <CartaoIndicador
          titulo="Tempo médio de cicatrização"
          valor={
            indicadores?.tempoMedioCicatrizacaoDias != null
              ? `${indicadores.tempoMedioCicatrizacaoDias} dias`
              : '—'
          }
        />
      </View>

      <Text className="text-texto font-semibold mt-6 mb-2">Feedback do piloto por etapa</Text>
      {resumoFeedback.length === 0 ? (
        <Text className="text-secundario">Nenhum feedback registrado ainda.</Text>
      ) : (
        resumoFeedback.map((r) => (
          <View key={r.etapa} className="bg-superficie border border-borda rounded-xl p-4 mb-3">
            <Text className="text-texto font-semibold mb-1">{rotuloEtapaFeedback(r.etapa)}</Text>
            <Text className="text-secundario text-xs">
              {r.quantidade} registro(s) · Nota média: {r.notaMedia ?? '—'}
              {r.tempoMedioSegundos != null
                ? ` · Tempo médio: ${Math.floor(r.tempoMedioSegundos / 60)}min ${r.tempoMedioSegundos % 60}s`
                : ''}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
