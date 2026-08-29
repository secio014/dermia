import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';

import ValidacaoIA, { type ResultadoIA } from '@/components/ValidacaoIA';
import { palette } from '@/constants/Colors';
import { obterUrlAssinada } from '@/.lib/foto';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

type Analise = {
  id: string;
  lesao_id: string;
  foto_path: string;
  status: string;
  resultado: ResultadoIA | null;
  confianca: number | null;
  validacao_profissional: string | null;
  criado_em: string;
};

export default function DetalheAnalise() {
  const { lesaoId, analiseId } = useLocalSearchParams<{
    id: string;
    lesaoId: string;
    analiseId: string;
  }>();
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [urlFoto, setUrlFoto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('analises_ia')
      .select('id, lesao_id, foto_path, status, resultado, confianca, validacao_profissional, criado_em')
      .eq('id', analiseId)
      .single();

    if (data) {
      setAnalise(data as Analise);
      obterUrlAssinada(data.foto_path).then(setUrlFoto);

      const perfil = await obterPerfilProfissional();
      if (perfil) {
        await supabase.from('auditoria_acessos').insert({
          usuario_id: perfil.id,
          clinica_id: perfil.clinica_id,
          acao: 'visualizar_foto',
          entidade: 'analises_ia',
          entidade_id: data.id,
        });
      }
    }
    setCarregando(false);
  }, [analiseId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function registrarValidacao(valor: string, grauEscolhido?: string) {
    const perfil = await obterPerfilProfissional();
    if (!perfil || !analise) return;

    await supabase
      .from('analises_ia')
      .update({
        validacao_profissional: valor,
        validado_por: perfil.id,
        validado_em: new Date().toISOString(),
      })
      .eq('id', analise.id);

    if (grauEscolhido) {
      await supabase.from('lesoes').update({ grau_clinico: grauEscolhido }).eq('id', analise.lesao_id);
    }

    carregar();
  }

  if (carregando || !analise) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-fundo px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
      {urlFoto ? (
        <Image
          source={{ uri: urlFoto }}
          style={{ width: '100%', aspectRatio: 1, borderRadius: 12, marginBottom: 16 }}
          resizeMode="cover"
        />
      ) : (
        <View className="w-full aspect-square bg-superficie border border-borda rounded-xl mb-4 items-center justify-center">
          <ActivityIndicator color={palette.primaria} />
        </View>
      )}

      <ValidacaoIA
        status={analise.status}
        resultado={analise.resultado}
        confianca={analise.confianca}
        validacaoProfissional={analise.validacao_profissional}
        onAceitar={() => registrarValidacao('aceita', analise.resultado?.grau_sugerido)}
        onEditar={(grau) => registrarValidacao('editada', grau)}
        onRejeitar={() => registrarValidacao('rejeitada')}
      />

      <Text className="text-secundario text-xs mt-4">
        Fotografado em {new Date(analise.criado_em).toLocaleString('pt-BR')}
      </Text>
    </ScrollView>
  );
}
