import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ETAPAS_FEEDBACK } from '@/.lib/feedback';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

function formatarTempo(segundos: number): string {
  const min = Math.floor(segundos / 60)
    .toString()
    .padStart(2, '0');
  const seg = (segundos % 60).toString().padStart(2, '0');
  return `${min}:${seg}`;
}

export default function NovoFeedback() {
  const [etapa, setEtapa] = useState<string | null>(null);
  const [cronometrando, setCronometrando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [tempoManual, setTempoManual] = useState('');
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  function alternarCronometro() {
    if (cronometrando) {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      setCronometrando(false);
    } else {
      setSegundos(0);
      intervaloRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
      setCronometrando(true);
    }
  }

  async function salvar() {
    if (!etapa) {
      setErro('Selecione a etapa avaliada.');
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

    const tempoFinal = tempoManual ? Number(tempoManual) : segundos > 0 ? segundos : null;

    const { error } = await supabase.from('feedback_piloto').insert({
      clinica_id: perfil.clinica_id,
      profissional_id: perfil.id,
      etapa,
      tempo_gasto_segundos: tempoFinal,
      nota,
      comentario: comentario.trim() || null,
    });

    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-fundo px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-texto text-lg font-bold mb-4">Feedback do piloto</Text>

      <Text className="text-texto font-semibold mb-2">Qual etapa você está avaliando?</Text>
      <View className="flex-row flex-wrap gap-2 mb-4">
        {ETAPAS_FEEDBACK.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => setEtapa(e.id)}
            className={`px-3 py-1.5 rounded-lg border ${
              etapa === e.id ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
            }`}>
            <Text className={etapa === e.id ? 'text-superficie text-xs' : 'text-secundario text-xs'}>
              {e.rotulo}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-texto font-semibold mb-2">Cronômetro</Text>
      <View className="bg-superficie border border-borda rounded-xl p-4 items-center mb-3">
        <Text className="text-texto text-3xl font-bold mb-3">{formatarTempo(segundos)}</Text>
        <Pressable
          onPress={alternarCronometro}
          className={`rounded-xl py-2.5 px-6 items-center ${cronometrando ? 'bg-risco' : 'bg-primaria'}`}>
          <Text className="text-superficie font-semibold text-xs">
            {cronometrando ? 'Parar' : 'Começar a cronometrar'}
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={tempoManual}
        onChangeText={setTempoManual}
        placeholder="Ou informe o tempo manualmente (segundos)"
        placeholderTextColor="#5B6B7F"
        keyboardType="numeric"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-4 text-texto"
      />

      <Text className="text-texto font-semibold mb-2">Nota (1 a 5)</Text>
      <View className="flex-row gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => setNota(n)}
            className={`flex-1 rounded-xl py-3 items-center border ${
              nota === n ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
            }`}>
            <Text className={nota === n ? 'text-superficie font-semibold' : 'text-texto font-semibold'}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={comentario}
        onChangeText={setComentario}
        placeholder="Comentário (opcional) — o que travou, o que funcionou bem…"
        placeholderTextColor="#5B6B7F"
        multiline
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-4 text-texto min-h-[80px]"
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={carregando}
        className="bg-primaria rounded-xl py-3 items-center">
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Salvar feedback</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
