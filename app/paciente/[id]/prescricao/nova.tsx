import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import SeletorData from '@/components/ui/SeletorData';
import { avisar } from '@/.lib/aviso';
import { useTema } from '@/.lib/tema';
import { criarPrescricao } from '@/.lib/prescricoes';

const campo = 'bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto';

export default function NovaPrescricao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [dose, setDose] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome do remédio ou curativo.');
      return;
    }
    setErro(null);
    setSalvando(true);
    const { error } = await criarPrescricao({
      paciente_id: id,
      nome: nome.trim(),
      dose: dose.trim() || null,
      frequencia: frequencia.trim() || null,
      inicio: inicio.trim() || null,
      fim: fim.trim() || null,
      observacoes: observacoes.trim() || null,
    });
    setSalvando(false);
    if (error) {
      setErro(error);
      return;
    }
    avisar('Prescrição adicionada.');
    router.back();
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-2xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Nome (ex.: Sulfadiazina de prata 1%)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={dose}
        onChangeText={setDose}
        placeholder="Dose (ex.: camada fina)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={frequencia}
        onChangeText={setFrequencia}
        placeholder="Frequência (ex.: 2x ao dia)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <Text className="text-secundario text-xs font-semibold mb-1">INÍCIO (opcional)</Text>
      <View className="mb-3">
        <SeletorData valor={inicio} onChange={setInicio} placeholder="Escolher data" opcional />
      </View>
      <Text className="text-secundario text-xs font-semibold mb-1">FIM (opcional)</Text>
      <View className="mb-3">
        <SeletorData valor={fim} onChange={setFim} placeholder="Em uso / sem previsão" opcional />
      </View>
      <TextInput
        value={observacoes}
        onChangeText={setObservacoes}
        placeholder="Observações (opcional)"
        placeholderTextColor={cores.secundario}
        multiline
        className={`${campo} min-h-[80px]`}
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={salvando}
        className="bg-primaria rounded-xl py-3.5 items-center">
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Prescrever</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
