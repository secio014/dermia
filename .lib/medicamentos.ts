import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

export type MedicamentoCatalogo = {
  id: string;
  clinica_id: string | null;
  nome: string;
  apresentacao: string | null;
  via: string | null;
  dose_padrao: string | null;
  frequencia_padrao: string | null;
  observacoes: string | null;
  ativo: boolean;
};

const CAMPOS =
  'id, clinica_id, nome, apresentacao, via, dose_padrao, frequencia_padrao, observacoes, ativo';

export async function listarCatalogoMedicamentos(busca = ''): Promise<MedicamentoCatalogo[]> {
  let q = supabase
    .from('catalogo_medicamentos')
    .select(CAMPOS)
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (busca.trim()) q = q.ilike('nome', `%${busca.trim()}%`);
  const { data } = await q;
  return (data as MedicamentoCatalogo[] | null) ?? [];
}

type DadosMedicamento = {
  nome: string;
  apresentacao?: string | null;
  via?: string | null;
  dose_padrao?: string | null;
  frequencia_padrao?: string | null;
  observacoes?: string | null;
};

export async function criarMedicamentoCatalogo(
  dados: DadosMedicamento
): Promise<{ item: MedicamentoCatalogo | null; error: string | null }> {
  const perfil = await obterPerfilProfissional();
  if (!perfil) return { item: null, error: 'Não foi possível identificar o profissional logado.' };
  const { data, error } = await supabase
    .from('catalogo_medicamentos')
    .insert({ ...dados, clinica_id: perfil.clinica_id, criado_por: perfil.id })
    .select(CAMPOS)
    .single();
  return { item: (data as MedicamentoCatalogo) ?? null, error: error?.message ?? null };
}
