import { supabase } from '@/.lib/supabase';

export type PerfilProfissional = {
  id: string;
  clinica_id: string;
  papel: string;
};

export async function obterPerfilProfissional(): Promise<PerfilProfissional | null> {
  const { data: usuario } = await supabase.auth.getUser();
  if (!usuario.user) return null;

  const { data } = await supabase
    .from('profissionais')
    .select('id, clinica_id, papel')
    .eq('id', usuario.user.id)
    .single();

  return data;
}
