import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import Protegido from '@/components/Protegido';
import { palette } from '@/constants/Colors';
import { usePerfilAtual } from '@/.lib/acesso';
import { avisar } from '@/.lib/aviso';
import { ROTULO_TIPO, TIPOS_INSTITUICAO, tipoClinica, type TipoInstituicao } from '@/.lib/instituicoes';
import { useLargo } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

type PacienteAdmin = { id: string; nome_completo: string; codigo_pseudonimo: string };
type MembroEquipe = {
  id: string;
  nome: string;
  papel: string;
  email: string | null;
  ativo: boolean;
  clinica_id?: string | null;
};
type InstituicaoResumo = { id: string; nome: string; tipo: TipoInstituicao };

function confirmar(mensagem: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(mensagem));
  }
  return new Promise((resolve) => {
    Alert.alert('Confirmar', mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

type Indicadores = {
  totalPacientesAtivos: number;
  pacientesCriticos: number;
  adesaoMedia: number | null;
  tempoMedioCicatrizacaoDias: number | null;
};

function CartaoIndicador({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 flex-1">
      <Text className="text-secundario text-xs mb-1">{titulo}</Text>
      <Text className="text-texto text-2xl font-bold">{valor}</Text>
    </View>
  );
}

export default function TelaAdmin() {
  return (
    <Protegido permissao="painel_admin">
      <PainelAdmin />
    </Protegido>
  );
}

function PainelAdmin() {
  const { cores } = useTema();
  const largo = useLargo();
  const { perfil } = usePerfilAtual();
  // `admin_geral` administra a plataforma, não uma clínica — não tem
  // `clinica_id` e não faz parte da equipe de clínica nenhuma.
  const clinicaId = perfil?.clinica_id ?? null;
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [pacientes, setPacientes] = useState<PacienteAdmin[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [instituicoes, setInstituicoes] = useState<InstituicaoResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoRegistro, setNovoRegistro] = useState('');
  const [novoPapel, setNovoPapel] = useState<'fisioterapeuta' | 'estagiario' | 'admin'>(
    'fisioterapeuta'
  );
  const [cadastrando, setCadastrando] = useState(false);
  const [erroEquipe, setErroEquipe] = useState<string | null>(null);
  const [senhaNovoFisio, setSenhaNovoFisio] = useState<{
    email: string;
    senha: string;
    papel: string;
  } | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario.user) {
      setCarregando(false);
      return;
    }

    const [
      { data: painel },
      { data: adesoes },
      { data: lesoesResolvidas },
      { data: listaPacientes },
      { data: listaEquipe },
      { data: listaInstituicoes },
    ] = await Promise.all([
      supabase.from('vw_painel_pacientes').select('prioridade'),
      supabase.from('vw_adesao_exercicios').select('adesao_percentual'),
      supabase.from('lesoes').select('data_ocorrencia, atualizado_em').neq('status', 'ativa'),
      supabase
        .from('pacientes')
        .select('id, nome_completo, codigo_pseudonimo')
        .order('nome_completo', { ascending: true }),
      // Admin de clínica vê só a própria equipe. `admin_geral` não tem
      // clínica — mas tem acesso total, então vê a equipe de todas as
      // clínicas (menos outras contas admin_geral, que não são "equipe").
      clinicaId
        ? supabase
            .from('profissionais')
            .select('id, nome, papel, email, ativo, clinica_id')
            .eq('clinica_id', clinicaId)
            .order('nome', { ascending: true })
        : supabase
            .from('profissionais')
            .select('id, nome, papel, email, ativo, clinica_id')
            .neq('papel', 'admin_geral')
            .order('nome', { ascending: true }),
      // Só precisa do tipo de cada instituição pra agrupar a equipe do
      // admin_geral — o próprio admin de clínica não usa isto.
      clinicaId ? Promise.resolve({ data: [] }) : supabase.from('clinicas').select('*'),
    ]);

    setPacientes((listaPacientes as PacienteAdmin[]) ?? []);
    setEquipe((listaEquipe as MembroEquipe[]) ?? []);
    setInstituicoes(
      ((listaInstituicoes as Record<string, unknown>[]) ?? []).map((c) => ({
        id: c.id as string,
        nome: (c.nome as string) ?? (c.id as string),
        tipo: tipoClinica(c),
      }))
    );

    const adesoesValidas = (adesoes ?? []).map((a) => a.adesao_percentual).filter((v): v is number => v != null);
    const adesaoMedia =
      adesoesValidas.length > 0
        ? Math.round((adesoesValidas.reduce((s, v) => s + v, 0) / adesoesValidas.length) * 10) / 10
        : null;

    const diasCicatrizacao = (lesoesResolvidas ?? [])
      .filter((l) => l.data_ocorrencia)
      .map((l) => {
        const inicio = new Date(l.data_ocorrencia as string).getTime();
        const fim = new Date(l.atualizado_em as string).getTime();
        return Math.max(0, Math.round((fim - inicio) / (1000 * 60 * 60 * 24)));
      });
    const tempoMedioCicatrizacaoDias =
      diasCicatrizacao.length > 0
        ? Math.round(diasCicatrizacao.reduce((s, v) => s + v, 0) / diasCicatrizacao.length)
        : null;

    setIndicadores({
      totalPacientesAtivos: painel?.length ?? 0,
      pacientesCriticos: (painel ?? []).filter((p) => p.prioridade === 1).length,
      adesaoMedia,
      tempoMedioCicatrizacaoDias,
    });

    setCarregando(false);
  }, [clinicaId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  // Só usado quando `clinicaId` é nulo (admin_geral): agrupa a equipe de
  // todas as clínicas por tipo de instituição, pra não virar uma lista única
  // sem contexto de onde cada um trabalha.
  const equipePorTipo = useMemo(() => {
    const nomesPorId = new Map(instituicoes.map((i) => [i.id, i]));
    const grupos = new Map<TipoInstituicao, { nome: string; membros: MembroEquipe[] }[]>(
      TIPOS_INSTITUICAO.map((t) => [t, []])
    );
    const porInstituicao = new Map<string, MembroEquipe[]>();
    for (const m of equipe) {
      const chave = m.clinica_id ?? '';
      if (!porInstituicao.has(chave)) porInstituicao.set(chave, []);
      porInstituicao.get(chave)!.push(m);
    }
    for (const [id, membros] of porInstituicao) {
      const inst = nomesPorId.get(id);
      if (!inst) continue;
      grupos.get(inst.tipo)!.push({ nome: inst.nome, membros });
    }
    for (const lista of grupos.values()) lista.sort((a, b) => a.nome.localeCompare(b.nome));
    return grupos;
  }, [equipe, instituicoes]);

  async function cadastrarFisio() {
    const nome = novoNome.trim();
    const email = novoEmail.trim().toLowerCase();
    if (nome.length < 2) {
      setErroEquipe('Informe o nome completo do novo membro.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErroEquipe('Informe um e-mail válido.');
      return;
    }
    if (equipe.some((m) => (m.email ?? '').toLowerCase() === email)) {
      setErroEquipe('Já existe um membro da equipe com esse e-mail.');
      return;
    }
    setErroEquipe(null);
    setSenhaNovoFisio(null);
    setCadastrando(true);
    const { data, error } = await supabase.functions.invoke('criar-fisioterapeuta', {
      body: { nome, email, registro: novoRegistro.trim() || null, papel: novoPapel },
    });
    setCadastrando(false);
    if (error) {
      setErroEquipe(error.message);
      return;
    }
    setSenhaNovoFisio({
      email: data.email,
      senha: data.senha_temporaria,
      papel: data.papel ?? novoPapel,
    });
    setNovoNome('');
    setNovoEmail('');
    setNovoRegistro('');
    setNovoPapel('fisioterapeuta');
    carregar();
  }

  async function excluirPaciente(p: PacienteAdmin) {
    const ok = await confirmar(
      `Excluir "${p.nome_completo}" de vez? Isso apaga lesões, fotos, registros, ` +
        `prescrições, consultas e o acesso ao portal. Não dá para desfazer.`
    );
    if (!ok) return;
    setExcluindo(p.id);
    const { error } = await supabase.functions.invoke('excluir-paciente', {
      body: { paciente_id: p.id },
    });
    setExcluindo(null);
    if (error) {
      avisar(error.message);
      return;
    }
    avisar('Paciente excluído.');
    carregar();
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-4xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-texto text-xl font-bold mb-4">Painel de Admin</Text>

      <View className="flex-row gap-3 mb-3">
        <CartaoIndicador
          titulo="Pacientes com lesão ativa"
          valor={String(indicadores?.totalPacientesAtivos ?? 0)}
        />
        <CartaoIndicador titulo="Críticos" valor={String(indicadores?.pacientesCriticos ?? 0)} />
      </View>

      <View className="flex-row gap-3">
        <CartaoIndicador
          titulo="Adesão média aos exercícios"
          valor={indicadores?.adesaoMedia != null ? `${indicadores.adesaoMedia}%` : '—'}
        />
        <CartaoIndicador
          titulo="Tempo médio de cicatrização"
          valor={
            indicadores?.tempoMedioCicatrizacaoDias != null
              ? `${indicadores.tempoMedioCicatrizacaoDias} dias`
              : '—'
          }
        />
      </View>

      {/* ── Equipe ─────────────────────────────────────────────── */}
      <Text className="text-texto font-semibold mt-8 mb-2">
        Equipe {clinicaId == null && `(${equipe.length})`}
      </Text>
      {clinicaId == null && (
        <Text className="text-secundario text-xs mb-2">
          Você administra a plataforma — vê a equipe de todas as instituições, por tipo. Cadastro
          de membros é feito dentro de cada instituição, na Visão global.
        </Text>
      )}
      <View className={largo ? 'flex-row gap-4 items-start' : ''}>
        <View className={largo ? 'flex-1' : ''}>
          {clinicaId == null
            ? TIPOS_INSTITUICAO.map((tipo) => {
                const grupos = equipePorTipo.get(tipo) ?? [];
                if (grupos.length === 0) return null;
                return (
                  <View key={tipo} className="mb-3">
                    <Text className="text-secundario text-xs font-semibold uppercase mb-1">
                      {ROTULO_TIPO[tipo]}
                    </Text>
                    {grupos.map((g) => (
                      <View key={g.nome} className="bg-superficie border border-borda rounded-xl p-4 mb-2">
                        <Text className="text-texto font-semibold mb-1">{g.nome}</Text>
                        {g.membros.map((m) => (
                          <Text key={m.id} className="text-secundario text-xs">
                            {m.nome} — {m.papel}
                            {m.email ? ` · ${m.email}` : ''}
                            {m.ativo ? '' : ' · inativo'}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                );
              })
            : equipe.map((m) => (
                <View key={m.id} className="bg-superficie border border-borda rounded-xl p-4 mb-2">
                  <Text className="text-texto font-semibold">{m.nome}</Text>
                  <Text className="text-secundario text-xs">
                    {m.papel}
                    {m.email ? ` · ${m.email}` : ''}
                    {m.ativo ? '' : ' · inativo'}
                  </Text>
                </View>
              ))}
        </View>

        {clinicaId != null && (
          <View className={`bg-superficie border border-borda rounded-xl p-4 mt-1 ${largo ? 'flex-1' : ''}`}>
          <Text className="text-texto font-semibold mb-2">Cadastrar membro da equipe</Text>
          <View className="flex-row gap-1 mb-2">
            {(
              [
                ['fisioterapeuta', 'Fisioterapeuta'],
                ['estagiario', 'Estagiário'],
                ['admin', 'Admin da clínica'],
              ] as ['fisioterapeuta' | 'estagiario' | 'admin', string][]
            ).map(([valor, rotulo]) => {
              const on = novoPapel === valor;
              return (
                <Pressable
                  key={valor}
                  onPress={() => setNovoPapel(valor)}
                  className={`flex-1 items-center rounded-lg py-2 ${
                    on ? 'bg-primaria' : 'bg-fundo border border-borda'
                  }`}>
                  <Text
                    className={`text-xs font-semibold ${on ? 'text-white' : 'text-secundario'}`}>
                    {rotulo}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={novoNome}
            onChangeText={setNovoNome}
            placeholder="Nome completo"
            placeholderTextColor={cores.secundario}
            className="bg-fundo border border-borda rounded-xl px-4 py-3 mb-2 text-texto"
          />
          <TextInput
            value={novoEmail}
            onChangeText={setNovoEmail}
            placeholder="E-mail"
            placeholderTextColor={cores.secundario}
            autoCapitalize="none"
            keyboardType="email-address"
            className="bg-fundo border border-borda rounded-xl px-4 py-3 mb-2 text-texto"
          />
          <TextInput
            value={novoRegistro}
            onChangeText={setNovoRegistro}
            placeholder="Registro no conselho (CREFITO/CRM…) — opcional"
            placeholderTextColor={cores.secundario}
            className="bg-fundo border border-borda rounded-xl px-4 py-3 mb-2 text-texto"
          />
          {erroEquipe && <Text className="text-risco mb-2">{erroEquipe}</Text>}
          <Pressable
            onPress={cadastrarFisio}
            disabled={cadastrando}
            className="bg-primaria rounded-xl py-3 items-center">
            {cadastrando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Cadastrar</Text>
            )}
          </Pressable>
          {senhaNovoFisio && (
            <View className="border border-ok rounded-xl p-3 mt-3">
              <Text className="text-texto font-semibold mb-1">Acesso criado!</Text>
              <Text className="text-secundario text-xs mb-1">
                Repasse ao novo membro ({senhaNovoFisio.papel}). Ele troca a senha depois em
                Ajustes › Segurança.
              </Text>
              <Text selectable className="text-texto text-xs">E-mail: {senhaNovoFisio.email}</Text>
              <Text selectable className="text-texto text-xs">
                Senha temporária: {senhaNovoFisio.senha}
              </Text>
            </View>
          )}
          </View>
        )}
      </View>

      {/* ── Pacientes ──────────────────────────────────────────── */}
      <Text className="text-texto font-semibold mt-8 mb-2">
        Pacientes ({pacientes.length})
      </Text>
      {pacientes.length === 0 ? (
        <Text className="text-secundario">Nenhum paciente cadastrado.</Text>
      ) : (
        pacientes.map((p) => (
          <View
            key={p.id}
            className="bg-superficie border border-borda rounded-xl p-4 mb-2 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-texto font-semibold">{p.nome_completo}</Text>
              <Text className="text-secundario text-xs">{p.codigo_pseudonimo}</Text>
            </View>
            <Pressable
              onPress={() => excluirPaciente(p)}
              disabled={excluindo === p.id}
              className="border border-risco rounded-lg px-3 py-2">
              {excluindo === p.id ? (
                <ActivityIndicator color={palette.risco} size="small" />
              ) : (
                <Text className="text-risco text-xs font-semibold">Excluir</Text>
              )}
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}
