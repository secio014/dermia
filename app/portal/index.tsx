import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { palette } from '@/constants/Colors';
import CartaoClinica from '@/components/portal/CartaoClinica';
import SecaoHoje from '@/components/portal/SecaoHoje';
import SecaoEvolucao from '@/components/portal/SecaoEvolucao';
import SecaoTratamento from '@/components/portal/SecaoTratamento';
import SecaoConta from '@/components/portal/SecaoConta';
import BotaoTema from '@/components/ui/BotaoTema';
import LogoDermia from '@/components/ui/LogoDermia';
import { supabase } from '@/.lib/supabase';

type Aba = 'hoje' | 'evolucao' | 'tratamento' | 'conta';
const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'evolucao', rotulo: 'Evolução' },
  { id: 'tratamento', rotulo: 'Tratamento' },
  { id: 'conta', rotulo: 'Conta' },
];

// O portal do paciente não tem header nativo — só esta barrinha: o ícone e o
// alternador de tema claro/escuro.
function TopoPortal() {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <LogoDermia size={24} />
      <BotaoTema size={20} />
    </View>
  );
}

export default function PortalPaciente() {
  const [paciente, setPaciente] = useState<{
    id: string;
    nome: string;
    desde: string | null;
    clinicaId: string | null;
    responsavelId: string | null;
  } | null>(null);
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
      .select('id, nome_completo, criado_em, clinica_id, criado_por')
      .eq('user_id', usuario.user.id)
      .single();
    if (!data) {
      setSemAcesso(true);
      setCarregando(false);
      return;
    }
    setSemAcesso(false);
    setPaciente({
      id: data.id,
      nome: data.nome_completo,
      desde: data.criado_em ?? null,
      clinicaId: data.clinica_id ?? null,
      responsavelId: data.criado_por ?? null,
    });
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  return (
    <View className="flex-1 bg-fundo">
      <TopoPortal />

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.primaria} />
        </View>
      ) : semAcesso || !paciente ? (
        <View className="flex-1 items-center justify-center px-8">
          <LogoDermia size={44} />
          <Text className="text-texto text-lg font-semibold text-center mt-4 mb-1">
            Portal do Paciente
          </Text>
          <Text className="text-secundario text-center mb-6 max-w-sm">
            Esta conta não tem acesso ao Portal do Paciente, ou a sessão expirou. Entre com o
            e-mail e a senha que a sua clínica te passou.
          </Text>
          <Pressable
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/login');
            }}
            className="bg-primaria rounded-xl py-3 px-6 items-center mb-3">
            <Text className="text-white font-semibold">Entrar com outra conta</Text>
          </Pressable>
          <Pressable onPress={() => router.replace('/')} className="py-2">
            <Text className="text-primaria font-medium">Voltar ao site</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-2"
          contentContainerClassName="w-full max-w-2xl self-center"
          contentContainerStyle={{ paddingBottom: 40 }}>
          <Text className="text-texto text-2xl font-bold mb-1">Olá, {paciente.nome}</Text>
          <Text className="text-secundario mb-4">Seu acompanhamento</Text>

          <CartaoClinica clinicaId={paciente.clinicaId} responsavelId={paciente.responsavelId} />

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
          {aba === 'conta' && <SecaoConta />}
        </ScrollView>
      )}
    </View>
  );
}
