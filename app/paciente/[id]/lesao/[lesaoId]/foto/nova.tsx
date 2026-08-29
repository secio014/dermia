import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import CameraCapture from '@/components/CameraCapture';
import { palette } from '@/constants/Colors';
import { processarEEnviarFoto } from '@/.lib/foto';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

export default function NovaFoto() {
  const { id, lesaoId } = useLocalSearchParams<{ id: string; lesaoId: string }>();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(uri: string) {
    setErro(null);
    setEnviando(true);

    const perfil = await obterPerfilProfissional();
    if (!perfil) {
      setEnviando(false);
      setErro('Não foi possível identificar o profissional logado.');
      return;
    }

    try {
      const { caminho, hash } = await processarEEnviarFoto(uri, perfil.clinica_id, lesaoId);

      const { data: analise, error } = await supabase
        .from('analises_ia')
        .insert({
          lesao_id: lesaoId,
          foto_path: caminho,
          foto_hash: hash,
          criado_por: perfil.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Dispara a análise em segundo plano — se a Edge Function/Ollama ainda
      // não estiverem configurados, a análise só fica "pendente" mesmo.
      supabase.functions.invoke('analisar-lesao', { body: { analise_id: analise.id } }).catch(() => {});

      router.replace(`/paciente/${id}/lesao/${lesaoId}/foto/${analise.id}`);
    } catch (e) {
      setEnviando(false);
      const mensagem =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Erro ao enviar a foto.';
      setErro(mensagem);
    }
  }

  if (enviando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <ActivityIndicator color={palette.primaria} />
        <Text className="text-secundario text-center mt-4">Enviando foto…</Text>
      </View>
    );
  }

  if (erro) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-risco text-center">{erro}</Text>
      </View>
    );
  }

  return <CameraCapture onCapture={enviar} />;
}
