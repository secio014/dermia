import { useCallback, useState } from 'react';
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
import { avisar } from '@/.lib/aviso';
import { rotuloEtapaFeedback } from '@/.lib/feedback';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

type PacienteAdmin = { id: string; nome_completo: string; codigo_pseudonimo: string };
type MembroEquipe = { id: string; nome: string; papel: string; email: string | null; ativo: boolean };

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

type ResumoFeedbackEtapa = {
  etapa: string;
  quantidade: number;
  notaMedia: number | null;
  tempoMedioSegundos: number | null;
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
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [resumoFeedback, setResumoFeedback] = useState<ResumoFeedbackEtapa[]>([]);
  const [pacientes, setPacientes] = useState<PacienteAdmin[]>([]);
  const [equipe, setEquipe] = useState<MembroEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoRegistro, setNovoRegistro] = useState('');
  const [cadastrando, setCadastrando] = useState(false);
  const [erroEquipe, setErroEquipe] = useState<string | null>(null);
  const [senhaNovoFisio, setSenhaNovoFisio] = useState<{ email: string; senha: string } | null>(null);
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
      { data: feedbacks },
      { data: listaPacientes },
      { data: listaEquipe },
    ] = await Promise.all([
      supabase.from('vw_painel_pacientes').select('prioridade'),
      supabase.from('vw_adesao_exercicios').select('adesao_percentual'),
      supabase.from('lesoes').select('data_ocorrencia, atualizado_em').neq('status', 'ativa'),
      supabase.from('feedback_piloto').select('etapa, nota, tempo_gasto_segundos'),
      supabase
        .from('pacientes')
        .select('id, nome_completo, codigo_pseudonimo')
        .order('nome_completo', { ascending: true }),
      supabase
        .from('profissionais')
        .select('id, nome, papel, email, ativo')
        .order('nome', { ascending: true }),
    ]);

    setPacientes((listaPacientes as PacienteAdmin[]) ?? []);
    setEquipe((listaEquipe as MembroEquipe[]) ?? []);

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

    const porEtapa = new Map<string, { nota: number[]; tempo: number[]; total: number }>();
    for (const f of feedbacks ?? []) {
      const atual = porEtapa.get(f.etapa) ?? { nota: [], tempo: [], total: 0 };
      atual.total += 1;
      if (f.nota != null) atual.nota.push(f.nota);
      if (f.tempo_gasto_segundos != null) atual.tempo.push(f.tempo_gasto_segundos);
      porEtapa.set(f.etapa, atual);
    }
    const media = (lista: number[]) =>
      lista.length > 0 ? Math.round((lista.reduce((s, v) => s + v, 0) / lista.length) * 10) / 10 : null;

    setResumoFeedback(
      Array.from(porEtapa.entries()).map(([etapa, v]) => ({
        etapa,
        quantidade: v.total,
        notaMedia: media(v.nota),
        tempoMedioSegundos: v.tempo.length > 0 ? Math.round(v.tempo.reduce((s, x) => s + x, 0) / v.tempo.length) : null,
      }))
    );

    setCarregando(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  async function cadastrarFisio() {
    const nome = novoNome.trim();
    const email = novoEmail.trim().toLowerCase();
    if (nome.length < 2) {
      setErroEquipe('Informe o nome completo do fisioterapeuta.');
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
      body: { nome, email, registro: novoRegistro.trim() || null },
    });
    setCadastrando(false);
    if (error) {
      setErroEquipe(error.message);
      return;
    }
    setSenhaNovoFisio({ email: data.email, senha: data.senha_temporaria });
    setNovoNome('');
    setNovoEmail('');
    setNovoRegistro('');
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
      contentContainerClassName="w-full max-w-2xl self-center"
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

      <Text className="text-texto font-semibold mt-6 mb-2">Feedback do piloto por etapa</Text>
      {resumoFeedback.length === 0 ? (
        <Text className="text-secundario">Nenhum feedback registrado ainda.</Text>
      ) : (
        resumoFeedback.map((r) => (
          <View key={r.etapa} className="bg-superficie border border-borda rounded-xl p-4 mb-3">
            <Text className="text-texto font-semibold mb-1">{rotuloEtapaFeedback(r.etapa)}</Text>
            <Text className="text-secundario text-xs">
              {r.quantidade} registro(s) · Nota média: {r.notaMedia ?? '—'}
              {r.tempoMedioSegundos != null
                ? ` · Tempo médio: ${Math.floor(r.tempoMedioSegundos / 60)}min ${r.tempoMedioSegundos % 60}s`
                : ''}
            </Text>
          </View>
        ))
      )}

      {/* ── Equipe ─────────────────────────────────────────────── */}
      <Text className="text-texto font-semibold mt-8 mb-2">Equipe</Text>
      {equipe.map((m) => (
        <View key={m.id} className="bg-superficie border border-borda rounded-xl p-4 mb-2">
          <Text className="text-texto font-semibold">{m.nome}</Text>
          <Text className="text-secundario text-xs">
            {m.papel}
            {m.email ? ` · ${m.email}` : ''}
            {m.ativo ? '' : ' · inativo'}
          </Text>
        </View>
      ))}

      <View className="bg-superficie border border-borda rounded-xl p-4 mt-1">
        <Text className="text-texto font-semibold mb-2">Cadastrar fisioterapeuta</Text>
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
            <Text className="text-secundario text-xs mb-1">Repasse ao novo fisioterapeuta:</Text>
            <Text selectable className="text-texto text-xs">E-mail: {senhaNovoFisio.email}</Text>
            <Text selectable className="text-texto text-xs">
              Senha temporária: {senhaNovoFisio.senha}
            </Text>
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
