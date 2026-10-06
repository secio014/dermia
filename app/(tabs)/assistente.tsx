import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import CameraCapture from '@/components/CameraCapture';
import Aurora from '@/components/efeitos/Aurora';
import BotaoBrilho from '@/components/efeitos/BotaoBrilho';
import Digitando from '@/components/efeitos/Digitando';
import Surgir from '@/components/efeitos/Surgir';
import Vidro from '@/components/efeitos/Vidro';
import Protegido from '@/components/Protegido';
import TextoFormatado from '@/components/ui/TextoFormatado';
import { supabase } from '@/.lib/supabase';
import { TEXTO_LIMITE_IA, TITULO_LIMITE_IA, ehLimiteIaGratis } from '@/.lib/limiteIa';
import { larguraColuna, useColunas } from '@/.lib/responsivo';
import { useTema } from '@/.lib/tema';

// Chat com o Assistente IA (edge function assistente-ia). Só atende
// QUEIMADURAS: a função recusa outros temas e fotos que não sejam de
// queimadura. A IA lê os dados da clínica com a sessão do profissional (RLS);
// a foto enviada aqui é só pra análise na conversa — não é salva no prontuário
// (pra isso existe o botão "Foto" na tela da lesão). Nada da conversa é salvo.

type PacienteOpcao = { id: string; nome_completo: string; codigo_pseudonimo: string };
type PacienteCitado = { id: string; codigo: string; nome: string };
type Mensagem = {
  role: 'user' | 'assistant';
  content: string;
  fotoUri?: string;
  pacientes?: PacienteCitado[];
  erro?: boolean;
  recusa?: boolean;
  limite?: boolean;
};
type Anexo = { uri: string; base64: string };

const SUGESTOES_GERAIS = [
  { icone: 'alert-circle-outline', texto: 'Quais pacientes precisam de mais atenção hoje?' },
  { icone: 'images-outline', texto: 'Quem tem análise de foto pendente de validação?' },
  { icone: 'list-outline', texto: 'Resuma a situação da clínica em poucos tópicos.' },
  { icone: 'school-outline', texto: 'Como diferenciar queloide de cicatriz hipertrófica?' },
] as const;

const SUGESTOES_PACIENTE = [
  { icone: 'trending-up-outline', texto: 'Resuma a evolução deste paciente.' },
  { icone: 'pulse-outline', texto: 'A dor e a cicatriz estão melhorando?' },
  { icone: 'barbell-outline', texto: 'Como está a adesão aos exercícios?' },
  { icone: 'clipboard-outline', texto: 'Sugira pontos para a próxima sessão.' },
] as const;

const PASSOS = [
  {
    icone: 'people-outline',
    titulo: 'Escolha o foco',
    texto: 'Todos os pacientes ou um específico — a IA lê a ficha, a evolução e a agenda dele.',
  },
  {
    icone: 'chatbubble-ellipses-outline',
    titulo: 'Pergunte ou envie uma foto',
    texto: 'Digite sua dúvida ou toque na câmera para fotografar a queimadura e pedir uma análise.',
  },
  {
    icone: 'shield-checkmark-outline',
    titulo: 'Confira e decida',
    texto: 'É uma sugestão: a decisão clínica é sempre sua. Só atende temas de queimadura.',
  },
] as const;

async function mensagemDeErro(error: unknown): Promise<string> {
  const contexto = (error as { context?: Response })?.context;
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json();
      if (corpo?.error) return String(corpo.error);
    } catch {
      // corpo não era JSON
    }
  }
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Falha ao falar com o assistente.';
}

// Reduz a foto (1024 px, JPEG) antes de mandar: payload pequeno e sem EXIF/GPS.
async function prepararFoto(uri: string): Promise<Anexo> {
  const r = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], {
    compress: 0.8,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!r.base64) throw new Error('Falha ao processar a imagem.');
  return { uri: r.uri, base64: r.base64 };
}

export default function AssistenteRoute() {
  return (
    <Protegido permissao="gerenciar_pacientes">
      <Assistente />
    </Protegido>
  );
}

function Assistente() {
  const { cores } = useTema();
  const colunas = useColunas();
  const params = useLocalSearchParams<{ paciente?: string }>();
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([]);
  const [focoId, setFocoId] = useState<string | null>(params.paciente ?? null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const rolagem = useRef<ScrollView>(null);

  useEffect(() => {
    supabase
      .from('pacientes')
      .select('id, nome_completo, codigo_pseudonimo')
      .order('nome_completo', { ascending: true })
      .then(({ data }) => setPacientes((data as PacienteOpcao[] | null) ?? []));
  }, []);

  useEffect(() => {
    if (params.paciente) setFocoId(params.paciente);
  }, [params.paciente]);

  const foco = pacientes.find((p) => p.id === focoId) ?? null;
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pacientes;
    return pacientes.filter(
      (p) => p.nome_completo.toLowerCase().includes(termo) || p.codigo_pseudonimo.toLowerCase().includes(termo)
    );
  }, [busca, pacientes]);

  async function anexarFoto(uri: string) {
    setCameraAberta(false);
    try {
      setAnexo(await prepararFoto(uri));
    } catch (e) {
      setMensagens((atual) => [
        ...atual,
        { role: 'assistant', content: e instanceof Error ? e.message : 'Falha ao preparar a foto.', erro: true },
      ]);
    }
  }

  async function escolherDaGaleria() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!r.canceled && r.assets[0]?.uri) anexarFoto(r.assets[0].uri);
  }

  async function enviar(conteudo: string) {
    const foto = anexo;
    const pergunta = conteudo.trim() || (foto ? 'Analise esta foto da queimadura.' : '');
    if (!pergunta || enviando) return;

    const historico: Mensagem[] = [
      ...mensagens.filter((m) => !m.erro && !m.recusa),
      { role: 'user', content: pergunta },
    ];
    setMensagens((atual) => [...atual, { role: 'user', content: pergunta, fotoUri: foto?.uri }]);
    setTexto('');
    setAnexo(null);
    setEnviando(true);

    const { data, error } = await supabase.functions.invoke('assistente-ia', {
      body: {
        mensagens: historico.map(({ role, content }) => ({ role, content })),
        paciente_id: focoId,
        imagem: foto ? { base64: foto.base64, mime: 'image/jpeg' } : null,
      },
    });

    setEnviando(false);
    if (error || !data?.resposta) {
      const msg = error ? await mensagemDeErro(error) : 'A IA não retornou resposta.';
      const limite = ehLimiteIaGratis(msg);
      setMensagens((atual) => [
        ...atual,
        { role: 'assistant', content: limite ? TEXTO_LIMITE_IA : msg, erro: true, limite },
      ]);
      return;
    }
    setMensagens((atual) => [
      ...atual,
      {
        role: 'assistant',
        content: data.resposta,
        pacientes: data.pacientes ?? [],
        recusa: !!data.fora_do_escopo,
      },
    ]);
  }

  function trocarFoco(id: string | null) {
    setFocoId(id);
    setEscolhendo(false);
    setBusca('');
    setMensagens([]);
  }

  const sugestoes = foco ? SUGESTOES_PACIENTE : SUGESTOES_GERAIS;
  const podeEnviar = (!!texto.trim() || !!anexo) && !enviando;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-fundo">
      <Aurora cor={cores.primaria} intensidade={0.1} />

      <View className="w-full flex-1 px-4 pt-4">
        {/* Cabeçalho */}
        <Surgir>
          <View className="flex-row items-center gap-2.5 mb-1">
            <View
              className="w-9 h-9 rounded-xl items-center justify-center"
              style={{ backgroundColor: cores.primariaSuave }}>
              <Ionicons name="sparkles" size={18} color={cores.primaria} />
            </View>
            <Text className="text-texto text-xl font-bold">Assistente IA</Text>
            <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1 border border-primaria/40 bg-primaria/10">
              <Ionicons name="flame" size={12} color={cores.primaria} />
              <Text className="text-primaria text-[11px] font-semibold">Só queimaduras</Text>
            </View>
          </View>
          <Text className="text-secundario text-xs mb-3">
            Tire dúvidas sobre queimaduras, consulte seus pacientes ou envie uma foto para análise.
          </Text>
        </Surgir>

        {/* Foco */}
        <Surgir atraso={60} className="flex-row flex-wrap items-center gap-2 mb-3">
          <BotaoBrilho
            corBrilho={cores.primaria}
            onPress={() => setEscolhendo((v) => !v)}
            className="flex-row items-center gap-1.5 bg-superficie border border-borda rounded-full px-3 py-1.5">
            <Ionicons name={foco ? 'person' : 'people'} size={14} color={cores.primaria} />
            <Text className="text-texto text-xs font-semibold">
              {foco ? `${foco.nome_completo} · ${foco.codigo_pseudonimo}` : 'Todos os pacientes'}
            </Text>
            <Ionicons name={escolhendo ? 'chevron-up' : 'chevron-down'} size={14} color={cores.secundario} />
          </BotaoBrilho>
          {foco && (
            <>
              <Pressable onPress={() => router.push(`/paciente/${foco.id}`)} className="flex-row items-center gap-1 px-2 py-1.5">
                <Ionicons name="open-outline" size={14} color={cores.primaria} />
                <Text className="text-primaria text-xs font-semibold">Abrir ficha</Text>
              </Pressable>
              <Pressable onPress={() => trocarFoco(null)} className="px-2 py-1.5">
                <Text className="text-secundario text-xs">Limpar foco</Text>
              </Pressable>
            </>
          )}
          {mensagens.length > 0 && (
            <Pressable onPress={() => setMensagens([])} className="flex-row items-center gap-1 px-2 py-1.5 ml-auto">
              <Ionicons name="refresh" size={14} color={cores.secundario} />
              <Text className="text-secundario text-xs">Nova conversa</Text>
            </Pressable>
          )}
        </Surgir>

        {escolhendo && (
          <Surgir duracao={200}>
            <Vidro style={{ maxHeight: 280, borderRadius: 14, padding: 8, marginBottom: 12 }}>
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar por nome ou código"
                placeholderTextColor={cores.secundario}
                className="bg-fundo border border-borda rounded-lg px-3 py-2 text-texto text-sm mb-2"
                autoFocus
              />
              <ScrollView>
                <Pressable onPress={() => trocarFoco(null)} className="px-2 py-2 rounded-lg">
                  <Text className="text-texto text-sm">Todos os pacientes</Text>
                </Pressable>
                {filtrados.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => trocarFoco(p.id)}
                    className={`px-2 py-2 rounded-lg ${p.id === focoId ? 'bg-fundo' : ''}`}>
                    <Text className="text-texto text-sm">{p.nome_completo}</Text>
                    <Text className="text-secundario text-xs">{p.codigo_pseudonimo}</Text>
                  </Pressable>
                ))}
                {filtrados.length === 0 && (
                  <Text className="text-secundario text-xs px-2 py-2">Nenhum paciente encontrado.</Text>
                )}
              </ScrollView>
            </Vidro>
          </Surgir>
        )}

        {/* Conversa */}
        <ScrollView
          ref={rolagem}
          className="flex-1"
          contentContainerClassName="pb-4 gap-3"
          onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: true })}>
          {mensagens.length === 0 && (
            <View className="gap-4 mt-1">
              {/* Como funciona */}
              <Surgir atraso={100}>
                <Vidro style={{ borderRadius: 16, padding: 14 }}>
                  <Text className="text-texto font-semibold mb-3">Como funciona</Text>
                  {/* em telas largas os passos ficam lado a lado */}
                  <View className={colunas > 1 ? 'flex-row gap-5' : 'gap-3'}>
                    {PASSOS.map((p, i) => (
                      <View key={p.titulo} className={`flex-row gap-3 ${colunas > 1 ? 'flex-1' : ''}`}>
                        <View
                          className="w-8 h-8 rounded-full items-center justify-center"
                          style={{ backgroundColor: cores.primariaSuave }}>
                          <Ionicons name={p.icone} size={16} color={cores.primaria} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-texto text-sm font-semibold">
                            {i + 1}. {p.titulo}
                          </Text>
                          <Text className="text-secundario text-xs leading-4">{p.texto}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Vidro>
              </Surgir>

              {/* Analisar foto — chamada clara */}
              <Surgir atraso={160}>
                <BotaoBrilho
                  corBrilho={cores.primaria}
                  onPress={() => setCameraAberta(true)}
                  className="flex-row items-center gap-3 rounded-2xl px-4 py-3.5 border border-primaria/40 bg-primaria/10">
                  <View className="w-10 h-10 rounded-xl bg-primaria items-center justify-center">
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-texto font-semibold">Analisar foto de queimadura</Text>
                    <Text className="text-secundario text-xs">
                      Tire uma foto ou escolha da galeria — a IA sugere fase, grau e achados.
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={cores.primaria} />
                </BotaoBrilho>
              </Surgir>

              <Text className="text-secundario text-xs font-semibold mt-1">Ou experimente perguntar</Text>
              <View className="flex-row flex-wrap" style={{ columnGap: 12, rowGap: 10 }}>
              {sugestoes.map((s, i) => (
                <Surgir key={s.texto} atraso={220 + i * 60} style={{ width: larguraColuna(Math.min(colunas, 2)) }}>
                  <BotaoBrilho
                    corBrilho={cores.primaria}
                    onPress={() => enviar(s.texto)}
                    className="flex-row items-center gap-3 bg-superficie border border-borda rounded-xl px-3 py-2.5">
                    <Ionicons name={s.icone} size={16} color={cores.primaria} />
                    <Text className="text-texto text-sm flex-1">{s.texto}</Text>
                  </BotaoBrilho>
                </Surgir>
              ))}
              </View>
            </View>
          )}

          {mensagens.map((m, i) =>
            m.role === 'user' ? (
              <Surgir key={i} de="direita" duracao={240} className="self-end items-end gap-1.5" style={{ maxWidth: 760 }}>
                {m.fotoUri && (
                  <Image source={{ uri: m.fotoUri }} style={{ width: 180, height: 180, borderRadius: 14 }} />
                )}
                <View className="bg-primaria rounded-2xl rounded-br-sm px-3.5 py-2.5">
                  <Text className="text-superficie text-sm">{m.content}</Text>
                </View>
              </Surgir>
            ) : (
              <Surgir key={i} duracao={300} className="self-start flex-row gap-2" style={{ maxWidth: 980 }}>
                <View
                  className="w-7 h-7 rounded-full items-center justify-center mt-0.5"
                  style={{ backgroundColor: cores.primariaSuave }}>
                  <Ionicons
                    name={
                      m.limite
                        ? 'hourglass-outline'
                        : m.erro
                          ? 'warning-outline'
                          : m.recusa
                            ? 'flame-outline'
                            : 'sparkles'
                    }
                    size={14}
                    color={cores.primaria}
                  />
                </View>
                <View
                  className={`flex-1 bg-superficie border rounded-2xl rounded-tl-sm px-3.5 py-2.5 ${
                    m.limite ? 'border-atencao' : m.erro ? 'border-risco' : m.recusa ? 'border-atencao' : 'border-borda'
                  }`}>
                  {m.limite ? (
                    <>
                      <Text className="text-atencao font-semibold mb-1">{TITULO_LIMITE_IA}</Text>
                      <Text className="text-secundario text-sm">{m.content}</Text>
                    </>
                  ) : m.erro ? (
                    <Text className="text-risco text-sm">{m.content}</Text>
                  ) : (
                    <TextoFormatado texto={m.content} />
                  )}
                  {!!m.pacientes?.length && (
                    <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                      {m.pacientes.map((p) => (
                        <BotaoBrilho
                          key={p.id}
                          corBrilho={cores.primaria}
                          onPress={() => router.push(`/paciente/${p.id}`)}
                          className="flex-row items-center gap-1 bg-fundo border border-borda rounded-full px-2.5 py-1">
                          <Ionicons name="person-outline" size={12} color={cores.primaria} />
                          <Text className="text-primaria text-xs font-semibold">
                            {p.nome} · {p.codigo}
                          </Text>
                        </BotaoBrilho>
                      ))}
                    </View>
                  )}
                </View>
              </Surgir>
            )
          )}

          {enviando && (
            <Surgir duracao={200} className="self-start flex-row items-center gap-2.5 px-1">
              <Digitando cor={cores.primaria} />
              <Text className="text-secundario text-xs">
                {mensagens[mensagens.length - 1]?.fotoUri ? 'Analisando a foto…' : 'Analisando os dados…'}
              </Text>
            </Surgir>
          )}
        </ScrollView>

        {/* Entrada */}
        <Vidro style={{ borderRadius: 18, padding: 8, marginBottom: 12 }}>
          {anexo && (
            <Surgir duracao={220} className="flex-row items-center gap-2 mb-2 px-1">
              <Image source={{ uri: anexo.uri }} style={{ width: 52, height: 52, borderRadius: 10 }} />
              <View className="flex-1">
                <Text className="text-texto text-xs font-semibold">Foto anexada</Text>
                <Text className="text-secundario text-[11px]">
                  Só para esta conversa — não é salva no prontuário.
                </Text>
              </View>
              <Pressable onPress={() => setAnexo(null)} accessibilityLabel="Remover foto" className="p-1.5">
                <Ionicons name="close-circle" size={20} color={cores.secundario} />
              </Pressable>
            </Surgir>
          )}
          <View className="flex-row items-center gap-2">
            {/* Anexos: botões quadrados do mesmo tamanho do Enviar, alinhados ao centro */}
            <BotaoBrilho
              corBrilho={cores.primaria}
              onPress={() => setCameraAberta(true)}
              accessibilityLabel="Tirar foto"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cores.primariaSuave,
              }}>
              <Ionicons name="camera-outline" size={20} color={cores.primaria} />
            </BotaoBrilho>
            <BotaoBrilho
              corBrilho={cores.primaria}
              onPress={escolherDaGaleria}
              accessibilityLabel="Escolher foto da galeria"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cores.primariaSuave,
              }}>
              <Ionicons name="image-outline" size={19} color={cores.primaria} />
            </BotaoBrilho>
            <View style={{ width: 1, height: 26, backgroundColor: cores.borda, marginHorizontal: 2 }} />
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder={
                anexo
                  ? 'O que você quer saber sobre a foto? (opcional)'
                  : foco
                    ? `Pergunte sobre ${foco.nome_completo.split(' ')[0]}…`
                    : 'Pergunte sobre queimaduras ou seus pacientes…'
              }
              placeholderTextColor={cores.secundario}
              multiline
              numberOfLines={1}
              onSubmitEditing={() => enviar(texto)}
              blurOnSubmit
              className="flex-1 text-texto text-sm"
              style={{ minHeight: 42, maxHeight: 120, paddingHorizontal: 8, paddingVertical: 11, textAlignVertical: 'center' }}
            />
            <BotaoBrilho
              corBrilho={cores.primaria}
              onPress={() => enviar(texto)}
              disabled={!podeEnviar}
              accessibilityLabel="Enviar"
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: cores.primaria,
                opacity: podeEnviar ? 1 : 0.45,
              }}>
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </BotaoBrilho>
          </View>
        </Vidro>
      </View>

      {/* Câmera em tela cheia, com a mesma moldura/prévia da foto da lesão */}
      <Modal visible={cameraAberta} animationType="fade" onRequestClose={() => setCameraAberta(false)}>
        <View className="flex-1 bg-fundo">
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
            <View className="flex-1">
              <Text className="text-texto font-semibold">Foto para análise</Text>
              <Text className="text-secundario text-xs">
                Enquadre só a área queimada, com boa luz. Depois confira e toque em “Usar foto”.
              </Text>
            </View>
            <Pressable onPress={() => setCameraAberta(false)} accessibilityLabel="Fechar câmera" className="p-2">
              <Ionicons name="close" size={24} color={cores.texto} />
            </Pressable>
          </View>
          <CameraCapture onCapture={anexarFoto} />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
