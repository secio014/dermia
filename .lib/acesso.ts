// Controle de acesso da área profissional (RBAC).
//
// Um usuário do Supabase Auth só entra na área profissional se tiver uma linha
// correspondente em `profissionais` e estiver `ativo`. O `papel` dessa linha
// ('admin' | 'fisioterapeuta') define o que ele pode fazer — o mapa `PERMISSOES`
// abaixo é a fonte única disso no cliente. (O RLS no banco é a barreira real;
// isto aqui é a camada de UX: esconder/bloquear o que a pessoa não pode usar.)

import { useEffect, useState } from 'react';

import { supabase } from '@/.lib/supabase';

export type Papel = 'admin' | 'fisioterapeuta';

export type PerfilAtual = {
  id: string;
  clinica_id: string;
  nome: string;
  email: string | null;
  papel: Papel;
  ativo: boolean;
};

/**
 * O que cada papel pode fazer. `fisioterapeuta` cuida do dia a dia clínico;
 * `admin` faz tudo isso e mais a gestão da clínica (equipe, exclusões, painel).
 */
export const PERMISSOES = {
  admin: [
    'painel_admin',
    'gerenciar_equipe',
    'excluir_paciente',
    'ver_indicadores',
    'gerenciar_pacientes',
    'gerenciar_lesoes',
    'prescrever',
    'emitir_documentos',
    'criar_acesso_portal',
  ],
  fisioterapeuta: [
    'gerenciar_pacientes',
    'gerenciar_lesoes',
    'prescrever',
    'emitir_documentos',
    'criar_acesso_portal',
  ],
} as const satisfies Record<Papel, readonly string[]>;

export type Permissao = (typeof PERMISSOES)[Papel][number];

export function papelPode(papel: Papel | null | undefined, permissao: Permissao): boolean {
  return !!papel && (PERMISSOES[papel] as readonly string[]).includes(permissao);
}

export function ehAdmin(perfil: Pick<PerfilAtual, 'papel'> | null | undefined): boolean {
  return perfil?.papel === 'admin';
}

// --- store de módulo -------------------------------------------------------
// Um único fetch do perfil por sessão, compartilhado por todos os `usePerfilAtual()`.
// Recarrega sempre que o estado de auth muda (login, logout, refresh de token).

let perfilAtual: PerfilAtual | null = null;
let estado: 'inicial' | 'carregando' | 'pronto' = 'inicial';
let erroAtual: string | null = null;
const ouvintes = new Set<() => void>();

function emitir() {
  for (const ouvinte of ouvintes) ouvinte();
}

async function carregarPerfil() {
  estado = estado === 'pronto' ? 'pronto' : 'carregando';
  emitir();

  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) {
    perfilAtual = null;
    erroAtual = null;
    estado = 'pronto';
    emitir();
    return;
  }

  const { data, error } = await supabase
    .from('profissionais')
    .select('id, clinica_id, nome, email, papel, ativo')
    .eq('id', usuario.user.id)
    .maybeSingle();

  perfilAtual = (data as PerfilAtual | null) ?? null;
  erroAtual = error?.message ?? null;
  estado = 'pronto';
  emitir();
}

let assinado = false;
function garantirAssinatura() {
  if (assinado) return;
  assinado = true;
  supabase.auth.onAuthStateChange(() => {
    // Adiado: rodar chamadas async direto no callback do onAuthStateChange
    // pode travar o supabase-js.
    setTimeout(() => {
      void carregarPerfil();
    }, 0);
  });
}

/**
 * Perfil profissional do usuário logado. `perfil` é `null` quando não há sessão
 * ou o usuário não é da equipe (ex.: paciente no portal). `carregando` fica
 * `true` até o primeiro fetch terminar.
 */
export function usePerfilAtual() {
  const [, forcar] = useState(0);

  useEffect(() => {
    const ouvinte = () => forcar((n) => n + 1);
    ouvintes.add(ouvinte);
    garantirAssinatura();
    if (estado === 'inicial') void carregarPerfil();
    return () => {
      ouvintes.delete(ouvinte);
    };
  }, []);

  return {
    perfil: perfilAtual,
    carregando: estado !== 'pronto',
    erro: erroAtual,
    recarregar: carregarPerfil,
  };
}
