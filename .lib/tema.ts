import { useEffect, useSyncExternalStore } from 'react';
import { useColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { paletas } from '@/constants/Colors';

export type PreferenciaTema = 'light' | 'dark' | 'system';

const CHAVE = 'dermia:tema';

/**
 * A preferência ("light" | "dark" | "system") vive num único store de módulo —
 * todos os `useTema()` do app leem a mesma fonte via `useSyncExternalStore`.
 * Antes cada consumidor guardava seu próprio `useState` + fazia `setState`
 * assíncrono do `AsyncStorage.then(...)`, o que disparava o aviso do React
 * "state update on a component that hasn't mounted yet" quando um consumidor
 * desmontava antes da promise resolver.
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

/**
 * Tema do app. `preferencia` é o que o usuário escolheu ("system" segue o
 * aparelho); `esquema` é o tema efetivamente aplicado ("light" | "dark");
 * `cores` é a paleta JS correspondente (para ActivityIndicator, navegação…).
 */
export function useTema() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const preferencia = useSyncExternalStore(assinar, lerPreferencia, lerPreferencia);

  // Carrega a preferência salva uma única vez para o app inteiro.
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

  // Aplica a preferência ao NativeWind sempre que ela muda.
  useEffect(() => {
    setColorScheme(preferencia);
  }, [preferencia, setColorScheme]);

  function escolher(nova: PreferenciaTema) {
    preferenciaAtual = nova;
    AsyncStorage.setItem(CHAVE, nova).catch(() => {});
    emitir();
  }

  const esquema: 'light' | 'dark' = colorScheme === 'dark' ? 'dark' : 'light';

  return { preferencia, esquema, cores: paletas[esquema], escolher };
}
