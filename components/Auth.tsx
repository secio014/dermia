import { useState } from 'react';
import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import LogoDermia from '@/components/ui/LogoDermia';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

// Tela de entrada da equipe (fisioterapeutas e administradores).
// Aparece quando LOGIN_DESATIVADO = false (.lib/dev.ts).
// "Criar conta" é para o administrador-chefe abrir a conta dele; as contas dos
// fisioterapeutas são criadas depois, pelo Painel de Admin (que gera uma senha
// temporária para repassar).

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_SENHA = 6;

// Traduz as mensagens do Supabase para algo que o usuário entende.
function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme o e-mail antes de entrar.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Já existe uma conta com esse e-mail.';
  if (m.includes('password should be at least'))
    return `A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`;
  if (m.includes('unable to validate email address')) return 'E-mail inválido.';
  if (m.includes('rate limit') || m.includes('too many requests'))
    return 'Muitas tentativas. Espere um pouco e tente de novo.';
  return msg;
}

export default function Auth() {
  const { cores } = useTema();
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<{ nome?: string; email?: string; senha?: string; geral?: string }>({});
  const [aviso, setAviso] = useState<string | null>(null);

  function validar() {
    const e: typeof erros = {};
    if (modo === 'criar' && nome.trim().length < 2) e.nome = 'Informe o nome completo.';
    if (!email.trim()) e.email = 'Informe o e-mail.';
    else if (!RE_EMAIL.test(email.trim())) e.email = 'E-mail inválido.';
    if (!senha) e.senha = 'Informe a senha.';
    else if (senha.length < MIN_SENHA) e.senha = `Mínimo de ${MIN_SENHA} caracteres.`;
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviar() {
    setAviso(null);
    if (!validar()) return;

    setCarregando(true);
    const emailLimpo = email.trim().toLowerCase();

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailLimpo,
        password: senha,
      });
      if (error) setErros({ geral: traduzErro(error.message) });
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: emailLimpo,
        password: senha,
        options: { data: { nome: nome.trim() } },
      });
      if (error) setErros({ geral: traduzErro(error.message) });
      else if (!data.session) setAviso('Conta criada. Confirme o e-mail para entrar.');
    }

    setCarregando(false);
  }

  const campo = 'bg-superficie border rounded-xl px-4 py-3 mb-1 text-texto';

  return (
    <View className="flex-1 bg-fundo justify-center px-6">
      <View className="w-full max-w-sm self-center">
        <View className="flex-row items-center gap-2 mb-1">
          <LogoDermia size={28} />
          <Text className="text-texto text-3xl font-bold">DermIA</Text>
        </View>
        <Text className="text-secundario mb-8">
          {modo === 'entrar'
            ? 'Acesso da equipe — fisioterapeutas e administradores'
            : 'Crie a conta do administrador da clínica'}
        </Text>

        {modo === 'criar' && (
          <View className="mb-3">
            <TextInput
              value={nome}
              onChangeText={setNome}
              placeholder="Nome completo"
              placeholderTextColor={cores.secundario}
              autoCapitalize="words"
              className={`${campo} ${erros.nome ? 'border-risco' : 'border-borda'}`}
            />
            {erros.nome && <Text className="text-risco text-xs px-1">{erros.nome}</Text>}
          </View>
        )}

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
            onSubmitEditing={enviar}
            className={`${campo} ${erros.senha ? 'border-risco' : 'border-borda'}`}
          />
          {erros.senha && <Text className="text-risco text-xs px-1">{erros.senha}</Text>}
        </View>

        {erros.geral && <Text className="text-risco mb-3">{erros.geral}</Text>}
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
            setErros({});
            setAviso(null);
          }}
          className="items-center py-2">
          <Text className="text-primaria font-medium">
            {modo === 'entrar' ? 'Criar conta de administrador' : 'Já tenho conta — entrar'}
          </Text>
        </Pressable>

        <Link href="/portal/login" className="text-secundario text-center text-sm py-2">
          É paciente? Acesse o Portal do Paciente
        </Link>
      </View>
    </View>
  );
}
