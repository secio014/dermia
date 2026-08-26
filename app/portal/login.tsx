import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '@/.lib/supabase';

export default function LoginPortal() {
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
    router.replace('/portal/index');
  }

  return (
    <View className="flex-1 bg-fundo justify-center px-6">
      <Text className="text-texto text-2xl font-bold mb-1">Portal do Paciente</Text>
      <Text className="text-secundario mb-8">Entre com o e-mail e senha que sua clínica te passou</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        placeholderTextColor="#5B6B7F"
        autoCapitalize="none"
        keyboardType="email-address"
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      <TextInput
        value={senha}
        onChangeText={setSenha}
        placeholder="Senha"
        placeholderTextColor="#5B6B7F"
        secureTextEntry
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={entrar}
        disabled={carregando}
        className="bg-primaria rounded-xl py-3 items-center">
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Entrar</Text>
        )}
      </Pressable>
    </View>
  );
}
