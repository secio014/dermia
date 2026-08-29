import { useSyncExternalStore } from 'react';

// Aviso global de "ação concluída" (toast). Um store de módulo simples, no
// mesmo estilo de .lib/tema.ts — qualquer tela chama `avisar(...)` e o
// componente <Aviso /> montado no _layout mostra a mensagem por alguns segundos.

export type TomAviso = 'ok' | 'erro' | 'info';
export type Aviso = { id: number; texto: string; tom: TomAviso };

let atual: Aviso | null = null;
let seq = 0;
const ouvintes = new Set<() => void>();

function emitir() {
  for (const ouvinte of ouvintes) ouvinte();
}

export function avisar(texto: string, tom: TomAviso = 'ok') {
  atual = { id: ++seq, texto, tom };
  emitir();
}

export function limparAviso() {
  if (!atual) return;
  atual = null;
  emitir();
}

export function useAviso(): Aviso | null {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
    () => atual,
    () => atual
  );
}
