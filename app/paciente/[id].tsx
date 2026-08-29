import { useCallback, useState } from 'react';
import { Link, router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette } from '@/constants/Colors';
import { GRAUS_CLINICOS } from '@/.lib/scq';
import { proximaConsulta, type Consulta } from '@/.lib/agenda';
import { avisar } from '@/.lib/aviso';
import { montarHtmlPrescricao, gerarECompartilharPDF } from '@/.lib/pdf';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { encerrarPrescricao, listarPrescricoes, type Prescricao } from '@/.lib/prescricoes';
import { useLargo } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';
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

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-texto font-bold mb-2">{titulo}</Text>
      {children}
    </View>
  );
}

export default function DetalhePaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const largo = useLargo();
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [lesoes, setLesoes] = useState<Lesao[]>([]);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [adesoes, setAdesoes] = useState<Adesao[]>([]);
  const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
  const [proxima, setProxima] = useState<Consulta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [emailPortal, setEmailPortal] = useState('');
  const [criandoAcesso, setCriandoAcesso] = useState(false);
  const [senhaTemporaria, setSenhaTemporaria] = useState<string | null>(null);
  const [erroAcesso, setErroAcesso] = useState<string | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const carregar = useCallback(async () => {
    const [{ data: p }, { data: l }, { data: e }, { data: a }, presc, prox] = await Promise.all([
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
      listarPrescricoes(id, { somenteAtivas: true }),
      proximaConsulta(id),
    ]);
    setPaciente(p);
    setLesoes(l ?? []);
    setExercicios(e ?? []);
    setAdesoes((a as Adesao[]) ?? []);
    setPrescricoes(presc);
    setProxima(prox);
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

  async function gerarPdfPrescricoes() {
    if (prescricoes.length === 0) {
      avisar('Nenhuma prescrição ativa para gerar o PDF.');
      return;
    }
    setGerandoPdf(true);
    try {
      const perfil = await obterPerfilProfissional();
      const { data: prof } = perfil
        ? await supabase.from('profissionais').select('nome, registro').eq('id', perfil.id).single()
        : { data: null };
      const html = montarHtmlPrescricao({
        profissional: { nome: prof?.nome ?? null, registro: prof?.registro ?? null },
        paciente: { nome: paciente?.nome_completo ?? null, codigo: paciente?.codigo_pseudonimo ?? null },
        itens: prescricoes.map((p) => ({
          nome: p.nome,
          dose: p.dose,
          frequencia: p.frequencia,
          inicio: p.inicio,
          fim: p.fim,
          observacoes: p.observacoes,
        })),
      });
      await gerarECompartilharPDF(html);
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Erro ao gerar o PDF.');
    } finally {
      setGerandoPdf(false);
    }
  }

  if (carregando) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  // Próxima consulta
  const cardConsulta = (
    <View className="bg-superficie border border-borda rounded-xl p-4 mb-6 flex-row items-center gap-3">
        <Ionicons name="calendar-outline" size={22} color={cores.primaria} />
        <View className="flex-1">
          <Text className="text-secundario text-xs">Próxima consulta</Text>
          <Text className="text-texto font-semibold">
            {proxima
              ? new Date(proxima.inicio_em).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Nenhuma agendada'}
          </Text>
        </View>
      <Pressable
        onPress={() => router.push(`/consulta/nova?pacienteId=${id}`)}
        className="bg-primaria rounded-lg px-3 py-2">
        <Text className="text-white text-xs font-semibold">Agendar</Text>
      </Pressable>
    </View>
  );

  const secaoLesoes = (
    <Secao titulo="Lesões">
        {lesoes.length === 0 ? (
          <Text className="text-secundario">Nenhuma lesão registrada ainda.</Text>
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
        <Pressable className="bg-primaria rounded-xl py-3 items-center mt-1">
          <Text className="text-white font-semibold">+ Nova lesão</Text>
        </Pressable>
      </Link>
    </Secao>
  );

  const secaoRemedios = (
    <Secao titulo="Remédios e curativos">
        {prescricoes.length === 0 ? (
          <Text className="text-secundario">Nada prescrito no momento.</Text>
        ) : (
          prescricoes.map((p) => (
            <View key={p.id} className="bg-superficie border border-borda rounded-xl p-4 mb-3">
              <Text className="text-texto font-semibold mb-1">{p.nome}</Text>
              <Text className="text-secundario text-xs">
                {[p.dose, p.frequencia].filter(Boolean).join(' · ') || 'Sem posologia'}
              </Text>
              <Pressable
                onPress={() =>
                  encerrarPrescricao(p.id).then(() => {
                    avisar('Prescrição encerrada.');
                    carregar();
                  })
                }
                className="mt-2">
                <Text className="text-risco text-xs font-semibold">Encerrar</Text>
              </Pressable>
            </View>
          ))
        )}
      <Link href={`/paciente/${id}/prescricao/nova`} asChild>
        <Pressable className="bg-superficie border border-primaria rounded-xl py-3 items-center mt-1">
          <Text className="text-primaria font-semibold">+ Prescrever</Text>
        </Pressable>
      </Link>
      {prescricoes.length > 0 && (
        <Pressable
          onPress={gerarPdfPrescricoes}
          disabled={gerandoPdf}
          className="bg-superficie border border-borda rounded-xl py-3 items-center mt-2">
          {gerandoPdf ? (
            <ActivityIndicator color={palette.primaria} />
          ) : (
            <Text className="text-texto font-semibold">Gerar PDF da prescrição</Text>
          )}
        </Pressable>
      )}
    </Secao>
  );

  const secaoExercicios = (
    <Secao titulo="Exercícios prescritos">
        {exercicios.length === 0 ? (
          <Text className="text-secundario">Nenhum exercício prescrito ainda.</Text>
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
        <Pressable className="bg-superficie border border-primaria rounded-xl py-3 items-center mt-1">
          <Text className="text-primaria font-semibold">+ Prescrever exercício</Text>
        </Pressable>
      </Link>
    </Secao>
  );

  const botaoRelatorio = (
    <View className="mb-6">
      <Link href={`/paciente/${id}/relatorio`} asChild>
        <Pressable className="bg-superficie border border-borda rounded-xl py-3 items-center">
          <Text className="text-texto font-semibold">Gerar relatório em PDF</Text>
        </Pressable>
      </Link>
      <Link href={`/paciente/${id}/atestado/novo`} asChild>
        <Pressable className="bg-superficie border border-borda rounded-xl py-3 items-center mt-2">
          <Text className="text-texto font-semibold">Emitir atestado</Text>
        </Pressable>
      </Link>
    </View>
  );

  const secaoPortal = (
    <Secao titulo="Acesso ao portal do paciente">
        {paciente?.user_id ? (
          <View className="bg-superficie border border-ok rounded-xl p-4 flex-row items-center gap-2">
            <Ionicons name="checkmark-circle" size={18} color={palette.ok} />
            <Text className="text-ok font-semibold text-xs">Paciente já tem acesso ao portal.</Text>
          </View>
        ) : senhaTemporaria ? (
          <View className="bg-superficie border border-ok rounded-xl p-4">
            <Text className="text-texto font-semibold mb-1">Acesso criado!</Text>
            <Text className="text-secundario text-xs mb-2">Repasse esses dados ao paciente:</Text>
            <Text selectable className="text-texto text-xs">E-mail: {emailPortal}</Text>
            <Text selectable className="text-texto text-xs">Senha temporária: {senhaTemporaria}</Text>
            {Platform.OS === 'web' && (
              <Pressable
                onPress={() =>
                  navigator.clipboard?.writeText(
                    `E-mail: ${emailPortal}\nSenha: ${senhaTemporaria}`
                  )
                }
                className="mt-2">
                <Text className="text-primaria text-xs font-semibold">Copiar</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View>
            <TextInput
              value={emailPortal}
              onChangeText={setEmailPortal}
              placeholder="E-mail do paciente"
              placeholderTextColor={cores.secundario}
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
            />
            {erroAcesso && <Text className="text-risco mb-3">{erroAcesso}</Text>}
            <Pressable
              onPress={criarAcessoPortal}
              disabled={criandoAcesso}
              className="bg-primaria rounded-xl py-3 items-center">
              {criandoAcesso ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Criar acesso ao portal</Text>
              )}
            </Pressable>
          </View>
        )}
    </Secao>
  );

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName={largo ? 'w-full max-w-5xl self-center' : 'w-full max-w-2xl self-center'}
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ headerTitle: 'Derm.IA' }} />
      <Text className="text-texto text-xl font-bold mb-1">{paciente?.nome_completo}</Text>
      <Text className="text-secundario mb-5">{paciente?.codigo_pseudonimo}</Text>

      {largo ? (
        <>
          {cardConsulta}
          <View className="flex-row gap-6">
            <View className="flex-1">
              {secaoLesoes}
              {botaoRelatorio}
            </View>
            <View className="flex-1">
              {secaoRemedios}
              {secaoExercicios}
              {secaoPortal}
            </View>
          </View>
        </>
      ) : (
        <>
          {cardConsulta}
          {secaoLesoes}
          {secaoRemedios}
          {secaoExercicios}
          {botaoRelatorio}
          {secaoPortal}
        </>
      )}
    </ScrollView>
  );
}
