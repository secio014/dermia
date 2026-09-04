import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Link, router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PacienteCard, { type PainelPaciente } from '@/components/PacienteCard';
import { palette } from '@/constants/Colors';
import { useLargo } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

type Filtro = 'todos' | 'criticos' | 'atencao' | 'pendentes';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'criticos', rotulo: 'Críticos' },
  { id: 'atencao', rotulo: 'Em atenção' },
  { id: 'pendentes', rotulo: 'Com pendência' },
];

function Estatistica({
  icone,
  valor,
  rotulo,
  cor,
}: {
  icone: React.ComponentProps<typeof Ionicons>['name'];
  valor: number;
  rotulo: string;
  cor: string;
}) {
  return (
    <View className="bg-superficie border border-borda rounded-2xl p-3 flex-1 min-w-[140px]">
      <Ionicons name={icone} size={18} color={cor} />
      <Text className="text-texto text-2xl font-bold mt-1">{valor}</Text>
      <Text className="text-secundario text-xs">{rotulo}</Text>
    </View>
  );
}

export default function TelaInicio() {
  const { cores } = useTema();
  const largo = useLargo();
  const [pacientes, setPacientes] = useState<PainelPaciente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const carregar = useCallback(async () => {
    const { data } = await supabase
      .from('vw_painel_pacientes')
      .select('*')
      .order('prioridade', { ascending: true });
    setPacientes((data as PainelPaciente[] | null) ?? []);
    setCarregando(false);
    setAtualizando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const stats = useMemo(
    () => ({
      ativos: pacientes.length,
      criticos: pacientes.filter((p) => p.prioridade === 1).length,
      atencao: pacientes.filter((p) => p.prioridade === 2).length,
      pendentes: pacientes.reduce((s, p) => s + (p.analises_pendentes ?? 0), 0),
    }),
    [pacientes]
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pacientes.filter((p) => {
      if (filtro === 'criticos' && p.prioridade !== 1) return false;
      if (filtro === 'atencao' && p.prioridade !== 2) return false;
      if (filtro === 'pendentes' && (p.analises_pendentes ?? 0) === 0) return false;
      if (!termo) return true;
      return (
        p.codigo_pseudonimo?.toLowerCase().includes(termo) ||
        p.regiao_corporal?.toLowerCase().includes(termo)
      );
    });
  }, [pacientes, busca, filtro]);

  const cabecalho = (
    <View className="pt-4">
      <Text className="text-texto text-2xl font-bold mb-1">Início</Text>
      <Text className="text-secundario mb-4">Acompanhamento das lesões ativas</Text>

      <View className="flex-row flex-wrap gap-2 mb-4">
        <Estatistica icone="people-outline" valor={stats.ativos} rotulo="Pacientes ativos" cor={palette.primaria} />
        <Estatistica icone="alert-circle-outline" valor={stats.criticos} rotulo="Críticos" cor={palette.risco} />
        <Estatistica icone="time-outline" valor={stats.atencao} rotulo="Em atenção" cor={palette.atencao} />
        <Estatistica icone="camera-outline" valor={stats.pendentes} rotulo="Análises pendentes" cor={palette.primaria} />
      </View>

      <Link href="/paciente/novo" asChild>
        <Pressable className="bg-primaria rounded-xl py-3.5 flex-row items-center justify-center gap-2 mb-4">
          <Ionicons name="add" size={20} color="#fff" />
          <Text className="text-white font-semibold">Novo paciente</Text>
        </Pressable>
      </Link>

      <View className="flex-row items-center bg-superficie border border-borda rounded-xl px-3 mb-3">
        <Ionicons name="search-outline" size={18} color={cores.secundario} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por código ou região"
          placeholderTextColor={cores.secundario}
          className="flex-1 py-2.5 px-2 text-texto"
        />
      </View>

      <View className="flex-row flex-wrap gap-2 mb-3">
        {FILTROS.map((f) => {
          const ativo = filtro === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFiltro(f.id)}
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
    </View>
  );

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-fundo px-5">
      <FlatList
        data={lista}
        key={largo ? 'grade-2' : 'grade-1'}
        numColumns={largo ? 2 : 1}
        columnWrapperStyle={largo ? { gap: 16 } : undefined}
        keyExtractor={(item) => item.lesao_id ?? item.paciente_id}
        ListHeaderComponent={cabecalho}
        contentContainerClassName="pb-8 w-full max-w-5xl self-center"
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => {
              setAtualizando(true);
              carregar();
            }}
            tintColor={palette.primaria}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center px-8 py-16">
            <Ionicons name="clipboard-outline" size={32} color={cores.secundario} />
            <Text className="text-texto text-base font-semibold mt-3 mb-1 text-center">
              {pacientes.length === 0 ? 'Nenhum paciente com lesão ativa' : 'Nada nesse filtro'}
            </Text>
            <Text className="text-secundario text-center text-sm">
              {pacientes.length === 0
                ? 'Toque em "Novo paciente" para cadastrar o primeiro.'
                : 'Ajuste a busca ou o filtro acima.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/paciente/${item.paciente_id}`)}
            className={largo ? 'flex-1' : undefined}>
            <PacienteCard paciente={item} />
          </Pressable>
        )}
      />
    </View>
  );
}
