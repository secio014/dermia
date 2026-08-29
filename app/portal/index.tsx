import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { palette } from '@/constants/Colors';
import SecaoHoje from '@/components/portal/SecaoHoje';
import SecaoEvolucao from '@/components/portal/SecaoEvolucao';
import SecaoTratamento from '@/components/portal/SecaoTratamento';
import { supabase } from '@/.lib/supabase';

type Aba = 'hoje' | 'evolucao' | 'tratamento';
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'evolucao', rotulo: 'Evolução' },
  { id: 'tratamento', rotulo: 'Tratamento' },
];

export default function PortalPaciente() {
  const [paciente, setPaciente] = useState<{ id: string; nome: string; desde: string | null } | null>(
    null
  );
  const [carregando, setCarregando] = useState(true);
  const [semAcesso, setSemAcesso] = useState(false);
  const [aba, setAba] = useState<Aba>('hoje');

  const carregar = useCallback(async () => {
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario.user) {
      setSemAcesso(true);
      setCarregando(false);
      return;
    }
    const { data } = await supabase
      .from('pacientes')
      .select('id, nome_completo, criado_em')
      .eq('user_id', usuario.user.id)
      .single();
    if (!data) {
      setSemAcesso(true);
      setCarregando(false);
      return;
    }
    setSemAcesso(false);
    setPaciente({ id: data.id, nome: data.nome_completo, desde: data.criado_em ?? null });
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  if (semAcesso || !paciente) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-texto text-center mb-4">
          Você ainda não tem acesso ao portal, ou a sessão expirou.
        </Text>
        <Link href="/portal/login" asChild>
          <Pressable className="bg-primaria rounded-xl py-3 px-6 items-center">
            <Text className="text-white font-semibold">Entrar</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-6"
      contentContainerClassName="w-full max-w-2xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-texto text-2xl font-bold mb-1">Olá, {paciente.nome}</Text>
      <Text className="text-secundario mb-4">Seu acompanhamento</Text>

      <View className="flex-row bg-superficie border border-borda rounded-xl p-1 mb-5">
        {ABAS.map((a) => {
          const ativo = aba === a.id;
          return (
            <Pressable
              key={a.id}
              onPress={() => setAba(a.id)}
              className={`flex-1 py-2 rounded-lg items-center ${ativo ? 'bg-primaria' : ''}`}>
              <Text
                className={`text-sm font-semibold ${ativo ? 'text-white' : 'text-secundario'}`}>
                {a.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {aba === 'hoje' && <SecaoHoje pacienteId={paciente.id} />}
      {aba === 'evolucao' && <SecaoEvolucao pacienteId={paciente.id} desde={paciente.desde} />}
      {aba === 'tratamento' && <SecaoTratamento pacienteId={paciente.id} />}
    </ScrollView>
  );
}
