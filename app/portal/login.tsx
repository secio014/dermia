import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

export default function LoginPortal() {
  const { cores } = useTema();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.replace('/portal' as any);
  }

  return (
    <View className="flex-1 bg-fundo justify-center px-6">
      <View className="w-full max-w-sm self-center">
        <Text className="text-texto text-3xl font-bold mb-1">Portal do Paciente</Text>
        <Text className="text-secundario mb-8">
          Entre com o e-mail e a senha que sua clínica te passou
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          placeholderTextColor={cores.secundario}
          autoCapitalize="none"
          keyboardType="email-address"
          className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
        />

        <TextInput
          value={senha}
          onChangeText={setSenha}
          placeholder="Senha"
          placeholderTextColor={cores.secundario}
          secureTextEntry
          className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
        />

        {erro && <Text className="text-risco mb-3">{erro}</Text>}

        <Pressable
          onPress={entrar}
          disabled={carregando}
          className="bg-primaria rounded-xl py-3.5 items-center">
          {carregando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">Entrar</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
