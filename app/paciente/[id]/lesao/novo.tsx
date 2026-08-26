import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import MapaCorporal from '@/components/MapaCorporal';
import { calcularSCQ, type RegiaoId } from '@/.lib/scq';
import { supabase } from '@/.lib/supabase';

export default function NovaLesao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [regioes, setRegioes] = useState<RegiaoId[]>([]);
  const [pediatrico, setPediatrico] = useState(false);
  const [observacoes, setObservacoes] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    setCarregando(true);

    const { error } = await supabase.from('lesoes').insert({
      paciente_id: id,
      regioes_marcadas: regioes,
      pediatrico,
      scq_percentual: calcularSCQ(regioes, pediatrico),
      observacoes: observacoes.trim() || null,
    });

    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.replace(`/paciente/${id}`);
  }

  return (
    <ScrollView className="flex-1 bg-fundo px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
      <MapaCorporal
        value={regioes}
        onChange={setRegioes}
        pediatrico={pediatrico}
        onTogglePediatrico={setPediatrico}
      />

      <TextInput
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Observações (opcional)"
        placeholderTextColor="#5B6B7F"
        multiline
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mt-4 text-texto min-h-[80px]"
      />

      {erro && <Text className="text-risco mt-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={carregando || regioes.length === 0}
        className="bg-primaria rounded-xl py-3 items-center mt-4"
        style={{ opacity: regioes.length === 0 ? 0.5 : 1 }}>
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Salvar lesão</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
