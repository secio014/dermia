import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// "Ver como" — só faz sentido para o papel `admin_geral`. Guarda qual papel a
// interface deve simular para pré-visualizar o app na visão de cada tipo de
// usuário. Não muda nada no banco (o RLS do admin_geral continua liberando
// tudo); só a UI reage.
//
// Store de módulo no mesmo estilo do `.lib/tema.ts`: todos os `useVisao()` leem
// a mesma fonte via `useSyncExternalStore`.

export type VisaoSimulada = 'admin' | 'fisioterapeuta' | 'estagiario' | 'paciente';

const CHAVE = 'dermia:ver-como';
const VALIDOS: VisaoSimulada[] = ['admin', 'fisioterapeuta', 'estagiario', 'paciente'];

let atual: VisaoSimulada | null = null;
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

function ler() {
  return atual;
}

// Recupera a escolha salva uma vez, no carregamento do módulo.
AsyncStorage.getItem(CHAVE)
  .then((valor) => {
    if (valor && (VALIDOS as string[]).includes(valor)) {
      atual = valor as VisaoSimulada;
      emitir();
    }
  })
  .catch(() => {});

/** Define (ou limpa, com `null`) o papel simulado. */
export function definirVisao(valor: VisaoSimulada | null): void {
  atual = valor;
  if (valor) AsyncStorage.setItem(CHAVE, valor).catch(() => {});
  else AsyncStorage.removeItem(CHAVE).catch(() => {});
  emitir();
}

/** Papel simulado atual, ou `null` quando não há simulação ativa. */
export function useVisao(): VisaoSimulada | null {
  return useSyncExternalStore(assinar, ler, ler);
}
