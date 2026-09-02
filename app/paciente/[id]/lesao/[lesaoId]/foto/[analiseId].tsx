import { useCallback, useEffect, useState } from 'react';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import ValidacaoIA, { type ResultadoIA } from '@/components/ValidacaoIA';
import { palette } from '@/constants/Colors';
import { avisar } from '@/.lib/aviso';
import { excluirAnalise, iniciarAnaliseIA, obterUrlAssinada } from '@/.lib/foto';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

type Analise = {
  id: string;
  lesao_id: string;
  foto_path: string;
  status: string;
  resultado: ResultadoIA | null;
  confianca: number | null;
  erro_mensagem: string | null;
  validacao_profissional: string | null;
  criado_em: string;
};

async function confirmar(titulo: string, mensagem: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.confirm(`${titulo}\n\n${mensagem}`);
  }
  return new Promise((resolve) => {
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function DetalheAnalise() {
  const { id, lesaoId, analiseId } = useLocalSearchParams<{
    id: string;
    lesaoId: string;
    analiseId: string;
  }>();
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [urlFoto, setUrlFoto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('analises_ia')
      .select('id, lesao_id, foto_path, status, resultado, confianca, erro_mensagem, validacao_profissional, criado_em')
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

  // Enquanto a Edge Function processa (~5-10 s) a tela não tem realtime —
  // recarrega até chegar num status final.
  useEffect(() => {
    if (analise?.status !== 'processando') return;
    const t = setInterval(carregar, 3000);
    return () => clearInterval(t);
  }, [analise?.status, carregar]);

  async function iniciarAnalise() {
    if (!analise) return;
    setOcupado(true);
    try {
      await iniciarAnaliseIA(analise.id);
      await carregar();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Falha ao iniciar a análise.', 'erro');
    } finally {
      setOcupado(false);
    }
  }

  async function excluir() {
    if (!analise) return;
    const ok = await confirmar('Excluir foto', 'A foto e a análise serão apagadas. Esta ação não pode ser desfeita.');
    if (!ok) return;
    setOcupado(true);
    try {
      await excluirAnalise(analise.id);
      avisar('Foto excluída.', 'ok');
      router.replace(`/paciente/${id}/lesao/${lesaoId}`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Falha ao excluir a foto.', 'erro');
      setOcupado(false);
    }
  }

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
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-2xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ headerTitle: 'Derm.IA' }} />
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

      {analise.status === 'pendente' ? (
        <View className="bg-superficie border border-borda rounded-xl p-4">
          <Text className="text-texto font-semibold mb-1">Foto salva</Text>
          <Text className="text-secundario text-sm mb-4">
            Iniciar a análise de IA para esta foto ou descartá-la?
          </Text>
          <Pressable
            onPress={iniciarAnalise}
            disabled={ocupado}
            className="bg-primaria rounded-xl py-3 items-center mb-2"
            style={{ opacity: ocupado ? 0.5 : 1 }}>
            <Text className="text-superficie font-semibold">Iniciar análise de IA</Text>
          </Pressable>
          <Pressable
            onPress={excluir}
            disabled={ocupado}
            className="bg-superficie border border-risco rounded-xl py-3 items-center"
            style={{ opacity: ocupado ? 0.5 : 1 }}>
            <Text className="text-risco font-semibold">Excluir foto</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ValidacaoIA
            status={analise.status}
            resultado={analise.resultado}
            confianca={analise.confianca}
            erroMensagem={analise.erro_mensagem}
            validacaoProfissional={analise.validacao_profissional}
            onAceitar={() => registrarValidacao('aceita', analise.resultado?.grau_sugerido)}
            onEditar={(grau) => registrarValidacao('editada', grau)}
            onRejeitar={() => registrarValidacao('rejeitada')}
          />
          {analise.status !== 'processando' && (
            <Pressable onPress={excluir} disabled={ocupado} className="py-3 items-center mt-2">
              <Text className="text-risco text-xs font-semibold">Excluir foto</Text>
            </Pressable>
          )}
        </>
      )}

      <Text className="text-secundario text-xs mt-4">
        Fotografado em {new Date(analise.criado_em).toLocaleString('pt-BR')}
      </Text>
    </ScrollView>
  );
}
