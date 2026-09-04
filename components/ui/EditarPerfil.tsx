import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, Pressable, Text, TextInput, View } from 'react-native';

import { enviarFotoDePerfil } from '@/.lib/foto';
import { usePerfilAtual, type PerfilAtual } from '@/.lib/acesso';
import { avisar } from '@/.lib/aviso';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

function Avatar({ perfil, tamanho = 64 }: { perfil: PerfilAtual; tamanho?: number }) {
  const { cores } = useTema();
  if (perfil.foto_url) {
    return (
      <Image
        source={{ uri: perfil.foto_url }}
        style={{ width: tamanho, height: tamanho, borderRadius: tamanho / 2 }}
      />
    );
  }
  const inicial = perfil.nome.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: cores.primariaSuave,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ color: cores.primaria, fontSize: tamanho * 0.4, fontWeight: '700' }}>
        {inicial}
      </Text>
    </View>
  );
}

// Edição do próprio perfil: foto, nome e (pra quem atende paciente) uma
// biografia curta — é o que o paciente vê no Portal sobre quem cuida dele.
export default function EditarPerfil() {
  const { cores } = useTema();
  const { perfil, recarregar } = usePerfilAtual();
  const [nome, setNome] = useState(perfil?.nome ?? '');
  const [biografia, setBiografia] = useState(perfil?.biografia ?? '');
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [salvandoBio, setSalvandoBio] = useState(false);

  if (!perfil) return null;

  const nomeMudou = nome.trim() !== perfil.nome && nome.trim().length >= 2;
  const bioMudou = biografia !== (perfil.biografia ?? '');
  const mostraBio = perfil.papel !== 'admin_geral';

  async function trocarFoto() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled || !resultado.assets[0]?.uri) return;
    setEnviandoFoto(true);
    try {
      const url = await enviarFotoDePerfil(resultado.assets[0].uri, perfil!.id);
      const { error } = await supabase
        .from('profissionais')
        .update({ foto_url: url })
        .eq('id', perfil!.id);
      if (error) throw error;
      await recarregar();
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Falha ao enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function salvarNome() {
    setSalvandoNome(true);
    const { error } = await supabase
      .from('profissionais')
      .update({ nome: nome.trim() })
      .eq('id', perfil!.id);
    setSalvandoNome(false);
    if (error) return avisar(error.message);
    await recarregar();
  }

  async function salvarBio() {
    setSalvandoBio(true);
    const { error } = await supabase
      .from('profissionais')
      .update({ biografia: biografia.trim() || null })
      .eq('id', perfil!.id);
    setSalvandoBio(false);
    if (error) return avisar(error.message);
    await recarregar();
  }

  const campo = 'bg-fundo border border-borda rounded-xl px-4 py-3 text-texto';

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-4">
        <Avatar perfil={perfil} />
        <Pressable onPress={trocarFoto} disabled={enviandoFoto}>
          {enviandoFoto ? (
            <ActivityIndicator color={cores.primaria} />
          ) : (
            <Text className="text-primaria font-semibold">Alterar foto</Text>
          )}
        </Pressable>
      </View>

      <View>
        <Text className="text-secundario text-xs font-semibold uppercase mb-1">Nome</Text>
        <View className="flex-row gap-2">
          <TextInput value={nome} onChangeText={setNome} className={`flex-1 ${campo}`} />
          <Pressable
            onPress={salvarNome}
            disabled={!nomeMudou || salvandoNome}
            className={`rounded-xl px-4 items-center justify-center ${
              nomeMudou ? 'bg-primaria' : 'bg-fundo border border-borda'
            }`}>
            {salvandoNome ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className={`font-semibold ${nomeMudou ? 'text-white' : 'text-secundario'}`}>
                Salvar
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      {mostraBio && (
        <View>
          <Text className="text-secundario text-xs font-semibold uppercase mb-1">
            Sobre você
          </Text>
          <Text className="text-secundario text-xs mb-2">
            Aparece pro paciente no Portal, junto com sua foto — conte um pouco sobre você e seu
            trabalho.
          </Text>
          <TextInput
            value={biografia}
            onChangeText={setBiografia}
            multiline
            numberOfLines={4}
            placeholder="Ex.: Fisioterapeuta há 8 anos, especialista em reabilitação de queimaduras..."
            placeholderTextColor={cores.secundario}
            className={campo}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <Pressable
            onPress={salvarBio}
            disabled={!bioMudou || salvandoBio}
            className={`self-start rounded-xl px-4 py-2 mt-2 ${
              bioMudou ? 'bg-primaria' : 'bg-fundo border border-borda'
            }`}>
            {salvandoBio ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text className={`font-semibold ${bioMudou ? 'text-white' : 'text-secundario'}`}>
                Salvar
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
