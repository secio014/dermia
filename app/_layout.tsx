import {
  DarkTheme,
  DefaultTheme,
  Redirect,
  Stack,
  ThemeProvider,
  useRouter,
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
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, useWindowDimensions, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import 'react-native-reanimated';
import '../global.css';

import WebShell from '@/components/nav/WebShell';
import Aviso from '@/components/ui/Aviso';
import BarraVisao from '@/components/ui/BarraVisao';
import BotaoTema from '@/components/ui/BotaoTema';
import LogoDermia from '@/components/ui/LogoDermia';
import SemAcesso from '@/components/ui/SemAcesso';
import { paletas, palette } from '@/constants/Colors';
import { usePapelEfetivo, usePerfilAtual } from '@/.lib/acesso';
import { instalarFonteInter } from '@/.lib/fonte';
import { useAplicarTema, useTema } from '@/.lib/tema';
import { LOGIN_DESATIVADO } from '@/.lib/dev';
import { supabase } from '@/.lib/supabase';
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

/**
 * Confirma que realmente NÃO há sessão antes de mandar para `/login`.
 *
 * Sem isso há uma corrida: `signInWithPassword` já resolveu (sessão válida na
 * memória do supabase-js), mas o evento `SIGNED_IN` ainda não chegou ao
 * `useSessao`, então `sessao` está `null` por um instante — e em produção
 * (`LOGIN_DESATIVADO = false`) o layout devolvia `<Redirect href="/login" />`,
 * "piscando" uma segunda tela de login logo depois de entrar.
 *
 * Enquanto essa checagem async não termina, o layout mostra um spinner em vez
 * de redirecionar; se de fato não há sessão, aí sim vai para o login.
 */
function useSemSessaoConfirmada(sessao: Session | null): boolean {
  const [confirmada, setConfirmada] = useState(false);

  useEffect(() => {
    if (sessao) {
      setConfirmada(false);
      return;
    }
    let vivo = true;
    setConfirmada(false);
    supabase.auth.getSession().then(({ data }) => {
      if (vivo && !data.session) setConfirmada(true);
    });
    return () => {
      vivo = false;
    };
  }, [sessao]);

  return confirmada;
}

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
  useAplicarTema();
  const { esquema } = useTema();
  const { sessao, carregando } = useSessao();
  const semSessaoConfirmada = useSemSessaoConfirmada(sessao);
  const { perfil, carregando: carregandoPerfil } = usePerfilAtual();
  const { papelReal, simulando } = usePapelEfetivo();
  const segmentos = useSegments();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [fontesProntas] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // A aba do navegador mostra "DermIA" em vez da URL. O +html.tsx só roda no
  // render estático (build); no dev server (`expo start --web`) e nas telas que
  // usam o WebShell (que renderiza <Slot/> sem opções de tela) o título não é
  // definido — então fixamos aqui, a cada navegação.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'DermIA';
    }
  });

  // Ativar "Ver como Paciente" leva o admin_geral pro Portal de verdade (uma
  // vez, no momento em que liga) em vez de deixar a tela profissional atual
  // por baixo. Depois disso ele continua livre pra navegar pra qualquer outra
  // página — o bloqueio de cada uma é o <Protegido> (mesma coisa que acontece
  // simulando Fisio/Estagiário), não um redirecionamento forçado a cada clique.
  const simulandoAnteriorRef = useRef<typeof simulando>(null);
  const vindoDaSimulacaoRef = useRef(false);
  useEffect(() => {
    if (papelReal === 'admin_geral') {
      const raizAtual = segmentos[0] as string | undefined;
      const acabouDeAtivar = simulando === 'paciente' && simulandoAnteriorRef.current !== 'paciente';
      if (acabouDeAtivar && raizAtual !== 'portal') {
        vindoDaSimulacaoRef.current = true;
        router.replace('/portal');
      } else if (simulando !== 'paciente' && raizAtual === 'portal' && vindoDaSimulacaoRef.current) {
        vindoDaSimulacaoRef.current = false;
        router.replace('/painel');
      }
    }
    simulandoAnteriorRef.current = simulando;
  }, [papelReal, simulando, segmentos, router]);

  if (carregando || !fontesProntas) {
    return (
      <View className="flex-1 bg-fundo items-center justify-center">
        <ActivityIndicator color={palette.primaria} />
      </View>
    );
  }

  SplashScreen.hideAsync();

  // `/` é a landing pública (home sobre o projeto + planos) e `/portal/*` tem sua
  // própria autenticação. Nenhuma das duas passa pelos gates da área profissional.
  const raiz = segmentos[0] as string | undefined;
  // Rotas sem gate da área profissional: landing, login único e portal do paciente.
  const rotaPublica =
    raiz == null || raiz === 'index' || raiz === 'login' || raiz === 'portal';

  // Na web larga a área profissional inteira fica dentro do menu lateral
  // (WebShell) — sem o header nativo em cima. A landing, o login e o portal ficam de fora.
  // Exceção: o admin_geral continua com acesso livre ao menu mesmo no Site (`/`)
  // e no Portal (visitando ou "vendo como Paciente") — só quem não tem papel
  // nenhum (visitante do site, paciente de verdade) vê essas rotas "peladas".
  const usarShell =
    Platform.OS === 'web' &&
    width >= 768 &&
    (!rotaPublica ||
      ((raiz === 'portal' || raiz == null || raiz === 'index') && papelReal === 'admin_geral'));

  if (!LOGIN_DESATIVADO && !sessao && !rotaPublica) {
    // Ainda pode ser a janela pós-login em que o evento SIGNED_IN não chegou —
    // segura um instante antes de decidir que é para ir ao login.
    if (!semSessaoConfirmada) {
      return (
        <View className="flex-1 bg-fundo items-center justify-center">
          <ActivityIndicator color={palette.primaria} />
        </View>
      );
    }
    return <Redirect href="/login" />;
  }

  // Fora do portal e da landing, a área profissional exige um perfil ativo em
  // `profissionais` — sem isso, nem admin nem fisioterapeuta entram.
  if (sessao && !rotaPublica) {
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

  const pilha = (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: paletas[esquema].fundo },
        headerShown: !usarShell,
        headerTitle: 'DermIA',
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 4 }}>
            <BotaoTema size={20} />
            <LogoDermia size={22} />
          </View>
        ),
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="portal/index" options={{ headerShown: false }} />
      <Stack.Screen name="portal/login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="global" options={{ headerShown: !usarShell, headerTitle: 'Visão global' }} />
      <Stack.Screen name="admin" options={{ presentation: usarShell ? 'card' : 'modal' }} />
      <Stack.Screen name="consulta/nova" options={{ presentation: usarShell ? 'card' : 'modal' }} />
      <Stack.Screen name="consulta/[id]" />
    </Stack>
  );

  return (
    <ThemeProvider value={temaNavegacao(esquema)}>
      <View className="flex-1 bg-fundo">
        <BarraVisao />
        {usarShell ? <WebShell>{pilha}</WebShell> : pilha}
        <Aviso />
      </View>
    </ThemeProvider>
  );
}
