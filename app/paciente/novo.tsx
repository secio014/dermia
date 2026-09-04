import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import SeletorData from '@/components/ui/SeletorData';
import { avisar } from '@/.lib/aviso';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { mascararTelefone, telefoneDigitos, telefoneValido } from '@/.lib/telefone';
import { supabase } from '@/.lib/supabase';

function gerarCodigo(): string {
  const agora = new Date();
  const aleatorio = Math.floor(Math.random() * 900 + 100);
  return `P${agora.getFullYear().toString().slice(2)}${(agora.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${aleatorio}`;
}

export default function NovoPaciente() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [consentiu, setConsentiu] = useState(false);
  const [codigo] = useState(gerarCodigo());
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) {
      setErro('Informe o nome do paciente.');
      return;
    }
    if (telefone && !telefoneValido(telefone)) {
      setErro('Telefone incompleto. Use DDD + 9 + número, ex.: 11 9 5324-4847.');
      return;
    }
    if (!consentiu) {
      setErro('É necessário registrar o consentimento do paciente para captura de imagens.');
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

    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        clinica_id: perfil.clinica_id,
        criado_por: perfil.id,
        codigo_pseudonimo: codigo,
        nome_completo: nome.trim(),
        email: email.trim() || null,
        telefone: telefoneDigitos(telefone) || null,
        data_nascimento: dataNascimento || null,
        consentimento_em: new Date().toISOString(),
        consentimento_versao: '1.0',
      })
      .select('id')
      .single();

    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    avisar('Paciente cadastrado.');
    router.replace(`/paciente/${data.id}`);
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-3xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ headerTitle: 'DermIA' }} />
      <Text className="text-secundario mb-1">Código gerado automaticamente</Text>
      <Text className="text-texto text-lg font-semibold mb-6">{codigo}</Text>

      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Nome completo"
        placeholderTextColor="#5B6B7F"
        autoCapitalize="words"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail (opcional — para enviar documentos e acesso ao portal)"
        placeholderTextColor="#5B6B7F"
        autoCapitalize="none"
        keyboardType="email-address"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      <TextInput
        value={telefone}
        onChangeText={(t) => setTelefone(mascararTelefone(t))}
        placeholder="Telefone (opcional) — ex.: 11 9 5324-4847"
        placeholderTextColor="#5B6B7F"
        keyboardType="phone-pad"
        maxLength={14}
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      <Text className="text-secundario mb-1">Data de nascimento</Text>
      <View className="mb-3">
        <SeletorData
          valor={dataNascimento}
          onChange={setDataNascimento}
          placeholder="Escolher data"
          opcional
        />
      </View>

      <Pressable
        onPress={() => setConsentiu((atual) => !atual)}
        className="flex-row items-start gap-3 bg-superficie border border-borda rounded-xl px-4 py-3 mb-3">
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            borderWidth: 2,
            borderColor: consentiu ? undefined : '#5B6B7F',
          }}
          className={consentiu ? 'bg-primaria border-primaria items-center justify-center' : 'items-center justify-center'}>
          {consentiu && <Text className="text-superficie text-xs font-bold">✓</Text>}
        </View>
        <Text className="text-secundario text-xs flex-1">
          O paciente (ou responsável) consentiu com a captura e o armazenamento de fotos da lesão
          para fins de acompanhamento clínico.
        </Text>
      </Pressable>

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={carregando}
        className="bg-primaria rounded-xl py-3 items-center mt-3">
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Salvar paciente</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
