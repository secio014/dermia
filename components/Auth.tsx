import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '@/.lib/supabase';

export default function Auth() {
  const [modo, setModo] = useState<'login' | 'cadastro'>('login');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar() {
    setErro(null);
    setCarregando(true);

    const { error } =
      modo === 'login'
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({ email, password: senha, options: { data: { nome } } });

    setCarregando(false);
    if (error) setErro(error.message);
  }

  return (
    <View className="flex-1 bg-fundo justify-center px-6">
      <Text className="text-texto text-2xl font-bold mb-1">DermIA</Text>
      <Text className="text-secundario mb-8">
        {modo === 'login' ? 'Entre com sua conta' : 'Crie sua conta de profissional'}
      </Text>

      {modo === 'cadastro' && (
        <TextInput
          value={nome}
          onChangeText={setNome}
          placeholder="Nome completo"
          placeholderTextColor="#5B6B7F"
          autoCapitalize="words"
          className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
        />
      )}

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
        onPress={enviar}
        disabled={carregando}
        className="bg-primaria rounded-xl py-3 items-center mb-4">
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">
            {modo === 'login' ? 'Entrar' : 'Cadastrar'}
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => setModo(modo === 'login' ? 'cadastro' : 'login')}>
        <Text className="text-primaria text-center">
          {modo === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </Text>
      </Pressable>
    </View>
  );
}
