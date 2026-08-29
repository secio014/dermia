import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/.lib/tema';

// Catálogo inline: campo de busca + lista já visível na tela + atalho
// "Cadastrar novo…" que troca a lista pelo formulário passado por quem usa.
// Escolher um item chama `onSelecionar`; o item escolhido fica destacado.

type Props<T> = {
  itens: T[];
  keyItem: (item: T) => string;
  rotuloItem: (item: T) => string;
  descricaoItem?: (item: T) => string | null;
  idSelecionado?: string | null;
  busca: string;
  onBusca: (texto: string) => void;
  onSelecionar: (item: T) => void;
  // Recebe `fechar` para chamar depois de cadastrar (quem cadastra também deve
  // chamar `onSelecionar` com o item novo).
  renderFormNovo: (fechar: () => void) => ReactNode;
  alturaLista?: number;
};

export default function SeletorCatalogo<T>({
  itens,
  keyItem,
  rotuloItem,
  descricaoItem,
  idSelecionado,
  busca,
  onBusca,
  onSelecionar,
  renderFormNovo,
  alturaLista = 240,
}: Props<T>) {
  const { cores } = useTema();
  const [modo, setModo] = useState<'lista' | 'novo'>('lista');

  if (modo === 'novo') {
    return (
      <View className="border border-borda rounded-xl p-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-texto font-semibold">Cadastrar novo</Text>
          <Pressable
            onPress={() => setModo('lista')}
            className="flex-row items-center gap-1 px-2 py-1">
            <Ionicons name="chevron-back" size={16} color={cores.secundario} />
            <Text className="text-secundario text-xs font-semibold">Voltar à lista</Text>
          </Pressable>
        </View>
        {renderFormNovo(() => setModo('lista'))}
      </View>
    );
  }

  return (
    <View>
      <TextInput
        value={busca}
        onChangeText={onBusca}
        placeholder="Buscar no catálogo…"
        placeholderTextColor={cores.secundario}
        className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-2 text-texto"
      />

      <View className="border border-borda rounded-xl overflow-hidden" style={{ maxHeight: alturaLista }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          {itens.length === 0 ? (
            <Text className="text-secundario text-sm py-6 text-center">
              {busca ? 'Nada encontrado.' : 'Catálogo vazio — cadastre o primeiro item.'}
            </Text>
          ) : (
            itens.map((item) => {
              const selecionado = idSelecionado != null && keyItem(item) === idSelecionado;
              const descricao = descricaoItem?.(item);
              return (
                <Pressable
                  key={keyItem(item)}
                  onPress={() => onSelecionar(item)}
                  className={`px-4 py-3 border-b border-borda flex-row items-center justify-between ${
                    selecionado ? 'bg-primaria-suave' : ''
                  }`}>
                  <View className="flex-1 pr-2">
                    <Text className={selecionado ? 'text-primaria font-semibold' : 'text-texto'}>
                      {rotuloItem(item)}
                    </Text>
                    {descricao ? (
                      <Text className="text-secundario text-xs mt-0.5">{descricao}</Text>
                    ) : null}
                  </View>
                  {selecionado && (
                    <Ionicons name="checkmark-circle" size={18} color={cores.primaria} />
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>

      <Pressable
        onPress={() => setModo('novo')}
        className="flex-row items-center justify-center gap-2 border border-primaria rounded-xl py-3 mt-2">
        <Ionicons name="add" size={18} color={cores.primaria} />
        <Text className="text-primaria font-semibold">Cadastrar novo</Text>
      </Pressable>
    </View>
  );
}
