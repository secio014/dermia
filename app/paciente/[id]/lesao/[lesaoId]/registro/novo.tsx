import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

type Medida = {
  articulacao: string;
  movimento: string;
  grau_ativo: number;
  grau_passivo: number;
  referencia?: number;
};

export default function NovoRegistro() {
  const { lesaoId } = useLocalSearchParams<{ id: string; lesaoId: string }>();
  const [medidas, setMedidas] = useState<Medida[]>([]);
  const [articulacao, setArticulacao] = useState('');
  const [movimento, setMovimento] = useState('');
  const [grauAtivo, setGrauAtivo] = useState('');
  const [grauPassivo, setGrauPassivo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dorEva, setDorEva] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function adicionarMedida() {
    if (!articulacao.trim() || !movimento.trim() || !grauAtivo || !grauPassivo) {
      setErro('Preencha articulação, movimento e os graus ativo/passivo.');
      return;
    }
    setErro(null);
    setMedidas((atual) => [
      ...atual,
      {
        articulacao: articulacao.trim(),
        movimento: movimento.trim(),
        grau_ativo: Number(grauAtivo),
        grau_passivo: Number(grauPassivo),
        referencia: referencia ? Number(referencia) : undefined,
      },
    ]);
    setArticulacao('');
    setMovimento('');
    setGrauAtivo('');
    setGrauPassivo('');
    setReferencia('');
  }

  function removerMedida(indice: number) {
    setMedidas((atual) => atual.filter((_, i) => i !== indice));
  }

  async function salvar() {
    if (medidas.length === 0) {
      setErro('Adicione ao menos uma medida de goniometria.');
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

    const { error } = await supabase.from('registros_evolucao').insert({
      lesao_id: lesaoId,
      profissional_id: perfil.id,
      adm: medidas,
      descricao: descricao.trim() || null,
      dor_eva: dorEva ? Number(dorEva) : null,
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
      <Text className="text-texto font-semibold mb-2">Adicionar medida de goniometria</Text>

      <TextInput
        value={articulacao}
        onChangeText={setArticulacao}
        placeholder="Articulação (ex: ombro)"
        placeholderTextColor="#5B6B7F"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />
      <TextInput
        value={movimento}
        onChangeText={setMovimento}
        placeholder="Movimento (ex: flexão)"
        placeholderTextColor="#5B6B7F"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />
      <View className="flex-row gap-3 mb-3">
        <TextInput
          value={grauAtivo}
          onChangeText={setGrauAtivo}
          placeholder="Grau ativo"
          placeholderTextColor="#5B6B7F"
          keyboardType="numeric"
          className="flex-1 bg-superficie border border-borda rounded-xl px-4 py-3 text-texto"
        />
        <TextInput
          value={grauPassivo}
          onChangeText={setGrauPassivo}
          placeholder="Grau passivo"
          placeholderTextColor="#5B6B7F"
          keyboardType="numeric"
          className="flex-1 bg-superficie border border-borda rounded-xl px-4 py-3 text-texto"
        />
      </View>
      <TextInput
        value={referencia}
        onChangeText={setReferencia}
        placeholder="Referência normal (opcional)"
        placeholderTextColor="#5B6B7F"
        keyboardType="numeric"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      <Pressable
        onPress={adicionarMedida}
        className="bg-superficie border border-primaria rounded-xl py-2.5 items-center mb-6">
        <Text className="text-primaria font-semibold">+ Adicionar à lista</Text>
      </Pressable>

      {medidas.length > 0 && (
        <View className="mb-6">
          <Text className="text-texto font-semibold mb-2">Medidas deste registro</Text>
          {medidas.map((m, i) => (
            <View
              key={i}
              className="bg-superficie border border-borda rounded-xl p-3 mb-2 flex-row justify-between items-center">
              <Text className="text-secundario text-xs flex-1">
                {m.articulacao} · {m.movimento}: ativo {m.grau_ativo}° / passivo {m.grau_passivo}°
              </Text>
              <Pressable onPress={() => removerMedida(i)}>
                <Text className="text-risco text-xs ml-2">Remover</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <TextInput
        value={dorEva}
        onChangeText={setDorEva}
        placeholder="Dor (escala EVA 0-10, opcional)"
        placeholderTextColor="#5B6B7F"
        keyboardType="numeric"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      <TextInput
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Descrição do atendimento (opcional)"
        placeholderTextColor="#5B6B7F"
        multiline
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto min-h-[80px]"
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={carregando}
        className="bg-primaria rounded-xl py-3 items-center">
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Salvar registro</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
