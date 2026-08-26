import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

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
  const [gerando, setGerando] = useState<'evolucao' | 'alta' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function gerar(tipo: 'evolucao' | 'alta') {
    setErro(null);
    setGerando(tipo);
    try {
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('nome_completo, codigo_pseudonimo')
        .eq('id', id)
        .single();

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

      await gerarECompartilharPDF(html);
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
    <ScrollView className="flex-1 bg-fundo px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-texto text-lg font-bold mb-4">Relatório em PDF</Text>

      <Text className="text-secundario text-xs mb-1">Período (opcional)</Text>
      <View className="flex-row gap-3 mb-4">
        <TextInput
          value={dataInicio}
          onChangeText={setDataInicio}
          placeholder="Início (AAAA-MM-DD)"
          placeholderTextColor="#5B6B7F"
          className="flex-1 bg-superficie border border-borda rounded-xl px-4 py-3 text-texto"
        />
        <TextInput
          value={dataFim}
          onChangeText={setDataFim}
          placeholder="Fim (AAAA-MM-DD)"
          placeholderTextColor="#5B6B7F"
          className="flex-1 bg-superficie border border-borda rounded-xl px-4 py-3 text-texto"
        />
      </View>

      <View className="flex-row items-center justify-between bg-superficie border border-borda rounded-xl px-4 py-3 mb-6">
        <Text className="text-texto">Incluir fotos</Text>
        <Switch value={incluirFotos} onValueChange={setIncluirFotos} />
      </View>

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={() => gerar('evolucao')}
        disabled={gerando !== null}
        className="bg-primaria rounded-xl py-3 items-center mb-3">
        {gerando === 'evolucao' ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Gerar relatório de evolução</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => gerar('alta')}
        disabled={gerando !== null}
        className="bg-superficie border border-borda rounded-xl py-3 items-center">
        {gerando === 'alta' ? (
          <ActivityIndicator color="#0E5FD8" />
        ) : (
          <Text className="text-texto font-semibold">Gerar relatório de alta</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
