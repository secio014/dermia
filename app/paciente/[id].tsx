import { useCallback, useState } from 'react';
import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { GRAUS_CLINICOS } from '@/.lib/scq';
import { supabase } from '@/.lib/supabase';

type Paciente = { id: string; nome_completo: string; codigo_pseudonimo: string; user_id: string | null };
type Lesao = {
  id: string;
  scq_percentual: number | null;
  scq_tabela: string | null;
  grau_clinico: string | null;
  status: string;
  data_ocorrencia: string | null;
  regiao_corporal: string;
};
type Exercicio = {
  id: string;
  titulo: string;
  series: number | null;
  repeticoes: number | null;
  frequencia_semanal: number | null;
  ativo: boolean;
};
type Adesao = { exercicio_id: string; execucoes_30d: number; adesao_percentual: number | null };

function rotuloGrau(grau: string | null): string {
  return GRAUS_CLINICOS.find((g) => g.id === grau)?.rotulo ?? 'Grau não informado';
}

export default function DetalhePaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [lesoes, setLesoes] = useState<Lesao[]>([]);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [adesoes, setAdesoes] = useState<Adesao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [emailPortal, setEmailPortal] = useState('');
  const [criandoAcesso, setCriandoAcesso] = useState(false);
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null);
  const [erroAcesso, setErroAcesso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const [{ data: p }, { data: l }, { data: e }, { data: a }] = await Promise.all([
      supabase.from('pacientes').select('id, nome_completo, codigo_pseudonimo, user_id').eq('id', id).single(),
      supabase
        .from('lesoes')
        .select('id, scq_percentual, scq_tabela, grau_clinico, status, data_ocorrencia, regiao_corporal')
        .eq('paciente_id', id)
        .order('data_ocorrencia', { ascending: false }),
      supabase
        .from('exercicios_prescritos')
        .select('id, titulo, series, repeticoes, frequencia_semanal, ativo')
        .eq('paciente_id', id)
        .eq('ativo', true)
        .order('criado_em', { ascending: false }),
      supabase.from('vw_adesao_exercicios').select('exercicio_id, execucoes_30d, adesao_percentual').eq('paciente_id', id),
    ]);
    setPaciente(p);
    setLesoes(l ?? []);
    setExercicios(e ?? []);
    setAdesoes((a as Adesao[]) ?? []);
    setCarregando(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function criarAcessoPortal() {
    if (!emailPortal.trim()) {
      setErroAcesso('Informe o e-mail do paciente.');
      return;
    }
    setErroAcesso(null);
    setCriandoAcesso(true);

    const { data, error } = await supabase.functions.invoke('criar-acesso-paciente', {
      body: { paciente_id: id, email: emailPortal.trim() },
    });

    setCriandoAcesso(false);
    if (error) {
      setErroAcesso(error.message);
      return;
    }
    setSenhaTemporaria(data.senha_temporaria);
    carregar();
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color="#0E5FD8" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-fundo px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-texto text-xl font-bold mb-1">{paciente?.nome_completo}</Text>
      <Text className="text-secundario mb-6">{paciente?.codigo_pseudonimo}</Text>

      <Text className="text-texto font-semibold mb-2">Lesões</Text>
      {lesoes.length === 0 ? (
        <Text className="text-secundario mb-4">Nenhuma lesão registrada ainda.</Text>
      ) : (
        lesoes.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(`/paciente/${id}/lesao/${item.id}`)}
            className="bg-superficie border border-borda rounded-xl p-4 mb-3">
            <View className="flex-row justify-between mb-1">
              <Text className="text-texto font-semibold">
                {item.data_ocorrencia
                  ? new Date(item.data_ocorrencia).toLocaleDateString('pt-BR')
                  : 'Data não informada'}
              </Text>
              <Text className="text-secundario text-xs">
                {item.scq_tabela === 'wallace_pediatrico' ? 'Pediátrico' : 'Adulto'}
              </Text>
            </View>
            <Text className="text-secundario">
              {item.regiao_corporal} · SCQ {item.scq_percentual ?? 0}% · {rotuloGrau(item.grau_clinico)}
            </Text>
          </Pressable>
        ))
      )}

      <Link href={`/paciente/${id}/lesao/novo`} asChild>
        <Pressable className="bg-primaria rounded-xl py-3 items-center mb-8">
          <Text className="text-superficie font-semibold">+ Nova lesão</Text>
        </Pressable>
      </Link>

      <Text className="text-texto font-semibold mb-2">Exercícios prescritos</Text>
      {exercicios.length === 0 ? (
        <Text className="text-secundario mb-4">Nenhum exercício prescrito ainda.</Text>
      ) : (
        exercicios.map((item) => {
          const adesao = adesoes.find((a) => a.exercicio_id === item.id);
          return (
            <View key={item.id} className="bg-superficie border border-borda rounded-xl p-4 mb-3">
              <Text className="text-texto font-semibold mb-1">{item.titulo}</Text>
              <Text className="text-secundario text-xs">
                {[item.series && `${item.series} séries`, item.repeticoes && `${item.repeticoes} rep.`]
                  .filter(Boolean)
                  .join(' · ')}
                {item.frequencia_semanal ? ` · ${item.frequencia_semanal}x/semana` : ''}
              </Text>
              {adesao?.adesao_percentual != null && (
                <Text className="text-secundario text-xs mt-1">
                  Adesão (30 dias): {adesao.adesao_percentual}% ({adesao.execucoes_30d} execuções)
                </Text>
              )}
            </View>
          );
        })
      )}

      <Link href={`/paciente/${id}/exercicio/novo`} asChild>
        <Pressable className="bg-superficie border border-primaria rounded-xl py-3 items-center mb-8">
          <Text className="text-primaria font-semibold">+ Prescrever exercício</Text>
        </Pressable>
      </Link>

      <Link href={`/paciente/${id}/relatorio`} asChild>
        <Pressable className="bg-superficie border border-borda rounded-xl py-3 items-center mb-8">
          <Text className="text-texto font-semibold">Gerar relatório em PDF</Text>
        </Pressable>
      </Link>

      <Text className="text-texto font-semibold mb-2">Portal do paciente</Text>
      {paciente?.user_id ? (
        <View className="bg-superficie border border-ok rounded-xl p-4 mb-8">
          <Text className="text-ok font-semibold text-xs">Paciente já tem acesso ao portal.</Text>
        </View>
      ) : senhaTemporaria ? (
        <View className="bg-superficie border border-ok rounded-xl p-4 mb-8">
          <Text className="text-texto font-semibold mb-1">Acesso criado!</Text>
          <Text className="text-secundario text-xs mb-2">Repasse esses dados ao paciente:</Text>
          <Text className="text-texto text-xs">E-mail: {emailPortal}</Text>
          <Text className="text-texto text-xs">Senha temporária: {senhaTemporaria}</Text>
        </View>
      ) : (
        <View className="mb-8">
          <TextInput
            value={emailPortal}
            onChangeText={setEmailPortal}
            placeholder="E-mail do paciente"
            placeholderTextColor="#5B6B7F"
            autoCapitalize="none"
            keyboardType="email-address"
            className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
          />
          {erroAcesso && <Text className="text-risco mb-3">{erroAcesso}</Text>}
          <Pressable
            onPress={criarAcessoPortal}
            disabled={criandoAcesso}
            className="bg-superficie border border-borda rounded-xl py-3 items-center">
            {criandoAcesso ? (
              <ActivityIndicator color="#0E5FD8" />
            ) : (
              <Text className="text-texto font-semibold">Criar acesso ao portal</Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
