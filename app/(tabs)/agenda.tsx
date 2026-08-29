import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { palette } from '@/constants/Colors';
import { useTema } from '@/.lib/tema';
import {
  diasDaSemana,
  inicioDaSemana,
  listarConsultas,
  mesmaData,
  HORA_INICIO,
  HORA_FIM,
  type ConsultaComPaciente,
  type StatusConsulta,
} from '@/.lib/agenda';

const ALTURA_HORA = 56;
const LARGURA_DIA = 116;
const DIAS_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function corStatus(status: StatusConsulta): string {
  if (status === 'realizada') return palette.ok;
  if (status === 'faltou' || status === 'cancelada') return palette.risco;
  return palette.primaria;
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function TelaAgenda() {
  const { cores } = useTema();
  const [ref, setRef] = useState(() => new Date());
  const [consultas, setConsultas] = useState<ConsultaComPaciente[]>([]);
  const [carregando, setCarregando] = useState(true);

  const dias = useMemo(() => diasDaSemana(ref), [ref]);
  const horas = useMemo(
    () => Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => HORA_INICIO + i),
    []
  );

  const carregar = useCallback(async () => {
    const inicio = inicioDaSemana(ref);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 7);
    setConsultas(await listarConsultas(inicio, fim));
    setCarregando(false);
  }, [ref]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  function mudarSemana(delta: number) {
    const d = new Date(ref);
    d.setDate(d.getDate() + delta * 7);
    setRef(d);
  }

  const proximas = useMemo(() => {
    const agora = new Date();
    return [...consultas]
      .filter((c) => new Date(c.inicio_em) >= agora && c.status === 'agendada')
      .sort((a, b) => a.inicio_em.localeCompare(b.inicio_em));
  }, [consultas]);

  const rotuloSemana = `${dias[0].toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })} – ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;

  return (
    <View className="flex-1 bg-fundo">
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-texto text-2xl font-bold">Agenda</Text>
        <Pressable
          onPress={() => router.push('/consulta/nova')}
          className="bg-primaria rounded-xl px-3 py-2 flex-row items-center gap-1.5">
          <Ionicons name="add" size={18} color="#fff" />
          <Text className="text-white font-semibold text-sm">Consulta</Text>
        </Pressable>
      </View>

      <View className="px-4 pb-2 flex-row items-center gap-2">
        <Pressable onPress={() => mudarSemana(-1)} className="p-1.5">
          <Ionicons name="chevron-back" size={20} color={cores.secundario} />
        </Pressable>
        <Text className="text-texto font-semibold flex-1 text-center">{rotuloSemana}</Text>
        <Pressable onPress={() => mudarSemana(1)} className="p-1.5">
          <Ionicons name="chevron-forward" size={20} color={cores.secundario} />
        </Pressable>
        <Pressable
          onPress={() => setRef(new Date())}
          className="border border-borda rounded-lg px-2.5 py-1.5">
          <Text className="text-secundario text-xs font-semibold">Hoje</Text>
        </Pressable>
      </View>

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.primaria} />
        </View>
      ) : (
        <ScrollView className="flex-1">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row px-4 pb-4">
              {/* coluna de horas */}
              <View style={{ width: 44 }} className="pt-8">
                {horas.map((h) => (
                  <View key={h} style={{ height: ALTURA_HORA }}>
                    <Text className="text-secundario text-[10px]">{`${h}h`}</Text>
                  </View>
                ))}
              </View>

              {dias.map((dia, i) => {
                const hoje = mesmaData(dia, new Date());
                const doDia = consultas.filter((c) => mesmaData(new Date(c.inicio_em), dia));
                return (
                  <View key={i} style={{ width: LARGURA_DIA }} className="border-l border-borda">
                    <View className={`items-center pb-1 ${hoje ? '' : ''}`}>
                      <Text className="text-secundario text-[11px] font-semibold">
                        {DIAS_LABEL[i]}
                      </Text>
                      <View
                        className={`w-7 h-7 items-center justify-center rounded-full ${
                          hoje ? 'bg-primaria' : ''
                        }`}>
                        <Text
                          className={`text-xs font-bold ${hoje ? 'text-white' : 'text-texto'}`}>
                          {dia.getDate()}
                        </Text>
                      </View>
                    </View>

                    <View style={{ height: horas.length * ALTURA_HORA }}>
                      {horas.map((h) => (
                        <View
                          key={h}
                          style={{ height: ALTURA_HORA }}
                          className="border-t border-borda"
                        />
                      ))}

                      {doDia.map((c) => {
                        const d = new Date(c.inicio_em);
                        const top =
                          (d.getHours() - HORA_INICIO + d.getMinutes() / 60) * ALTURA_HORA;
                        const altura = Math.max((c.duracao_min / 60) * ALTURA_HORA, 22);
                        if (top < -altura || top > horas.length * ALTURA_HORA) return null;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => router.push(`/consulta/${c.id}`)}
                            style={{
                              position: 'absolute',
                              top,
                              left: 3,
                              right: 3,
                              height: altura,
                              backgroundColor: corStatus(c.status),
                              borderRadius: 8,
                              padding: 4,
                              opacity: c.status === 'cancelada' ? 0.5 : 1,
                            }}>
                            <Text className="text-white text-[10px] font-bold" numberOfLines={1}>
                              {hhmm(c.inicio_em)}
                            </Text>
                            <Text className="text-white text-[10px]" numberOfLines={1}>
                              {c.paciente?.codigo_pseudonimo ?? 'Paciente'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View className="px-4 pb-10 w-full max-w-3xl self-center">
            <Text className="text-texto font-bold mb-2">Próximas consultas</Text>
            {proximas.length === 0 ? (
              <Text className="text-secundario text-sm">Nada agendado nesta semana.</Text>
            ) : (
              proximas.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/consulta/${c.id}`)}
                  className="bg-superficie border border-borda rounded-xl p-3 mb-2 flex-row items-center gap-3">
                  <View className="items-center">
                    <Text className="text-texto font-bold text-xs">
                      {new Date(c.inicio_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </Text>
                    <Text className="text-secundario text-xs">{hhmm(c.inicio_em)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-texto font-semibold" numberOfLines={1}>
                      {c.paciente?.nome_completo ?? c.paciente?.codigo_pseudonimo ?? 'Paciente'}
                    </Text>
                    {c.motivo ? (
                      <Text className="text-secundario text-xs" numberOfLines={1}>
                        {c.motivo}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={cores.secundario} />
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
