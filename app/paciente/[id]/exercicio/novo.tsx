import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

export default function NovoExercicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [titulo, setTitulo] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [series, setSeries] = useState('');
  const [repeticoes, setRepeticoes] = useState('');
  const [frequenciaSemanal, setFrequenciaSemanal] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!titulo.trim()) {
      setErro('Informe o título do exercício.');
      return;
    }
    if (series && Number(series) <= 0) {
      setErro('Séries deve ser maior que zero.');
      return;
    }
    if (repeticoes && Number(repeticoes) <= 0) {
      setErro('Repetições deve ser maior que zero.');
      return;
    }
    if (frequenciaSemanal && (Number(frequenciaSemanal) < 1 || Number(frequenciaSemanal) > 21)) {
      setErro('Frequência semanal deve ser entre 1 e 21.');
      return;
    }
    setErro(null);
    setCarregando(true);

    const perfil = await obterPerfilProfissional();
    if (!perfil) {
      setCarregando(false);
      setErro('Não foi possível identificar o profissional logado.');
      return;
    }

    const { error } = await supabase.from('exercicios_prescritos').insert({
      paciente_id: id,
      profissional_id: perfil.id,
      titulo: titulo.trim(),
      instrucoes: instrucoes.trim() || null,
      video_url: videoUrl.trim() || null,
      series: series ? Number(series) : null,
      repeticoes: repeticoes ? Number(repeticoes) : null,
      frequencia_semanal: frequenciaSemanal ? Number(frequenciaSemanal) : null,
    });

    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.back();
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-2xl self-center"
      contentContainerStyle={{ paddingBottom: 32 }}>
      <TextInput
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Título (ex: Alongamento de ombro)"
        placeholderTextColor="#5B6B7F"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      <TextInput
        value={instrucoes}
        onChangeText={setInstrucoes}
        placeholder="Instruções (opcional)"
        placeholderTextColor="#5B6B7F"
        multiline
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto min-h-[80px]"
      />

      <TextInput
        value={videoUrl}
        onChangeText={setVideoUrl}
        placeholder="Link do vídeo (opcional)"
        placeholderTextColor="#5B6B7F"
        autoCapitalize="none"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      <View className="flex-row gap-3 mb-3">
        <TextInput
          value={series}
          onChangeText={setSeries}
          placeholder="Séries"
          placeholderTextColor="#5B6B7F"
          keyboardType="numeric"
          className="flex-1 bg-superficie border border-borda rounded-xl px-4 py-3 text-texto"
        />
        <TextInput
          value={repeticoes}
          onChangeText={setRepeticoes}
          placeholder="Repetições"
          placeholderTextColor="#5B6B7F"
          keyboardType="numeric"
          className="flex-1 bg-superficie border border-borda rounded-xl px-4 py-3 text-texto"
        />
      </View>

      <TextInput
        value={frequenciaSemanal}
        onChangeText={setFrequenciaSemanal}
        placeholder="Frequência por semana (ex: 5)"
        placeholderTextColor="#5B6B7F"
        keyboardType="numeric"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={carregando}
        className="bg-primaria rounded-xl py-3 items-center">
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Prescrever exercício</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
