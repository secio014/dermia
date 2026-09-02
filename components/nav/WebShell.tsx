import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Animated, Pressable, Text, View } from 'react-native';

import { ITENS_NAV } from '@/components/nav/itens';
import WebFooter from '@/components/nav/WebFooter';
import LogoDermia from '@/components/ui/LogoDermia';
import { ehAdmin, usePerfilAtual } from '@/.lib/acesso';
import { useTema } from '@/.lib/tema';

const CHAVE_MENU = 'dermia:menu-aberto';
const LARGURA_ABERTA = 240;
const LARGURA_FECHADA = 64;

// Rotas de topo (destinos fixos do menu) — nelas não aparece o "‹ Voltar".
const ROTAS_TOPO = ['/', '/painel', '/agenda', '/ajustes', '/admin'];

/**
 * Layout da web em telas largas (>= 768px): barra lateral à esquerda (recolhível
 * para uma trilha só de ícones, com transição suave) + área de conteúdo. Envolve
 * toda a área profissional — as páginas internas ganham um "‹ Voltar" no topo do
 * conteúdo em vez do header nativo. No celular / web estreita, o (tabs)/_layout
 * usa a barra inferior normal.
 */
export default function WebShell({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const emPaginaInterna = !ROTAS_TOPO.includes(pathname);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/painel');
  }
  const { cores, preferencia, escolher } = useTema();
  const { perfil } = usePerfilAtual();
  const [aberto, setAberto] = useState(true);
  const larguraAnim = useRef(new Animated.Value(LARGURA_ABERTA)).current;

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_MENU).then((v) => {
      if (v === 'true' || v === 'false') setAberto(v === 'true');
    });
  }, []);

  useEffect(() => {
    Animated.timing(larguraAnim, {
      toValue: aberto ? LARGURA_ABERTA : LARGURA_FECHADA,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [aberto, larguraAnim]);

  function alternarMenu() {
    setAberto((a) => {
      AsyncStorage.setItem(CHAVE_MENU, String(!a)).catch(() => {});
      return !a;
    });
  }

  return (
    <View className="flex-1 flex-row bg-fundo">
      <Animated.View style={{ width: larguraAnim, overflow: 'hidden' }}>
        <View className="flex-1 border-r border-borda bg-superficie py-4 px-2 justify-between">
          <View>
          <View
            className={`flex-row items-center mb-6 ${aberto ? 'justify-between px-1' : 'justify-center'}`}>
            {aberto && (
              <View className="flex-row items-center gap-2">
                <LogoDermia size={28} />
                <Text className="text-texto text-xl font-bold">DermIA</Text>
              </View>
            )}
            <Pressable
              onPress={alternarMenu}
              className="w-9 h-9 items-center justify-center rounded-lg"
              accessibilityLabel={aberto ? 'Recolher menu' : 'Expandir menu'}>
              <Ionicons
                name={aberto ? 'chevron-back' : 'menu'}
                size={20}
                color={cores.secundario}
              />
            </Pressable>
          </View>

          <ItemBarra
            icone="add"
            rotulo="Novo paciente"
            aberto={aberto}
            destaque
            cores={cores}
            onPress={() => router.push('/paciente/novo')}
          />

          <View className="h-2" />

          {ITENS_NAV.map((item) => {
            const ativo =
              item.rota === '/painel' ? pathname === '/painel' : pathname.startsWith(item.rota);
            return (
              <ItemBarra
                key={item.nome}
                icone={item.icone}
                rotulo={item.titulo}
                aberto={aberto}
                ativo={ativo}
                cores={cores}
                onPress={() => router.push(item.rota)}
              />
            );
          })}

          {ehAdmin(perfil) && (
            <ItemBarra
              icone="shield-checkmark-outline"
              rotulo="Admin"
              aberto={aberto}
              ativo={pathname.startsWith('/admin')}
              cores={cores}
              onPress={() => router.push('/admin')}
            />
          )}

          {__DEV__ && (
            <>
              <View className="h-2" />
              <ItemBarra
                icone="globe-outline"
                rotulo="Site"
                aberto={aberto}
                ativo={pathname === '/'}
                cores={cores}
                onPress={() => router.push('/')}
              />
              <ItemBarra
                icone="person-outline"
                rotulo="Portal do paciente"
                aberto={aberto}
                ativo={pathname.startsWith('/portal')}
                cores={cores}
                onPress={() => router.push('/portal')}
              />
            </>
          )}
        </View>

        {aberto ? (
          <View className="flex-row gap-1 px-1">
            {(['light', 'dark', 'system'] as const).map((op) => (
              <Pressable
                key={op}
                onPress={() => escolher(op)}
                className={`flex-1 items-center rounded-lg py-2 ${
                  preferencia === op ? 'bg-primaria-suave' : ''
                }`}>
                <Ionicons
                  name={
                    op === 'light' ? 'sunny-outline' : op === 'dark' ? 'moon-outline' : 'contrast-outline'
                  }
                  size={18}
                  color={preferencia === op ? cores.primaria : cores.secundario}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => escolher(preferencia === 'dark' ? 'light' : 'dark')}
            className="items-center py-2">
            <Ionicons name="contrast-outline" size={18} color={cores.secundario} />
          </Pressable>
        )}
        </View>
      </Animated.View>

      <View className="flex-1 bg-fundo">
        <View className="flex-1 w-full self-center" style={{ maxWidth: 1100 }}>
          {emPaginaInterna && (
            <Pressable
              onPress={voltar}
              accessibilityLabel="Voltar"
              className="flex-row items-center gap-1 px-4 pt-3 pb-1 self-start">
              <Ionicons name="chevron-back" size={18} color={cores.primaria} />
              <Text className="text-primaria font-medium">Voltar</Text>
            </Pressable>
          )}
          {children ?? <Slot />}
        </View>
        <WebFooter />
      </View>
    </View>
  );
}

function ItemBarra({
  icone,
  rotulo,
  aberto,
  ativo,
  destaque,
  cores,
  onPress,
}: {
  icone: React.ComponentProps<typeof Ionicons>['name'];
  rotulo: string;
  aberto: boolean;
  ativo?: boolean;
  destaque?: boolean;
  cores: { primaria: string; secundario: string };
  onPress: () => void;
}) {
  const corIcone = destaque ? '#fff' : ativo ? cores.primaria : cores.secundario;
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={rotulo}
      className={`flex-row items-center rounded-xl mb-1 ${aberto ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'} ${
        destaque ? 'bg-primaria' : ativo ? 'bg-primaria-suave' : ''
      }`}>
      <Ionicons name={icone} size={20} color={corIcone} />
      {aberto && (
        <Text
          className={`font-semibold ${
            destaque ? 'text-white' : ativo ? 'text-primaria' : 'text-secundario'
          }`}>
          {rotulo}
        </Text>
      )}
    </Pressable>
  );
}
