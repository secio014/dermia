import * as Crypto from 'expo-crypto';
import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@/.lib/supabase';

// Reencodar a imagem (em vez de subir o arquivo original) já descarta os
// metadados EXIF/GPS da câmera — é a forma mais simples de anonimizar no RN.
export async function processarEEnviarFoto(uri: string, clinicaId: string, lesaoId: string) {
  const processada = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  if (!processada.base64) throw new Error('Falha ao processar a imagem.');

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    processada.base64,
    { encoding: Crypto.CryptoEncoding.HEX }
  );

  const nomeArquivo = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;
  const caminho = `${clinicaId}/${lesaoId}/${nomeArquivo}`;

  const resposta = await fetch(processada.uri);
  const blob = await resposta.blob();

  const { error } = await supabase.storage
    .from('fotos-lesoes')
    .upload(caminho, blob, { contentType: 'image/jpeg' });

  if (error) throw error;

  return { caminho, hash };
}

export async function obterUrlAssinada(caminho: string): Promise<string | null> {
  const { data } = await supabase.storage.from('fotos-lesoes').createSignedUrl(caminho, 60 * 10);
  return data?.signedUrl ?? null;
}

// Dispara a análise de IA de uma foto já salva (status vira "processando" e a
// Edge Function grava o resultado em alguns segundos).
export async function iniciarAnaliseIA(analiseId: string) {
  const { error } = await supabase
    .from('analises_ia')
    .update({ status: 'processando' })
    .eq('id', analiseId);
  if (error) throw error;
  await supabase.functions.invoke('analisar-lesao', { body: { analise_id: analiseId } });
}

// Apaga a análise + a foto no Storage (via Edge Function com service role).
export async function excluirAnalise(analiseId: string) {
  const { data, error } = await supabase.functions.invoke('excluir-analise', {
    body: { analise_id: analiseId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
