import { useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import MapaCorporal from '@/components/MapaCorporal';
import { avisar } from '@/.lib/aviso';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { useLargo } from '@/.lib/responsivo';
import {
  GRAUS_CLINICOS,
  MECANISMOS,
  calcularSCQ,
  percentualDaRegiao,
  rotuloRegiaoCorporal,
  scqTabela,
  type RegiaoId,
} from '@/.lib/scq';
import { supabase } from '@/.lib/supabase';

export default function NovaLesao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const largo = useLargo();
  const [regioes, setRegioes] = useState<RegiaoId[]>([]);
  const [pediatrico, setPediatrico] = useState(false);
  const [grauClinico, setGrauClinico] = useState<string | null>(null);
  const [mecanismo, setMecanismo] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (regioes.length === 0) {
      setErro('Marque ao menos uma região no mapa corporal.');
      return;
    }
    if (!grauClinico) {
      setErro('Selecione o grau clínico da queimadura.');
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

    const { error } = await supabase.from('lesoes').insert({
      paciente_id: id,
      regiao_corporal: rotuloRegiaoCorporal(regioes),
      mecanismo,
      data_ocorrencia: new Date().toISOString().slice(0, 10),
      scq_percentual: calcularSCQ(regioes, pediatrico),
      scq_tabela: scqTabela(pediatrico),
      mapa_scq: regioes.map((regiao) => ({
        regiao,
        percentual: percentualDaRegiao(regiao, pediatrico),
      })),
      grau_clinico: grauClinico,
      observacoes: observacoes.trim() || null,
      criado_por: perfil.id,
    });

    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    avisar('Lesão registrada.');
    router.replace(`/paciente/${id}`);
  }

  const blocoMapa = (
    <MapaCorporal
      value={regioes}
      onChange={setRegioes}
      pediatrico={pediatrico}
      onTogglePediatrico={setPediatrico}
    />
  );

  const blocoForm = (
    <>
      <Text className="text-texto font-semibold mb-2">Grau clínico</Text>
      <View className="flex-row flex-wrap gap-2 mb-3">
        {GRAUS_CLINICOS.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => setGrauClinico(g.id)}
            className={`px-3 py-1.5 rounded-lg border ${
              grauClinico === g.id ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
            }`}>
            <Text className={grauClinico === g.id ? 'text-superficie text-xs' : 'text-secundario text-xs'}>
              {g.rotulo}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-texto font-semibold mb-2">Mecanismo (opcional)</Text>
      <View className="flex-row flex-wrap gap-2 mb-3">
        {MECANISMOS.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setMecanismo((atual) => (atual === m.id ? null : m.id))}
            className={`px-3 py-1.5 rounded-lg border ${
              mecanismo === m.id ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
            }`}>
            <Text className={mecanismo === m.id ? 'text-superficie text-xs' : 'text-secundario text-xs'}>
              {m.rotulo}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Observações (opcional)"
        placeholderTextColor="#5B6B7F"
        multiline
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto min-h-[80px]"
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={carregando || regioes.length === 0}
        className="bg-primaria rounded-xl py-3 items-center mt-1"
        style={{ opacity: regioes.length === 0 ? 0.5 : 1 }}>
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Salvar lesão</Text>
        )}
      </Pressable>
    </>
  );

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName={largo ? 'w-full max-w-5xl self-center' : undefined}
      contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ title: 'Nova lesão' }} />
      {largo ? (
        <View className="flex-row gap-6">
          <View className="flex-1">{blocoMapa}</View>
          <View className="flex-1">{blocoForm}</View>
        </View>
      ) : (
        <>
          {blocoMapa}
          <View className="mt-4" />
          {blocoForm}
        </>
      )}
    </ScrollView>
  );
}
