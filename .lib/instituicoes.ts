// Mesma segmentação dos planos da landing page (`app/index.tsx`) — separa as
// instituições (`clinicas`) por porte pra facilitar visão/administração
// quando a plataforma cresce. Ver supabase/scripts/clinicas-tipo.sql.

export type TipoInstituicao = 'clinica' | 'hospital' | 'grupo';

export const TIPOS_INSTITUICAO: TipoInstituicao[] = ['clinica', 'hospital', 'grupo'];

export const ROTULO_TIPO: Record<TipoInstituicao, string> = {
  clinica: 'Clínicas',
  hospital: 'Hospitais',
  grupo: 'Redes / Grupos',
};

// A coluna `tipo` é nova — enquanto o script não roda numa instância, o
// Postgrest não devolve a coluna. Trata como 'clinica' nesse caso.
export function tipoClinica(c: Record<string, unknown>): TipoInstituicao {
  const t = c.tipo as string | undefined;
  return (TIPOS_INSTITUICAO as string[]).includes(t ?? '') ? (t as TipoInstituicao) : 'clinica';
}
