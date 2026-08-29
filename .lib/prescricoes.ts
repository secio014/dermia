import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

export type Prescricao = {
  id: string;
  paciente_id: string;
  profissional_id: string;
  nome: string;
  dose: string | null;
  frequencia: string | null;
  inicio: string | null;
  fim: string | null;
  observacoes: string | null;
  ativo: boolean;
  criado_em: string;
};

const CAMPOS =
  'id, paciente_id, profissional_id, nome, dose, frequencia, inicio, fim, observacoes, ativo, criado_em';

export async function listarPrescricoes(
  pacienteId: string,
  { somenteAtivas = false } = {}
): Promise<Prescricao[]> {
  let q = supabase
    .from('prescricoes')
    .select(CAMPOS)
    .eq('paciente_id', pacienteId)
    .order('ativo', { ascending: false })
    .order('criado_em', { ascending: false });
  if (somenteAtivas) q = q.eq('ativo', true);
  const { data } = await q;
  return (data as Prescricao[] | null) ?? [];
}

type DadosPrescricao = {
  paciente_id: string;
  nome: string;
  dose?: string | null;
  frequencia?: string | null;
  inicio?: string | null;
  fim?: string | null;
  observacoes?: string | null;
};

export async function criarPrescricao(dados: DadosPrescricao): Promise<{ error: string | null }> {
  const perfil = await obterPerfilProfissional();
  if (!perfil) return { error: 'Não foi possível identificar o profissional logado.' };
  const { error } = await supabase
    .from('prescricoes')
    .insert({ ...dados, profissional_id: perfil.id });
  return { error: error?.message ?? null };
}

export async function encerrarPrescricao(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('prescricoes')
    .update({ ativo: false, fim: new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  return { error: error?.message ?? null };
}
