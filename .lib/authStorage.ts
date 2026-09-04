import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Adapter de storage do supabase-auth que respeita a opção "Manter-me
// conectado" da tela de login.
//
//  - lembrar = true  → tokens vão para o storage PERSISTENTE (localStorage no
//    navegador, AsyncStorage no app). A sessão sobrevive a fechar/reabrir.
//  - lembrar = false → tokens vão para o storage EFÊMERO (sessionStorage no
//    navegador; memória no app). Some quando a aba/app é fechado.
//
// A flag em si fica sempre no storage persistente, para dar pra decidir de onde
// LER a sessão no arranque. O `getItem`/`setItem` do supabase-js são async, então
// dá pra consultar a flag ali dentro.

const FLAG = 'dermia:lembrar';

type Simples = {
  getItem(k: string): string | null | Promise<string | null>;
  setItem(k: string, v: string): void | Promise<void>;
  removeItem(k: string): void | Promise<void>;
};

const memoria = new Map<string, string>();
const emMemoria: Simples = {
  getItem: (k) => memoria.get(k) ?? null,
  setItem: (k, v) => {
    memoria.set(k, v);
  },
  removeItem: (k) => {
    memoria.delete(k);
  },
};

function webStorage(nome: 'localStorage' | 'sessionStorage'): Simples | null {
  try {
    // Durante o SSR do expo-router não existe window/Storage.
    const s = typeof window !== 'undefined' ? (window as unknown as Record<string, Storage>)[nome] : null;
    return s ?? null;
  } catch {
    return null;
  }
}

const persistente: Simples =
  Platform.OS === 'web' ? webStorage('localStorage') ?? emMemoria : AsyncStorage;
const efemero: Simples =
  Platform.OS === 'web' ? webStorage('sessionStorage') ?? emMemoria : emMemoria;

async function lembrar(): Promise<boolean> {
  // Default: lembrar (só é efêmero quando o usuário desmarca explicitamente).
  return (await persistente.getItem(FLAG)) !== '0';
}

/** Chamada pela tela de login antes do signInWithPassword. */
export async function definirLembrar(valor: boolean): Promise<void> {
  await persistente.setItem(FLAG, valor ? '1' : '0');
  if (valor) return;
  // Ao desmarcar, tira qualquer sessão que já esteja no storage persistente.
  const chaves = ['sb-', 'supabase.auth.token'];
  try {
    if (Platform.OS === 'web') {
      const ls = webStorage('localStorage');
      if (ls && typeof window !== 'undefined') {
        for (let i = window.localStorage.length - 1; i >= 0; i--) {
          const k = window.localStorage.key(i);
          if (k && k !== FLAG && chaves.some((p) => k.startsWith(p))) ls.removeItem(k);
        }
      }
    }
  } catch {
    /* ignore */
  }
}

export const authStorage: Simples = {
  async getItem(k) {
    return (await lembrar()) ? persistente.getItem(k) : efemero.getItem(k);
  },
  async setItem(k, v) {
    if (await lembrar()) return persistente.setItem(k, v);
    await persistente.removeItem(k);
    return efemero.setItem(k, v);
  },
  async removeItem(k) {
    await persistente.removeItem(k);
    return efemero.removeItem(k);
  },
};
