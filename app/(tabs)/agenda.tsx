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
import { useLargo } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';
import {
  diasDaSemana,
  inicioDaSemana,
  listarConsultas,
  listarProximasConsultas,
  mesmaData,
  ESTILO_STATUS,
  HORA_INICIO,
  HORA_FIM,
  type ConsultaComPaciente,
  type StatusConsulta,
} from '@/.lib/agenda';

const ALTURA_HORA = 56;
const LARGURA_DIA = 116;
const DIAS_LABEL = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type FiltroData = 'todas' | 'hoje' | 'semana' | 'mes';
const FILTROS_DATA: { id: FiltroData; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'semana', rotulo: '7 dias' },
  { id: 'mes', rotulo: '30 dias' },
];

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function TelaAgenda() {
  const { cores } = useTema();
  const largo = useLargo();
  const [ref, setRef] = useState(() => new Date());
  const [consultas, setConsultas] = useState<ConsultaComPaciente[]>([]);
  const [todasProximas, setTodasProximas] = useState<ConsultaComPaciente[]>([]);
  const [filtroData, setFiltroData] = useState<FiltroData>('todas');
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
    const [daSemana, proximasTodas] = await Promise.all([
      listarConsultas(inicio, fim),
      listarProximasConsultas(),
    ]);
    setConsultas(daSemana);
    setTodasProximas(proximasTodas);
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
    if (filtroData === 'todas') return todasProximas;
    const limite = new Date();
    if (filtroData === 'hoje') limite.setHours(23, 59, 59, 999);
    else if (filtroData === 'semana') limite.setDate(limite.getDate() + 7);
    else if (filtroData === 'mes') limite.setDate(limite.getDate() + 30);
    return todasProximas.filter((c) => new Date(c.inicio_em) <= limite);
  }, [todasProximas, filtroData]);

  const rotuloSemana = `${dias[0].toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })} – ${dias[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;

  const listaProximas = (
    <>
      <Text className="text-texto font-bold mb-2">
        Próximas consultas{todasProximas.length > 0 ? ` (${proximas.length})` : ''}
      </Text>

      <View className="flex-row flex-wrap gap-2 mb-3">
        {FILTROS_DATA.map((f) => {
          const ativo = filtroData === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFiltroData(f.id)}
              className={`rounded-full px-3 py-1.5 border ${
                ativo ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
              }`}>
              <Text className={`text-xs font-semibold ${ativo ? 'text-white' : 'text-secundario'}`}>
                {f.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {proximas.length === 0 ? (
        <Text className="text-secundario text-sm">
          {todasProximas.length === 0
            ? 'Nenhuma consulta agendada.'
            : 'Nada nesse período.'}
        </Text>
      ) : (
        proximas.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(`/consulta/${c.id}`)}
            className="bg-superficie border border-borda rounded-xl p-3 mb-2 flex-row items-center gap-3">
            <View className="items-center w-12">
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
              <Text className="text-secundario text-xs" numberOfLines={1}>
                {new Date(c.inicio_em).toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'long',
                })}
                {c.motivo ? ` · ${c.motivo}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={cores.secundario} />
          </Pressable>
        ))
      )}
    </>
  );

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

      <View className="px-4 pb-2 flex-row flex-wrap gap-x-3 gap-y-1">
        {(Object.keys(ESTILO_STATUS) as StatusConsulta[]).map((s) => {
          const est = ESTILO_STATUS[s];
          return (
            <View key={s} className="flex-row items-center gap-1">
              <View
                style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: est.cor }}
              />
              <Text
                className="text-secundario text-[11px]"
                style={est.riscado ? { textDecorationLine: 'line-through' } : undefined}>
                {est.rotulo}
              </Text>
            </View>
          );
        })}
      </View>

      {carregando ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={palette.primaria} />
        </View>
      ) : (
        <View className={largo ? 'flex-1 flex-row' : 'flex-1'}>
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
                        const est = ESTILO_STATUS[c.status];
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
                              backgroundColor: est.cor,
                              borderRadius: 8,
                              padding: 4,
                              opacity: est.opacidade ?? 1,
                            }}>
                            <Text
                              className="text-white text-[10px] font-bold"
                              numberOfLines={1}
                              style={est.riscado ? { textDecorationLine: 'line-through' } : undefined}>
                              {hhmm(c.inicio_em)}
                            </Text>
                            <Text
                              className="text-white text-[10px]"
                              numberOfLines={1}
                              style={est.riscado ? { textDecorationLine: 'line-through' } : undefined}>
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

          {!largo && (
            <View className="px-4 pb-10 w-full max-w-3xl self-center">{listaProximas}</View>
          )}
        </ScrollView>

        {largo && (
          <ScrollView
            className="border-l border-borda"
            style={{ width: 340 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {listaProximas}
          </ScrollView>
        )}
        </View>
      )}
    </View>
  );
}
