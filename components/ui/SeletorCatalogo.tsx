import { useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/.lib/tema';

// Campo "escolher da lista": abre um Modal com busca + lista do catálogo e um
// atalho "Cadastrar novo…" que revela o formulário passado por quem usa.
// Segue o mesmo padrão de Modal do SeletorData (portal, folha no celular /
// card centralizado na web larga).

type Props<T> = {
  titulo: string;
  placeholder: string;
  textoSelecionado: string | null;
  itens: T[];
  keyItem: (item: T) => string;
  rotuloItem: (item: T) => string;
  descricaoItem?: (item: T) => string | null;
  busca: string;
  onBusca: (texto: string) => void;
  onSelecionar: (item: T) => void;
  // Recebe `fechar` para chamar depois de cadastrar (o item novo deve ser
  // selecionado por quem cadastra, via onSelecionar).
  renderFormNovo: (fechar: () => void) => ReactNode;
};

export default function SeletorCatalogo<T>({
  titulo,
  placeholder,
  textoSelecionado,
  itens,
  keyItem,
  rotuloItem,
  descricaoItem,
  busca,
  onBusca,
  onSelecionar,
  renderFormNovo,
}: Props<T>) {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const webLargo = Platform.OS === 'web' && width >= 768;
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<'lista' | 'novo'>('lista');

  function fechar() {
    setAberto(false);
    setModo('lista');
  }

  function conteudo(folha: boolean) {
    return (
      <View
        className={
          folha
            ? 'bg-superficie border-t border-borda rounded-t-3xl p-4 w-full'
            : 'bg-superficie border border-borda rounded-2xl p-4 w-[420px] max-w-full'
        }
        style={{ maxHeight: folha ? '80%' : 560 }}>
        {folha && <View className="self-center w-10 h-1 rounded-full bg-borda mb-3" />}

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-texto font-semibold text-base">
            {modo === 'lista' ? titulo : 'Cadastrar novo'}
          </Text>
          <Pressable onPress={fechar} className="w-9 h-9 items-center justify-center rounded-lg">
            <Ionicons name="close" size={20} color={cores.secundario} />
          </Pressable>
        </View>

        {modo === 'lista' ? (
          <>
            <TextInput
              value={busca}
              onChangeText={onBusca}
              placeholder="Buscar…"
              placeholderTextColor={cores.secundario}
              className="bg-fundo border border-borda rounded-xl px-4 py-3 mb-3 text-texto"
            />
            <ScrollView keyboardShouldPersistTaps="handled" className="mb-2">
              {itens.length === 0 ? (
                <Text className="text-secundario text-sm py-4 text-center">
                  Nenhum item no catálogo.
                </Text>
              ) : (
                itens.map((item) => {
                  const descricao = descricaoItem?.(item);
                  return (
                    <Pressable
                      key={keyItem(item)}
                      onPress={() => {
                        onSelecionar(item);
                        fechar();
                      }}
                      className="border-b border-borda py-3">
                      <Text className="text-texto">{rotuloItem(item)}</Text>
                      {descricao ? (
                        <Text className="text-secundario text-xs mt-0.5">{descricao}</Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable
              onPress={() => setModo('novo')}
              className="flex-row items-center justify-center gap-2 border border-primaria rounded-xl py-3 mt-1">
              <Ionicons name="add" size={18} color={cores.primaria} />
              <Text className="text-primaria font-semibold">Cadastrar novo</Text>
            </Pressable>
          </>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled">{renderFormNovo(fechar)}</ScrollView>
        )}
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={() => setAberto(true)}
        className="bg-superficie border border-borda rounded-xl px-4 py-3 flex-row items-center justify-between">
        <Text className={textoSelecionado ? 'text-texto' : 'text-secundario'}>
          {textoSelecionado || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={cores.secundario} />
      </Pressable>

      {aberto && (
        <Modal
          transparent
          animationType={webLargo ? 'fade' : 'slide'}
          onRequestClose={fechar}>
          <Pressable
            onPress={fechar}
            className={
              webLargo
                ? 'flex-1 bg-black/40 items-center justify-center px-6'
                : 'flex-1 bg-black/40 justify-end'
            }>
            <Pressable onPress={(e) => e.stopPropagation()} className={webLargo ? undefined : 'pb-6'}>
              {conteudo(!webLargo)}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
