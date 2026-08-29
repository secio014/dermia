import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

export type ExercicioCatalogo = {
  id: string;
  clinica_id: string | null;
  titulo: string;
  instrucoes: string | null;
  video_url: string | null;
  video_path: string | null;
  imagem_path: string | null;
  ativo: boolean;
};

const CAMPOS = 'id, clinica_id, titulo, instrucoes, video_url, video_path, imagem_path, ativo';
const BUCKET = 'exercicios-midia';

export const TAMANHO_MAX_VIDEO_MB = 50;

export async function listarCatalogoExercicios(busca = ''): Promise<ExercicioCatalogo[]> {
  let q = supabase
    .from('catalogo_exercicios')
    .select(CAMPOS)
    .eq('ativo', true)
    .order('titulo', { ascending: true });
  if (busca.trim()) q = q.ilike('titulo', `%${busca.trim()}%`);
  const { data } = await q;
  return (data as ExercicioCatalogo[] | null) ?? [];
}

type DadosExercicio = {
  titulo: string;
  instrucoes?: string | null;
  video_url?: string | null;
  video_path?: string | null;
  imagem_path?: string | null;
};

export async function criarExercicioCatalogo(
  dados: DadosExercicio
): Promise<{ item: ExercicioCatalogo | null; error: string | null }> {
  const perfil = await obterPerfilProfissional();
  if (!perfil) return { item: null, error: 'Não foi possível identificar o profissional logado.' };
  const { data, error } = await supabase
    .from('catalogo_exercicios')
    .insert({ ...dados, clinica_id: perfil.clinica_id, criado_por: perfil.id })
    .select(CAMPOS)
    .single();
  return { item: (data as ExercicioCatalogo) ?? null, error: error?.message ?? null };
}

export async function obterUrlAssinadaExercicio(caminho: string | null): Promise<string | null> {
  if (!caminho) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 60 * 60);
  return data?.signedUrl ?? null;
}

export type MidiaEscolhida = {
  nome: string;
  tipoMime: string;
  tamanho: number;
  blob: Blob;
};

function escolherArquivoWeb(accept: string): Promise<File | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // Safari/Firefox: 'cancel' nem sempre dispara; sem seleção o Promise fica
    // pendente sem efeito colateral, o que é aceitável.
    input.click();
  });
}

/**
 * Abre o seletor de mídia do sistema. Web = <input type="file">;
 * nativo = galeria via expo-image-picker. `null` = cancelou / sem permissão.
 */
export async function escolherArquivo(tipo: 'imagem' | 'video'): Promise<MidiaEscolhida | null> {
  if (Platform.OS === 'web') {
    const file = await escolherArquivoWeb(tipo === 'video' ? 'video/*' : 'image/*');
    if (!file) return null;
    return {
      nome: file.name,
      tipoMime: file.type || (tipo === 'video' ? 'video/mp4' : 'image/jpeg'),
      tamanho: file.size,
      blob: file,
    };
  }

  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) return null;

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: tipo === 'video' ? ['videos'] : ['images'],
    quality: tipo === 'imagem' ? 0.85 : undefined,
  });
  if (resultado.canceled || !resultado.assets?.length) return null;

  const asset = resultado.assets[0];
  const resposta = await fetch(asset.uri);
  const blob = await resposta.blob();
  return {
    nome: asset.fileName ?? `${Date.now()}.${tipo === 'video' ? 'mp4' : 'jpg'}`,
    tipoMime: asset.mimeType ?? blob.type ?? (tipo === 'video' ? 'video/mp4' : 'image/jpeg'),
    tamanho: asset.fileSize ?? blob.size,
    blob,
  };
}

export async function enviarMidiaExercicio(
  midia: MidiaEscolhida,
  tipo: 'imagem' | 'video',
  clinicaId: string
): Promise<{ path: string | null; error: string | null }> {
  if (tipo === 'video' && midia.tamanho > TAMANHO_MAX_VIDEO_MB * 1024 * 1024) {
    return {
      path: null,
      error: `Vídeo acima de ${TAMANHO_MAX_VIDEO_MB} MB. Cole um link do vídeo em vez de enviar o arquivo.`,
    };
  }
  const ext = (midia.nome.split('.').pop() || (tipo === 'video' ? 'mp4' : 'jpg')).toLowerCase();
  const caminho = `${clinicaId}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, midia.blob, { contentType: midia.tipoMime || undefined });
  if (error) return { path: null, error: error.message };
  return { path: caminho, error: null };
}
