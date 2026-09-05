import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BotaoMenuNav from '@/components/nav/BotaoMenuNav';
import { ROTAS_PRINCIPAIS } from '@/components/nav/itens';
import BotaoTema from '@/components/ui/BotaoTema';
import LogoDermia from '@/components/ui/LogoDermia';
import { useTema } from '@/.lib/tema';

/**
 * Header padrão da área profissional fora da barra lateral (web estreita e
 * app nativo): menu + tema sempre à direita. À esquerda, marca (logo +
 * "DermIA") nos destinos fixos de navegação (`ROTAS_PRINCIPAIS`) ou "‹
 * Voltar" em qualquer subpágina alcançada por navegação (novo paciente,
 * receita, consulta etc.) — mesmo visual em toda tela sem barra inferior.
 */
export default function HeaderPadrao() {
  const { cores } = useTema();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const emSubpagina = !ROTAS_PRINCIPAIS.includes(pathname);

  function voltar() {
    if (router.canGoBack()) router.back();
    else router.replace('/painel');
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: insets.top + 12,
        paddingBottom: 12,
        backgroundColor: cores.superficie,
        borderBottomWidth: 1,
        borderBottomColor: cores.borda,
      }}>
      {emSubpagina ? (
        <Pressable
          onPress={voltar}
          accessibilityLabel="Voltar"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name="chevron-back" size={20} color={cores.primaria} />
          <Text style={{ color: cores.primaria, fontSize: 15, fontWeight: '600' }}>Voltar</Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <LogoDermia size={22} />
          <Text style={{ color: cores.texto, fontSize: 17, fontWeight: '700' }}>DermIA</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BotaoMenuNav alinhar="right" />
        <BotaoTema size={20} />
      </View>
    </View>
  );
}
