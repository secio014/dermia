import { useCallback, useState } from 'react';
import { Link, useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { supabase } from '@/.lib/supabase';

type Exercicio = {
  id: string;
  titulo: string;
  instrucoes: string | null;
  video_url: string | null;
  series: number | null;
  repeticoes: number | null;
  frequencia_semanal: number | null;
};

export default function PortalPaciente() {
  const [nome, setNome] = useState<string | null>(null);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [feitosHoje, setFeitosHoje] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [semAcesso, setSemAcesso] = useState(false);

  const carregar = useCallback(async () => {
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario.user) {
      setSemAcesso(true);
      setCarregando(false);
      return;
    }

    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id, nome_completo')
      .eq('user_id', usuario.user.id)
      .single();

    if (!paciente) {
      setSemAcesso(true);
      setCarregando(false);
      return;
    }
    setSemAcesso(false);
    setNome(paciente.nome_completo);

    const hoje = new Date().toISOString().slice(0, 10);
    const [{ data: e }, { data: execs }] = await Promise.all([
      supabase
        .from('exercicios_prescritos')
        .select('id, titulo, instrucoes, video_url, series, repeticoes, frequencia_semanal')
        .eq('paciente_id', paciente.id)
        .eq('ativo', true),
      supabase.from('execucoes_exercicio').select('exercicio_id, data').eq('data', hoje),
    ]);

    setExercicios((e as Exercicio[]) ?? []);
    setFeitosHoje(new Set((execs ?? []).map((x) => x.exercicio_id as string)));
    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function marcarFeito(exercicioId: string) {
    const { error } = await supabase.from('execucoes_exercicio').insert({ exercicio_id: exercicioId });
    if (!error) {
      setFeitosHoje((atual) => new Set(atual).add(exercicioId));
    }
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color="#0E5FD8" />
      </View>
    );
  }

  if (semAcesso) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center px-8">
        <Text className="text-texto text-center mb-4">
          Você ainda não tem acesso ao portal, ou a sessão expirou.
        </Text>
        <Link href="/portal/login" asChild>
          <Pressable className="bg-primaria rounded-xl py-3 px-6 items-center">
            <Text className="text-superficie font-semibold">Entrar</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const pendentes = exercicios.filter((e) => !feitosHoje.has(e.id));

  return (
    <ScrollView className="flex-1 bg-fundo px-4 pt-6" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-texto text-xl font-bold mb-1">Olá, {nome}</Text>
      <Text className="text-secundario mb-6">Seus exercícios de hoje</Text>

      {pendentes.length > 0 && (
        <View className="bg-atencao/10 border border-atencao rounded-xl p-3 mb-4">
          <Text className="text-atencao text-xs font-semibold">
            Você ainda tem {pendentes.length} exercício(s) pendente(s) hoje.
          </Text>
        </View>
      )}

      {exercicios.length === 0 ? (
        <Text className="text-secundario">Nenhum exercício prescrito no momento.</Text>
      ) : (
        exercicios.map((item) => {
          const feito = feitosHoje.has(item.id);
          return (
            <View key={item.id} className="bg-superficie border border-borda rounded-xl p-4 mb-3">
              <Text className="text-texto font-semibold mb-1">{item.titulo}</Text>
              {item.instrucoes && <Text className="text-secundario text-xs mb-1">{item.instrucoes}</Text>}
              <Text className="text-secundario text-xs mb-3">
                {[item.series && `${item.series} séries`, item.repeticoes && `${item.repeticoes} rep.`]
                  .filter(Boolean)
                  .join(' · ')}
                {item.frequencia_semanal ? ` · ${item.frequencia_semanal}x/semana` : ''}
              </Text>
              <Pressable
                onPress={() => !feito && marcarFeito(item.id)}
                disabled={feito}
                className={`rounded-xl py-2.5 items-center ${feito ? 'bg-ok' : 'bg-primaria'}`}>
                <Text className="text-superficie font-semibold text-xs">
                  {feito ? '✓ Feito hoje' : 'Marcar como feito hoje'}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
