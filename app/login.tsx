import { useEffect, useState } from 'react';
import { Redirect, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoDermia from '@/components/ui/LogoDermia';
import BotaoTema from '@/components/ui/BotaoTema';
import { rotaInicialDoUsuario } from '@/.lib/acesso';
import { definirLembrar } from '@/.lib/authStorage';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

// Tela de login única — paciente, fisioterapeuta e admin entram pela mesma tela.
// O destino depois do login sai do vínculo da conta (ver rotaInicialDoUsuario).

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SENHA = 6;

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar.';
  if (m.includes('unable to validate email address')) return 'E-mail inválido.';
  if (m.includes('rate limit') || m.includes('too many requests'))
    return 'Muitas tentativas. Espere um pouco e tente de novo.';
  return msg;
}

export default function Login() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<{ email?: string; senha?: string; geral?: string }>({});
  const [redirecionando, setRedirecionando] = useState<'/global' | '/painel' | '/portal' | null>(
    null
  );

  // Já logado: manda direto para a área da conta (conforme o papel) em vez de
  // mostrar o formulário de novo. Cobre tanto o retorno de um usuário real
  // quanto o login automático de teste do dev — sem isso, vir do site para
  // "/login" abre uma segunda tela de login sem necessidade.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        rotaInicialDoUsuario().then((destino) => setRedirecionando(destino ?? '/painel'));
      }
    });
  }, []);

  if (redirecionando) return <Redirect href={redirecionando} />;

  function validar() {
    const e: typeof erros = {};
    if (!email.trim()) e.email = 'Informe o e-mail.';
    else if (!RE_EMAIL.test(email.trim())) e.email = 'E-mail inválido.';
    if (!senha) e.senha = 'Informe a senha.';
    else if (senha.length < MIN_SENHA) e.senha = `Mínimo de ${MIN_SENHA} caracteres.`;
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function entrar() {
    if (!validar()) return;
    setErros({});
    setCarregando(true);

    // Grava a preferência ANTES do login: é ela que diz ao supabase-js se a
    // sessão vai para o storage persistente ou o efêmero.
    await definirLembrar(lembrar);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });
    if (error) {
      setCarregando(false);
      setErros({ geral: traduzErro(error.message) });
      return;
    }

    const destino = await rotaInicialDoUsuario();
    setCarregando(false);
    if (!destino) {
      await supabase.auth.signOut();
      setErros({ geral: 'Esta conta ainda não tem acesso. Fale com a sua clínica.' });
      return;
    }
    router.replace(destino);
  }

  const campo = 'bg-superficie border rounded-xl px-4 py-3 mb-1 text-texto';

  return (
    <View className="flex-1 bg-fundo">
      <Stack.Screen options={{ headerShown: false }} />

      <View
        className="flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}>
        <View className="flex-row items-center gap-2">
          <LogoDermia size={26} />
          <Text className="text-texto text-lg font-bold">DermIA</Text>
        </View>
        <BotaoTema size={20} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <View className="w-full max-w-sm self-center">
            <Text className="text-texto text-3xl font-bold mb-1">Entrar</Text>
            <Text className="text-secundario mb-8">
              Entre com o e-mail e a senha da sua conta. Uma única entrada para pacientes e equipe —
              o acesso é liberado conforme o seu perfil.
            </Text>

            <View className="mb-3">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="E-mail"
                placeholderTextColor={cores.secundario}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                className={`${campo} ${erros.email ? 'border-risco' : 'border-borda'}`}
              />
              {erros.email && <Text className="text-risco text-xs px-1">{erros.email}</Text>}
            </View>

            <View className="mb-3">
              <TextInput
                value={senha}
                onChangeText={setSenha}
                placeholder="Senha"
                placeholderTextColor={cores.secundario}
                secureTextEntry
                onSubmitEditing={entrar}
                className={`${campo} ${erros.senha ? 'border-risco' : 'border-borda'}`}
              />
              {erros.senha && <Text className="text-risco text-xs px-1">{erros.senha}</Text>}
            </View>

            <Pressable
              onPress={() => setLembrar((v) => !v)}
              className="flex-row items-center gap-2 py-2 mb-3"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: lembrar }}>
              <Ionicons
                name={lembrar ? 'checkbox' : 'square-outline'}
                size={22}
                color={lembrar ? cores.primaria : cores.secundario}
              />
              <Text className="text-texto text-sm">Manter-me conectado neste aparelho</Text>
            </Pressable>

            {erros.geral && <Text className="text-risco mb-3">{erros.geral}</Text>}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
