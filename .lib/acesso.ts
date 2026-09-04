// Controle de acesso da área profissional (RBAC).
//
// Um usuário do Supabase Auth só entra na área profissional se tiver uma linha
// correspondente em `profissionais` e estiver `ativo`. O `papel` dessa linha
// define o que ele pode fazer — o mapa `PERMISSOES` abaixo é a fonte única
// disso no cliente. (O RLS no banco é a barreira real; isto aqui é a camada de
// UX: esconder/bloquear o que a pessoa não pode usar.)
//
// Papéis:
//  - `admin_geral`   — a plataforma (nossa empresa): enxerga todas as clínicas,
//                      todos os usuários, e pode pré-visualizar o app "na visão"
//                      de cada papel (ver `.lib/visao.ts`).
//  - `admin`         — administra uma clínica: equipe, exclusões, painel.
//  - `fisioterapeuta`— dia a dia clínico.
//  - `estagiario`    — mesmo escopo clínico do fisioterapeuta (supervisionado).

import { useEffect, useState } from 'react';

import { supabase } from '@/.lib/supabase';
import { useVisao, type VisaoSimulada } from '@/.lib/visao';

export type Papel = 'admin_geral' | 'admin' | 'fisioterapeuta' | 'estagiario';

export type PerfilAtual = {
  id: string;
  clinica_id: string | null;
  nome: string;
  email: string | null;
  papel: Papel;
  ativo: boolean;
};

/**
 * O que cada papel pode fazer. `fisioterapeuta`/`estagiario` cuidam do dia a
 * dia clínico; `admin` faz tudo isso e mais a gestão da clínica; `admin_geral`
 * faz tudo de `admin` e mais a visão global da plataforma.
 */
export const PERMISSOES = {
  admin_geral: [
    'painel_global',
    'ver_todas_clinicas',
    'alternar_visao',
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
  estagiario: [
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
  return perfil?.papel === 'admin' || perfil?.papel === 'admin_geral';
}

export function ehAdminGeral(perfil: Pick<PerfilAtual, 'papel'> | null | undefined): boolean {
  return perfil?.papel === 'admin_geral';
}

/**
 * Para onde mandar o usuário logo depois do login. O login é uma tela só — o
 * destino sai do vínculo da conta:
 *  - profissional ativo com papel `admin_geral` → visão global (`/global`);
 *  - qualquer outro profissional ativo → área da equipe (`/painel`);
 *  - linha em `pacientes` (user_id) → Portal do Paciente (`/portal`);
 *  - nenhum vínculo → `null` (conta sem acesso).
 */
export async function rotaInicialDoUsuario(): Promise<'/global' | '/painel' | '/portal' | null> {
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) return null;

  const { data: prof } = await supabase
    .from('profissionais')
    .select('papel, ativo')
    .eq('id', usuario.user.id)
    .maybeSingle();
  if (prof?.ativo) return prof.papel === 'admin_geral' ? '/global' : '/painel';

  const { data: pac } = await supabase
    .from('pacientes')
    .select('id')
    .eq('user_id', usuario.user.id)
    .maybeSingle();
  if (pac) return '/portal';

  return null;
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

/**
 * Papel "em vigor" na interface. Igual ao papel real, exceto quando um
 * `admin_geral` ativou o "Ver como" (`.lib/visao.ts`) — aí a UI passa a se
 * comportar como o papel escolhido; `'paciente'` vira papel nulo (as telas da
 * equipe bloqueiam, como aconteceria com um paciente de verdade).
 *
 * Isso é só apresentação: no banco o `admin_geral` continua podendo tudo. Serve
 * para conferir como cada tipo de usuário vê o app.
 */
export function usePapelEfetivo(): {
  papel: Papel | null;
  papelReal: Papel | null;
  simulando: VisaoSimulada | null;
} {
  const { perfil } = usePerfilAtual();
  const visao = useVisao();
  const papelReal = perfil?.papel ?? null;

  if (papelReal === 'admin_geral' && visao) {
    return {
      papel: visao === 'paciente' ? null : visao,
      papelReal,
      simulando: visao,
    };
  }
  return { papel: papelReal, papelReal, simulando: null };
}
