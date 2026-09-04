import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Link, router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PacienteCard, { type PainelPaciente } from '@/components/PacienteCard';
import Protegido from '@/components/Protegido';
import { palette } from '@/constants/Colors';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

type Grupo = 'lesao' | 'sem';
type Filtro = 'todos' | 'criticos' | 'atencao' | 'pendentes';
type FiltroSem = 'todos' | 'curado' | 'sem_lesao';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'criticos', rotulo: 'Críticos' },
  { id: 'atencao', rotulo: 'Em atenção' },
  { id: 'pendentes', rotulo: 'Com pendência' },
];

const FILTROS_SEM: { id: FiltroSem; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'curado', rotulo: 'Alta' },
  { id: 'sem_lesao', rotulo: 'Sem lesão registrada' },
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

type SemLesao = {
  id: string;
  nome: string;
  codigo: string;
  situacao: 'curado' | 'sem_lesao';
};

export default function Painel() {
  return (
    <Protegido permissao="gerenciar_pacientes">
      <TelaInicio />
    </Protegido>
  );
}

function TelaInicio() {
  const { cores } = useTema();
  const [pacientes, setPacientes] = useState<PainelPaciente[]>([]);
  const [semLesao, setSemLesao] = useState<SemLesao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<Grupo>('lesao');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [filtroSem, setFiltroSem] = useState<FiltroSem>('todos');

  const carregar = useCallback(async () => {
    const [{ data: painel }, { data: todos }] = await Promise.all([
      supabase.from('vw_painel_pacientes').select('*').order('prioridade', { ascending: true }),
      supabase
        .from('pacientes')
        .select('id, nome_completo, codigo_pseudonimo, lesoes(status)')
        .order('nome_completo', { ascending: true }),
    ]);

    const ativos = (painel as PainelPaciente[] | null) ?? [];
    setPacientes(ativos);

    const comLesaoAtiva = new Set(ativos.map((p) => p.paciente_id));
    type LinhaPaciente = {
      id: string;
      nome_completo: string;
      codigo_pseudonimo: string;
      lesoes: { status: string }[] | null;
    };
    setSemLesao(
      ((todos as LinhaPaciente[] | null) ?? [])
        .filter((p) => !comLesaoAtiva.has(p.id))
        .map((p) => ({
          id: p.id,
          nome: p.nome_completo,
          codigo: p.codigo_pseudonimo,
          situacao: (p.lesoes?.length ?? 0) > 0 ? ('curado' as const) : ('sem_lesao' as const),
        }))
    );

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

  const semLesaoLista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return semLesao.filter((p) => {
      if (filtroSem !== 'todos' && p.situacao !== filtroSem) return false;
      if (!termo) return true;
      return p.codigo.toLowerCase().includes(termo) || p.nome.toLowerCase().includes(termo);
    });
  }, [semLesao, busca, filtroSem]);

  const cabecalho = (
    <View className="pt-4">
      <Text className="text-texto text-2xl font-bold mb-1">Início</Text>
      <Text className="text-secundario mb-4">
        Pacientes ativos (com lesão em acompanhamento) e inativos.
      </Text>

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

      {/* Alterna entre os dois grupos de pacientes. */}
      <View className="flex-row bg-superficie border border-borda rounded-xl p-1 mb-3">
        {(
          [
            ['lesao', 'flame-outline', 'Ativos', pacientes.length],
            ['sem', 'checkmark-done-outline', 'Inativos', semLesao.length],
          ] as [Grupo, React.ComponentProps<typeof Ionicons>['name'], string, number][]
        ).map(([id, icone, rotulo, n]) => {
          const on = grupo === id;
          return (
            <Pressable
              key={id}
              onPress={() => setGrupo(id)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg ${
                on ? 'bg-primaria' : ''
              }`}>
              <Ionicons name={icone} size={15} color={on ? '#fff' : cores.secundario} />
              <Text className={`text-xs font-semibold ${on ? 'text-white' : 'text-secundario'}`}>
                {rotulo}
              </Text>
              <View
                className={`rounded-full px-1.5 ${on ? 'bg-white/25' : 'bg-fundo border border-borda'}`}>
                <Text
                  className={`font-bold ${on ? 'text-white' : 'text-secundario'}`}
                  style={{ fontSize: 11 }}>
                  {n}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row items-center bg-superficie border border-borda rounded-xl px-3 mb-3">
        <Ionicons name="search-outline" size={18} color={cores.secundario} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder={grupo === 'lesao' ? 'Buscar por código ou região' : 'Buscar por código ou nome'}
          placeholderTextColor={cores.secundario}
          className="flex-1 py-2.5 px-2 text-texto"
        />
      </View>

      <View className="flex-row flex-wrap gap-2 mb-4">
        {grupo === 'lesao'
          ? FILTROS.map((f) => {
              const ativo = filtro === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFiltro(f.id)}
                  className={`rounded-full px-3 py-1.5 border ${
                    ativo ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
                  }`}>
                  <Text
                    className={`text-xs font-semibold ${ativo ? 'text-white' : 'text-secundario'}`}>
                    {f.rotulo}
                  </Text>
                </Pressable>
              );
            })
          : FILTROS_SEM.map((f) => {
              const ativo = filtroSem === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFiltroSem(f.id)}
                  className={`rounded-full px-3 py-1.5 border ${
                    ativo ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
                  }`}>
                  <Text
                    className={`text-xs font-semibold ${ativo ? 'text-white' : 'text-secundario'}`}>
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

  const vazio = (icone: React.ComponentProps<typeof Ionicons>['name'], texto: string) => (
    <View className="items-center justify-center px-6 py-16 bg-superficie border border-borda rounded-xl">
      <Ionicons name={icone} size={30} color={cores.secundario} />
      <Text className="text-secundario text-center text-sm mt-2">{texto}</Text>
    </View>
  );

  const conteudo =
    grupo === 'lesao' ? (
      lista.length === 0 ? (
        vazio(
          'clipboard-outline',
          pacientes.length === 0
            ? 'Nenhum paciente com lesão ativa. Toque em "Novo paciente" para começar.'
            : 'Nada nesse filtro ou nessa busca.'
        )
      ) : (
        lista.map((item) => (
          <Pressable
            key={item.lesao_id ?? item.paciente_id}
            onPress={() => router.push(`/paciente/${item.paciente_id}`)}>
            <PacienteCard paciente={item} />
          </Pressable>
        ))
      )
    ) : semLesaoLista.length === 0 ? (
      vazio(
        'people-outline',
        semLesao.length === 0
          ? 'Nenhum paciente inativo (todos têm lesão em acompanhamento).'
          : 'Nada nesse filtro ou nessa busca.'
      )
    ) : (
      semLesaoLista.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => router.push(`/paciente/${p.id}`)}
          className="bg-superficie border border-borda rounded-xl p-4 mb-3 flex-row items-center">
          <View
            style={{ width: 6, alignSelf: 'stretch', borderRadius: 3 }}
            className={`mr-3 ${p.situacao === 'curado' ? 'bg-ok' : 'bg-borda'}`}
          />
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-texto font-semibold">{p.codigo}</Text>
              <Text
                className={`text-xs font-semibold ${
                  p.situacao === 'curado' ? 'text-ok' : 'text-secundario'
                }`}>
                {p.situacao === 'curado' ? 'Alta' : 'Sem lesão registrada'}
              </Text>
            </View>
            <Text className="text-secundario text-xs">{p.nome}</Text>
          </View>
        </Pressable>
      ))
    );

  return (
    <ScrollView
      className="flex-1 bg-fundo px-5"
      contentContainerClassName="pb-8 w-full max-w-3xl self-center"
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => {
            setAtualizando(true);
            carregar();
          }}
          tintColor={palette.primaria}
        />
      }>
      {cabecalho}
      {conteudo}
    </ScrollView>
  );
}
