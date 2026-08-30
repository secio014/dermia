import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useSegments,
  type Theme,
} from 'expo-router';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import Auth from '@/components/Auth';
import Aviso from '@/components/ui/Aviso';
import BotaoTema from '@/components/ui/BotaoTema';
import LogoDermia from '@/components/ui/LogoDermia';
import SemAcesso from '@/components/ui/SemAcesso';
import { paletas, palette } from '@/constants/Colors';
import { usePerfilAtual } from '@/.lib/acesso';
import { instalarFonteInter } from '@/.lib/fonte';
import { useTema } from '@/.lib/tema';
import { LOGIN_DESATIVADO } from '@/.lib/dev';
import { useSessao } from '@/.lib/useSessao';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/admin` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before fonts/theme are resolved.
SplashScreen.preventAutoHideAsync();
instalarFonteInter();

function temaNavegacao(esquema: 'light' | 'dark'): Theme {
  const base = esquema === 'dark' ? DarkTheme : DefaultTheme;
  const c = paletas[esquema];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primaria,
      background: c.fundo,
      card: c.superficie,
      text: c.texto,
      border: c.borda,
      notification: c.risco,
    },
  };
}

export default function RootLayout() {
  const { esquema } = useTema();
  const { sessao, carregando } = useSessao();
  const { perfil, carregando: carregandoPerfil } = usePerfilAtual();
  const segmentos = useSegments();
  const [fontesProntas] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (carregando || !fontesProntas) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  SplashScreen.hideAsync();

  if (!LOGIN_DESATIVADO && !sessao) {
    return <Auth />;
  }

  // O portal do paciente tem sua própria autenticação (o paciente não é da
  // equipe). Fora dele, a área profissional exige um perfil ativo em
  // `profissionais` — sem isso, nem admin nem fisioterapeuta entram.
  const noPortal = segmentos[0] === 'portal';
  if (sessao && !noPortal) {
    if (carregandoPerfil) {
      return (
        <View className="flex-1 bg-fundo items-center justify-center">
          <ActivityIndicator color={palette.primaria} />
        </View>
      );
    }
    if (!perfil || !perfil.ativo) {
      return (
        <SemAcesso
          mensagem={
            !perfil
              ? 'Esta conta não faz parte de nenhuma clínica. Use o Portal do Paciente ou fale com o administrador.'
              : 'Seu acesso foi desativado. Fale com o administrador da clínica.'
          }
        />
      );
    }
  }

  return (
    <ThemeProvider value={temaNavegacao(esquema)}>
      <View className="flex-1 bg-fundo">
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: paletas[esquema].fundo },
            headerTitle: 'Derm.IA',
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
                <BotaoTema size={20} />
                <LogoDermia size={22} />
              </View>
            ),
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ presentation: 'modal' }} />
          <Stack.Screen name="consulta/nova" options={{ presentation: 'modal' }} />
          <Stack.Screen name="consulta/[id]" />
        </Stack>
        <Aviso />
      </View>
    </ThemeProvider>
  );
}
