import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useColorScheme } from 'nativewind';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { paletas } from '@/constants/Colors';

export type PreferenciaTema = 'light' | 'dark' | 'system';

const CHAVE = 'dermia:tema';

/**
 * A preferência ("light" | "dark" | "system") vive num único store de módulo —
 * todos os `useTema()` do app leem a mesma fonte via `useSyncExternalStore`.
 *
 * O efeito colateral de aplicar essa preferência ao NativeWind (e ao <html> na
 * web) fica num único dono: `useAplicarTema()`, chamado uma vez no layout raiz.
 * Antes esse efeito rodava dentro de todo `useTema()`, e cada consumidor
 * chamava `setColorScheme` no mount — quando um deles disparava enquanto outra
 * tela ainda montava, o React reclamava de "state update on a component that
 * hasn't mounted yet".
 */
let preferenciaAtual: PreferenciaTema = 'system';
let carregada = false;
const ouvintes = new Set<() => void>();

function emitir() {
  for (const ouvinte of ouvintes) ouvinte();
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

function lerPreferencia() {
  return preferenciaAtual;
}

/** Muda a preferência de tema (compartilhada por todo o app). */
export function definirPreferencia(nova: PreferenciaTema) {
  preferenciaAtual = nova;
  AsyncStorage.setItem(CHAVE, nova).catch(() => {});
  emitir();
}

/**
 * Aplica a preferência de tema. Chame UMA vez, no layout raiz. Carrega a
 * escolha salva, sincroniza o NativeWind e marca o <html> na web.
 */
export function useAplicarTema() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const preferencia = useSyncExternalStore(assinar, lerPreferencia, lerPreferencia);

  // Lê o valor mais recente do esquema sem re-disparar o efeito.
  const esquemaRef = useRef(colorScheme);
  esquemaRef.current = colorScheme;

  // Carrega a preferência salva uma única vez.
  useEffect(() => {
    if (carregada) return;
    carregada = true;
    AsyncStorage.getItem(CHAVE)
      .then((valor) => {
        if (valor === 'light' || valor === 'dark' || valor === 'system') {
          preferenciaAtual = valor;
          emitir();
        }
      })
      .catch(() => {});
  }, []);

  // Sincroniza preferência -> NativeWind, só quando o alvo realmente muda.
  useEffect(() => {
    const definir = (alvo: 'light' | 'dark' | 'system') => {
      if (alvo !== esquemaRef.current) setColorScheme(alvo);
    };

    // No nativo, `setColorScheme('system')` já faz o NativeWind seguir o
    // aparelho. Na web com `darkMode: 'class'` o NativeWind não reage sozinho
    // ao `prefers-color-scheme` quando a preferência é "system" — então
    // ouvimos a media query e resolvemos para 'light' / 'dark'.
    if (Platform.OS === 'web' && preferencia === 'system' && typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const aplicar = () => definir(mq.matches ? 'dark' : 'light');
      aplicar();
      mq.addEventListener('change', aplicar);
      return () => mq.removeEventListener('change', aplicar);
    }
    definir(preferencia);
  }, [preferencia, setColorScheme]);

  // Marca a escolha no <html> (web) para o CSS resolver o tema antes de o JS do
  // NativeWind rodar — `@media (prefers-color-scheme)` usa `[data-tema]` para a
  // escolha explícita ganhar do SO.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.dataset.tema = preferencia;
    }
  }, [preferencia]);
}

/**
 * Tema do app (somente leitura). `preferencia` é o que o usuário escolheu
 * ("system" segue o aparelho); `esquema` é o tema efetivo ("light" | "dark");
 * `cores` é a paleta JS correspondente; `escolher` troca a preferência.
 */
export function useTema() {
  const { colorScheme } = useColorScheme();
  const preferencia = useSyncExternalStore(assinar, lerPreferencia, lerPreferencia);
  const esquema: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';

  return { preferencia, esquema, cores: paletas[esquema], escolher: definirPreferencia };
}
