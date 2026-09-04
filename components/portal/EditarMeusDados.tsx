import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import SeletorData from '@/components/ui/SeletorData';
import { mascararTelefone, telefoneDigitos, telefoneValido } from '@/.lib/telefone';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

// Dados cadastrais do próprio paciente — ele vê e pode corrigir nome, e-mail,
// telefone e data de nascimento. Só esses campos: código, clínica e
// consentimento continuam controlados pela equipe. Grava via edge function
// (roda com service role, escrevendo só nos campos permitidos).

export default function EditarMeusDados() {
  const { cores } = useTema();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const carregar = useCallback(async () => {
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario.user) {
      setCarregando(false);
      return;
    }
    const { data } = await supabase
      .from('pacientes')
      .select('nome_completo, email, telefone, data_nascimento')
      .eq('user_id', usuario.user.id)
      .maybeSingle();
    if (data) {
      setNome(data.nome_completo ?? '');
      setEmail(data.email ?? '');
      setTelefone(mascararTelefone(data.telefone ?? ''));
      setDataNascimento(data.data_nascimento ?? '');
    }
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function salvar() {
    setMsg(null);
    if (nome.trim().length < 2) {
      setMsg({ tipo: 'erro', texto: 'Informe seu nome completo.' });
      return;
    }
    if (telefone && !telefoneValido(telefone)) {
      setMsg({ tipo: 'erro', texto: 'Telefone incompleto. Use DDD + 9 + número.' });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.functions.invoke('atualizar-meus-dados-paciente', {
      body: {
        nome_completo: nome.trim(),
        email: email.trim() || null,
        telefone: telefoneDigitos(telefone) || null,
        data_nascimento: dataNascimento || null,
      },
    });
    setSalvando(false);
    if (error) {
      setMsg({ tipo: 'erro', texto: error.message ?? 'Falha ao salvar.' });
      return;
    }
    setMsg({ tipo: 'ok', texto: 'Dados atualizados.' });
  }

  if (carregando) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator color={cores.primaria} />
      </View>
    );
  }

  const campo = 'bg-fundo border border-borda rounded-xl px-4 py-3 mb-2 text-texto';

  return (
    <View className="p-4">
      <Text className="text-texto font-semibold mb-1">Meus dados</Text>
      <Text className="text-secundario text-xs mb-3">
        Nome, e-mail, telefone e data de nascimento. O código do prontuário e a clínica são
        controlados pela sua equipe.
      </Text>

      <TextInput
        value={nome}
        onChangeText={setNome}
        placeholder="Nome completo"
        placeholderTextColor={cores.secundario}
        autoCapitalize="words"
        className={campo}
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        placeholderTextColor={cores.secundario}
        autoCapitalize="none"
        keyboardType="email-address"
        className={campo}
      />
      <TextInput
        value={telefone}
        onChangeText={(t) => setTelefone(mascararTelefone(t))}
        placeholder="Telefone — ex.: 11 9 5324-4847"
        placeholderTextColor={cores.secundario}
        keyboardType="phone-pad"
        maxLength={14}
        className={campo}
      />
      <View className="mb-2">
        <SeletorData
          valor={dataNascimento}
          onChange={setDataNascimento}
          placeholder="Data de nascimento"
          opcional
        />
      </View>

      {msg && (
        <Text className={`text-xs mb-2 ${msg.tipo === 'ok' ? 'text-ok' : 'text-risco'}`}>
          {msg.texto}
        </Text>
      )}

      <Pressable
        onPress={salvar}
        disabled={salvando}
        className="bg-primaria rounded-xl py-3 items-center">
        {salvando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-white font-semibold">Salvar dados</Text>
        )}
      </Pressable>
    </View>
  );
}
