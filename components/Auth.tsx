import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

// Tela de entrada. Aparece só quando LOGIN_DESATIVADO = false (.lib/dev.ts).
// "Criar conta" é usada pelo administrador-chefe para abrir a conta dele;
// as contas dos fisioterapeutas são criadas depois, pelo painel de admin.
export default function Auth() {
  const { cores } = useTema();
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar() {
    setErro(null);
    setAviso(null);
    setCarregando(true);

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setErro(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });
      if (error) setErro(error.message);
      else if (!data.session) setAviso('Conta criada. Confirme o e-mail para entrar.');
    }

    setCarregando(false);
  }

  return (
    <View className="flex-1 bg-fundo justify-center px-6">
      <View className="w-full max-w-sm self-center">
        <Text className="text-texto text-3xl font-bold mb-1">DermIA</Text>
        <Text className="text-secundario mb-8">
          {modo === 'entrar' ? 'Entre com sua conta' : 'Crie a conta do administrador'}
        </Text>

        {modo === 'criar' && (
          <TextInput
            value={nome}
            onChangeText={setNome}
            placeholder="Nome completo"
            placeholderTextColor={cores.secundario}
            className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
          />
        )}

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
        {aviso && <Text className="text-ok mb-3">{aviso}</Text>}

        <Pressable
          onPress={enviar}
          disabled={carregando}
          className="bg-primaria rounded-xl py-3.5 items-center mb-4">
          {carregando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">
              {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setModo((m) => (m === 'entrar' ? 'criar' : 'entrar'));
            setErro(null);
            setAviso(null);
          }}
          className="items-center py-2">
          <Text className="text-primaria font-medium">
            {modo === 'entrar' ? 'Criar conta de administrador' : 'Já tenho conta — entrar'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
