import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { palette } from '@/constants/Colors';
import { supabase } from '@/.lib/supabase';

type Exercicio = {
  id: string;
  titulo: string;
  instrucoes: string | null;
  series: number | null;
  repeticoes: number | null;
  frequencia_semanal: number | null;
};

export default function SecaoHoje({ pacienteId }: { pacienteId: string }) {
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [feitosHoje, setFeitosHoje] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const [{ data: e }, { data: execs }] = await Promise.all([
      supabase
        .from('exercicios_prescritos')
        .select('id, titulo, instrucoes, series, repeticoes, frequencia_semanal')
        .eq('paciente_id', pacienteId)
        .eq('ativo', true),
      supabase.from('execucoes_exercicio').select('exercicio_id, data').eq('data', hoje),
    ]);
    setExercicios((e as Exercicio[]) ?? []);
    setFeitosHoje(new Set((execs ?? []).map((x) => x.exercicio_id as string)));
    setCarregando(false);
  }, [pacienteId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function marcarFeito(exercicioId: string) {
    const { error } = await supabase.from('execucoes_exercicio').insert({ exercicio_id: exercicioId });
    if (!error) setFeitosHoje((atual) => new Set(atual).add(exercicioId));
  }

  if (carregando) {
    return (
      <View className="py-10 items-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  const pendentes = exercicios.filter((e) => !feitosHoje.has(e.id));

  return (
    <View>
      {pendentes.length > 0 && (
        <View className="bg-primaria-suave border border-atencao rounded-xl p-3 mb-4">
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
              {item.instrucoes && (
                <Text className="text-secundario text-xs mb-1">{item.instrucoes}</Text>
              )}
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
                <Text className="text-white font-semibold text-xs">
                  {feito ? '✓ Feito hoje' : 'Marcar como feito hoje'}
                </Text>
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}
