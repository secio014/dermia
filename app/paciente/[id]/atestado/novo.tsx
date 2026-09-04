import { useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import SeletorData from '@/components/ui/SeletorData';
import { enviarDocumentoPorEmail } from '@/.lib/documentos';
import { montarHtmlAtestado, gerarECompartilharPDF } from '@/.lib/pdf';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

const campo = 'bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto';

export default function NovoAtestado() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();
  const [tipo, setTipo] = useState<'repouso' | 'comparecimento'>('repouso');
  const [dias, setDias] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [cid, setCid] = useState('');
  const [finalidade, setFinalidade] = useState('');
  const [acao, setAcao] = useState<'pdf' | 'email' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function emitir(destino: 'pdf' | 'email') {
    setErro(null);
    setAcao(destino);
    try {
      const perfil = await obterPerfilProfissional();
      const [{ data: prof }, { data: pac }] = await Promise.all([
        perfil
          ? supabase.from('profissionais').select('nome, registro').eq('id', perfil.id).single()
          : Promise.resolve({ data: null }),
        supabase
          .from('pacientes')
          .select('nome_completo, codigo_pseudonimo, email')
          .eq('id', id)
          .single(),
      ]);

      if (destino === 'email' && !pac?.email) {
        setErro('Este paciente não tem e-mail cadastrado.');
        return;
      }

      const html = montarHtmlAtestado({
        profissional: { nome: prof?.nome ?? null, registro: prof?.registro ?? null },
        paciente: { nome: pac?.nome_completo ?? null, codigo: pac?.codigo_pseudonimo ?? null },
        tipo,
        dias: dias.trim() || null,
        inicio: inicio || null,
        fim: fim || null,
        cid: cid.trim() || null,
        finalidade: finalidade.trim() || null,
      });

      if (destino === 'pdf') {
        await gerarECompartilharPDF(html);
      } else {
        const { error } = await enviarDocumentoPorEmail({
          pacienteId: id,
          assunto: 'Seu atestado — DermIA',
          html,
        });
        if (error) setErro(error);
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Erro ao emitir o atestado.';
      setErro(msg);
    } finally {
      setAcao(null);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-3xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ headerTitle: 'DermIA' }} />

      <Text className="text-secundario text-xs font-semibold mb-1">TIPO</Text>
      <View className="flex-row gap-2 mb-4">
        {(['repouso', 'comparecimento'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTipo(t)}
            className={`flex-1 py-3 rounded-xl border items-center ${
              tipo === t ? 'bg-primaria border-primaria' : 'bg-superficie border-borda'
            }`}>
            <Text className={tipo === t ? 'text-white font-semibold' : 'text-secundario'}>
              {t === 'repouso' ? 'Afastamento' : 'Comparecimento'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tipo === 'repouso' && (
        <>
          <TextInput
            value={dias}
            onChangeText={setDias}
            placeholder="Dias de afastamento (ex.: 3)"
            placeholderTextColor={cores.secundario}
            keyboardType="numeric"
            className={campo}
          />
          <Text className="text-secundario text-xs mb-3 -mt-1">
            Ou informe um período abaixo (opcional).
          </Text>
        </>
      )}

      <Text className="text-secundario text-xs font-semibold mb-1">INÍCIO (opcional)</Text>
      <View className="mb-3">
        <SeletorData valor={inicio} onChange={setInicio} placeholder="Escolher data" opcional />
      </View>
      <Text className="text-secundario text-xs font-semibold mb-1">FIM (opcional)</Text>
      <View className="mb-3">
        <SeletorData valor={fim} onChange={setFim} placeholder="Escolher data" opcional />
      </View>

      <TextInput
        value={cid}
        onChangeText={setCid}
        placeholder="CID (opcional)"
        placeholderTextColor={cores.secundario}
        autoCapitalize="characters"
        className={campo}
      />
      <TextInput
        value={finalidade}
        onChangeText={setFinalidade}
        placeholder="Finalidade / observação (opcional)"
        placeholderTextColor={cores.secundario}
        multiline
        className={`${campo} min-h-[70px]`}
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={() => emitir('pdf')}
        disabled={acao !== null}
        className="bg-primaria rounded-xl py-3.5 items-center">
        {acao === 'pdf' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Gerar atestado em PDF</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => emitir('email')}
        disabled={acao !== null}
        className="bg-superficie border border-borda rounded-xl py-3.5 items-center mt-2">
        {acao === 'email' ? (
          <ActivityIndicator color={cores.primaria} />
        ) : (
          <Text className="text-texto font-semibold">Enviar por e-mail ao paciente</Text>
        )}
      </Pressable>

      <Text className="text-secundario text-xs mt-3 text-center">
        O e-mail usa o endereço cadastrado no paciente e só funciona depois que o
        Resend estiver configurado (edge function publicada).
      </Text>
    </ScrollView>
  );
}
