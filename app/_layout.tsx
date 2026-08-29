import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
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
import { paletas, palette } from '@/constants/Colors';
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

  return (
    <ThemeProvider value={temaNavegacao(esquema)}>
      <View className="flex-1 bg-fundo">
        <Stack screenOptions={{ contentStyle: { backgroundColor: paletas[esquema].fundo } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="admin" options={{ presentation: 'modal', title: 'Painel de Admin' }} />
          <Stack.Screen
            name="consulta/nova"
            options={{ presentation: 'modal', title: 'Nova consulta' }}
          />
          <Stack.Screen name="consulta/[id]" options={{ title: 'Consulta' }} />
        </Stack>
        <Aviso />
      </View>
    </ThemeProvider>
  );
}
