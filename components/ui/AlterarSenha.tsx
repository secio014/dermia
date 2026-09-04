import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

// Troca de senha do próprio usuário logado — serve para qualquer conta
// (paciente, fisioterapeuta, estagiário, admin, admin_geral). O Supabase não
// pede a senha atual para um usuário já autenticado; confirmamos só a repetição.

const MIN_SENHA = 6;

export default function AlterarSenha() {
  const { cores } = useTema();
  const [nova, setNova] = useState('');
  const [repetir, setRepetir] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  async function salvar() {
    setMsg(null);
    if (nova.length < MIN_SENHA) {
      setMsg({ tipo: 'erro', texto: `A senha precisa de ao menos ${MIN_SENHA} caracteres.` });
      return;
    }
    if (nova !== repetir) {
      setMsg({ tipo: 'erro', texto: 'As duas senhas não conferem.' });
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: nova });
    setSalvando(false);
    if (error) {
      setMsg({ tipo: 'erro', texto: error.message });
      return;
    }
    setNova('');
    setRepetir('');
    setMsg({ tipo: 'ok', texto: 'Senha alterada.' });
  }

  const campo = 'bg-fundo border border-borda rounded-xl px-4 py-3 mb-2 text-texto';

  return (
    <View className="p-4">
      <Text className="text-texto font-semibold mb-1">Alterar senha</Text>
      <Text className="text-secundario text-xs mb-3">
        Troque a senha temporária que você recebeu no primeiro acesso, quando quiser.
      </Text>
      <TextInput
        value={nova}
        onChangeText={setNova}
        placeholder="Nova senha"
        placeholderTextColor={cores.secundario}
        secureTextEntry
        autoCapitalize="none"
        className={campo}
      />
      <TextInput
        value={repetir}
        onChangeText={setRepetir}
        placeholder="Repetir nova senha"
        placeholderTextColor={cores.secundario}
        secureTextEntry
        autoCapitalize="none"
        onSubmitEditing={salvar}
        className={campo}
      />
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
          <Text className="text-white font-semibold">Salvar nova senha</Text>
        )}
      </Pressable>
    </View>
  );
}
