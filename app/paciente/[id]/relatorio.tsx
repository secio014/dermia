import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import SeletorData from '@/components/ui/SeletorData';
import { palette } from '@/constants/Colors';
import { enviarDocumentoPorEmail } from '@/.lib/documentos';
import { obterUrlAssinada } from '@/.lib/foto';
import {
  gerarECompartilharPDF,
  montarHtmlRelatorio,
  type FotoRelatorio,
  type LesaoRelatorio,
  type RegistroRelatorio,
} from '@/.lib/pdf';
import { supabase } from '@/.lib/supabase';

export default function RelatorioPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [incluirFotos, setIncluirFotos] = useState(true);
  const [porEmail, setPorEmail] = useState(false);
  const [gerando, setGerando] = useState<'evolucao' | 'alta' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar(tipo: 'evolucao' | 'alta') {
    setErro(null);
    setGerando(tipo);
    try {
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('nome_completo, codigo_pseudonimo, email')
        .eq('id', id)
        .single();

      if (porEmail && !paciente?.email) {
        setErro('Este paciente não tem e-mail cadastrado.');
        return;
      }

      let consultaLesoes = supabase
        .from('lesoes')
        .select('id, regiao_corporal, scq_percentual, grau_clinico, data_ocorrencia, status')
        .eq('paciente_id', id);
      if (dataInicio) consultaLesoes = consultaLesoes.gte('data_ocorrencia', dataInicio);
      if (dataFim) consultaLesoes = consultaLesoes.lte('data_ocorrencia', dataFim);
      const { data: lesoesData } = await consultaLesoes.order('data_ocorrencia', { ascending: true });
      const lesoes = (lesoesData as LesaoRelatorio[]) ?? [];
      const idsLesoes = lesoes.map((l) => l.id);

      let registros: RegistroRelatorio[] = [];
      let fotos: FotoRelatorio[] = [];

      if (idsLesoes.length > 0) {
        let consultaRegistros = supabase
          .from('registros_evolucao')
          .select('lesao_id, data_atendimento, descricao, condutas, dor_eva, adm')
          .in('lesao_id', idsLesoes);
        if (dataInicio) consultaRegistros = consultaRegistros.gte('data_atendimento', dataInicio);
        if (dataFim) consultaRegistros = consultaRegistros.lte('data_atendimento', dataFim);
        const { data: registrosData } = await consultaRegistros;
        registros = (registrosData as RegistroRelatorio[]) ?? [];

        if (incluirFotos) {
          let consultaFotos = supabase
            .from('analises_ia')
            .select('lesao_id, foto_path, criado_em')
            .in('lesao_id', idsLesoes);
          const { data: fotosData } = await consultaFotos;
          const urls = await Promise.all(
            (fotosData ?? []).map(async (f) => ({
              lesao_id: f.lesao_id as string,
              criado_em: f.criado_em as string,
              url: await obterUrlAssinada(f.foto_path as string),
            }))
          );
          fotos = urls.filter((f): f is FotoRelatorio => !!f.url);
        }
      }

      const html = montarHtmlRelatorio({
        tipo,
        nomePaciente: paciente?.nome_completo ?? '—',
        codigoPaciente: paciente?.codigo_pseudonimo ?? '—',
        lesoes,
        registros,
        fotos,
      });

      if (porEmail) {
        const { error } = await enviarDocumentoPorEmail({
          pacienteId: id,
          assunto: 'Seu relatório de acompanhamento — DermIA',
          html,
        });
        if (error) setErro(error);
      } else {
        await gerarECompartilharPDF(html);
      }
    } catch (e) {
      const mensagem =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Erro ao gerar o relatório.';
      setErro(mensagem);
    } finally {
      setGerando(null);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-4xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ headerTitle: 'DermIA' }} />
      <Text className="text-texto text-lg font-bold mb-4">Relatório em PDF</Text>

      <Text className="text-secundario text-xs mb-1">Período (opcional)</Text>
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1">
          <SeletorData valor={dataInicio} onChange={setDataInicio} placeholder="Início" opcional />
        </View>
        <View className="flex-1">
          <SeletorData valor={dataFim} onChange={setDataFim} placeholder="Fim" opcional />
        </View>
      </View>

      <View className="flex-row items-center justify-between bg-superficie border border-borda rounded-xl px-4 py-3 mb-3">
        <Text className="text-texto">Incluir fotos</Text>
        <Switch value={incluirFotos} onValueChange={setIncluirFotos} />
      </View>

      <View className="flex-row items-center justify-between bg-superficie border border-borda rounded-xl px-4 py-3 mb-6">
        <Text className="text-texto">Enviar por e-mail ao paciente</Text>
        <Switch value={porEmail} onValueChange={setPorEmail} />
      </View>

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={() => gerar('evolucao')}
        disabled={gerando !== null}
        className="bg-primaria rounded-xl py-3 items-center mb-3">
        {gerando === 'evolucao' ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">
            {porEmail ? 'Enviar relatório de evolução' : 'Gerar relatório de evolução'}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => gerar('alta')}
        disabled={gerando !== null}
        className="bg-superficie border border-borda rounded-xl py-3 items-center">
        {gerando === 'alta' ? (
          <ActivityIndicator color={palette.primaria} />
        ) : (
          <Text className="text-texto font-semibold">
            {porEmail ? 'Enviar relatório de alta' : 'Gerar relatório de alta'}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
