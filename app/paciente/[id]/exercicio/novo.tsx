import { useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import SeletorCatalogo from '@/components/ui/SeletorCatalogo';
import { avisar } from '@/.lib/aviso';
import {
  criarExercicioCatalogo,
  escolherArquivo,
  enviarMidiaExercicio,
  listarCatalogoExercicios,
  TAMANHO_MAX_VIDEO_MB,
  type ExercicioCatalogo,
} from '@/.lib/exercicios';
import { obterPerfilProfissional } from '@/.lib/perfil';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

const campo = 'bg-superficie border border-borda rounded-xl px-4 py-3 mb-3 text-texto';

export default function NovoExercicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cores } = useTema();

  const [titulo, setTitulo] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [catalogoId, setCatalogoId] = useState<string | null>(null);

  const [series, setSeries] = useState('');
  const [repeticoes, setRepeticoes] = useState('');
  const [frequenciaSemanal, setFrequenciaSemanal] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [catalogo, setCatalogo] = useState<ExercicioCatalogo[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    listarCatalogoExercicios(busca).then(setCatalogo);
  }, [busca]);

  function selecionarDoCatalogo(item: ExercicioCatalogo) {
    setTitulo(item.titulo);
    setInstrucoes(item.instrucoes ?? '');
    setVideoUrl(item.video_url ?? '');
    setCatalogoId(item.id);
  }

  async function salvar() {
    if (!titulo.trim()) {
      setErro('Escolha um exercício do catálogo ou cadastre um novo.');
      return;
    }
    if (series && Number(series) <= 0) {
      setErro('Séries deve ser maior que zero.');
      return;
    }
    if (repeticoes && Number(repeticoes) <= 0) {
      setErro('Repetições deve ser maior que zero.');
      return;
    }
    if (frequenciaSemanal && (Number(frequenciaSemanal) < 1 || Number(frequenciaSemanal) > 21)) {
      setErro('Frequência semanal deve ser entre 1 e 21.');
      return;
    }
    setErro(null);
    setCarregando(true);

    const perfil = await obterPerfilProfissional();
    if (!perfil) {
      setCarregando(false);
      setErro('Não foi possível identificar o profissional logado.');
      return;
    }

    const { error } = await supabase.from('exercicios_prescritos').insert({
      paciente_id: id,
      profissional_id: perfil.id,
      catalogo_id: catalogoId,
      titulo: titulo.trim(),
      instrucoes: instrucoes.trim() || null,
      video_url: videoUrl.trim() || null,
      series: series ? Number(series) : null,
      repeticoes: repeticoes ? Number(repeticoes) : null,
      frequencia_semanal: frequenciaSemanal ? Number(frequenciaSemanal) : null,
    });

    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    avisar('Exercício prescrito.');
    router.back();
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-2xl self-center"
      contentContainerStyle={{ paddingBottom: 32 }}>
      <Stack.Screen options={{ headerTitle: 'Derm.IA' }} />

      <Text className="text-secundario text-xs font-semibold mb-1">EXERCÍCIO</Text>
      <View className="mb-3">
        <SeletorCatalogo<ExercicioCatalogo>
          itens={catalogo}
          keyItem={(e) => e.id}
          rotuloItem={(e) => e.titulo}
          descricaoItem={(e) => e.instrucoes?.slice(0, 80) ?? null}
          idSelecionado={catalogoId}
          busca={busca}
          onBusca={setBusca}
          onSelecionar={selecionarDoCatalogo}
          renderFormNovo={(fechar) => (
            <FormNovoExercicio
              onCriado={(item) => {
                setCatalogo((atual) => [item, ...atual]);
                selecionarDoCatalogo(item);
                fechar();
              }}
            />
          )}
        />
      </View>

      {titulo ? (
        <View className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3">
          {instrucoes ? (
            <Text className="text-secundario text-xs mb-1">{instrucoes}</Text>
          ) : null}
          {videoUrl ? (
            <Text className="text-primaria text-xs" numberOfLines={1}>
              🎬 {videoUrl}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text className="text-secundario text-xs font-semibold mb-1 mt-1">DOSE DO EXERCÍCIO</Text>
      <View className="flex-row gap-3 mb-3">
        <TextInput
          value={series}
          onChangeText={setSeries}
          placeholder="Séries"
          placeholderTextColor={cores.secundario}
          keyboardType="numeric"
          className="flex-1 bg-superficie border border-borda rounded-xl px-4 py-3 text-texto"
        />
        <TextInput
          value={repeticoes}
          onChangeText={setRepeticoes}
          placeholder="Repetições"
          placeholderTextColor={cores.secundario}
          keyboardType="numeric"
          className="flex-1 bg-superficie border border-borda rounded-xl px-4 py-3 text-texto"
        />
      </View>

      <TextInput
        value={frequenciaSemanal}
        onChangeText={setFrequenciaSemanal}
        placeholder="Frequência por semana (ex: 5)"
        placeholderTextColor={cores.secundario}
        keyboardType="numeric"
        className={campo}
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={salvar}
        disabled={carregando}
        className="bg-primaria rounded-xl py-3 items-center">
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-superficie font-semibold">Prescrever exercício</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function FormNovoExercicio({ onCriado }: { onCriado: (item: ExercicioCatalogo) => void }) {
  const { cores } = useTema();
  const [titulo, setTitulo] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [imagemPath, setImagemPath] = useState<string | null>(null);
  const [enviandoMidia, setEnviandoMidia] = useState<'video' | 'imagem' | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function anexar(tipo: 'video' | 'imagem') {
    setErro(null);
    const arquivo = await escolherArquivo(tipo === 'video' ? 'video' : 'imagem');
    if (!arquivo) return;
    const perfil = await obterPerfilProfissional();
    if (!perfil) {
      setErro('Não foi possível identificar o profissional logado.');
      return;
    }
    setEnviandoMidia(tipo);
    const { path, error } = await enviarMidiaExercicio(arquivo, tipo, perfil.clinica_id);
    setEnviandoMidia(null);
    if (error || !path) {
      setErro(error ?? 'Falha ao enviar o arquivo.');
      return;
    }
    if (tipo === 'video') setVideoPath(path);
    else setImagemPath(path);
  }

  async function salvar() {
    if (!titulo.trim()) {
      setErro('Informe o título.');
      return;
    }
    setErro(null);
    setSalvando(true);
    const { item, error } = await criarExercicioCatalogo({
      titulo: titulo.trim(),
      instrucoes: instrucoes.trim() || null,
      video_url: videoUrl.trim() || null,
      video_path: videoPath,
      imagem_path: imagemPath,
    });
    setSalvando(false);
    if (error || !item) {
      setErro(error ?? 'Falha ao cadastrar.');
      return;
    }
    onCriado(item);
  }

  return (
    <View>
      <TextInput
        value={titulo}
        onChangeText={setTitulo}
        placeholder="Título (ex.: Alongamento de ombro)"
        placeholderTextColor={cores.secundario}
        className={campo}
      />
      <TextInput
        value={instrucoes}
        onChangeText={setInstrucoes}
        placeholder="Instruções (opcional)"
        placeholderTextColor={cores.secundario}
        multiline
        className={`${campo} min-h-[80px]`}
      />
      <TextInput
        value={videoUrl}
        onChangeText={setVideoUrl}
        placeholder="Link do vídeo (YouTube, Drive…)"
        placeholderTextColor={cores.secundario}
        autoCapitalize="none"
        className={campo}
      />

      <View className="flex-row gap-3 mb-1">
        <Pressable
          onPress={() => anexar('video')}
          disabled={enviandoMidia !== null}
          className="flex-1 border border-borda rounded-xl py-3 items-center">
          {enviandoMidia === 'video' ? (
            <ActivityIndicator color={cores.primaria} />
          ) : (
            <Text className="text-texto text-xs font-semibold">
              {videoPath ? '✓ Vídeo enviado' : 'Enviar vídeo'}
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => anexar('imagem')}
          disabled={enviandoMidia !== null}
          className="flex-1 border border-borda rounded-xl py-3 items-center">
          {enviandoMidia === 'imagem' ? (
            <ActivityIndicator color={cores.primaria} />
          ) : (
            <Text className="text-texto text-xs font-semibold">
              {imagemPath ? '✓ Imagem enviada' : 'Enviar imagem'}
            </Text>
          )}
        </Pressable>
      </View>
      <Text className="text-secundario text-xs mb-3">
        Vídeo: link ou arquivo (até {TAMANHO_MAX_VIDEO_MB} MB).
      </Text>

      {erro && <Text className="text-risco mb-3">{erro}</Text>}
      <Pressable
        onPress={salvar}
        disabled={salvando}
        className="bg-primaria rounded-xl py-3 items-center">
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">Salvar no catálogo</Text>
        )}
      </Pressable>
    </View>
  );
}
