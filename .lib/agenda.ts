import { obterPerfilProfissional } from '@/.lib/perfil';
import { supabase } from '@/.lib/supabase';

export type StatusConsulta = 'agendada' | 'realizada' | 'faltou' | 'cancelada';

export type Consulta = {
  id: string;
  paciente_id: string;
  profissional_id: string;
  inicio_em: string;
  duracao_min: number;
  motivo: string | null;
  observacoes: string | null;
  status: StatusConsulta;
};

export type ConsultaComPaciente = Consulta & {
  paciente: { nome_completo: string; codigo_pseudonimo: string } | null;
};

export const STATUS_CONSULTA: { id: StatusConsulta; rotulo: string }[] = [
  { id: 'agendada', rotulo: 'Agendada' },
  { id: 'realizada', rotulo: 'Realizada' },
  { id: 'faltou', rotulo: 'Faltou' },
  { id: 'cancelada', rotulo: 'Cancelada' },
];

// Horários mostrados na grade semanal.
export const HORA_INICIO = 7;
export const HORA_FIM = 20;

export function inicioDaSemana(base: Date): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const diaSemana = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - diaSemana);
  return d;
}

export function diasDaSemana(base: Date): Date[] {
  const inicio = inicioDaSemana(base);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });
}

export function mesmaData(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export async function listarConsultas(de: Date, ate: Date): Promise<ConsultaComPaciente[]> {
  const { data } = await supabase
    .from('consultas')
    .select(
      'id, paciente_id, profissional_id, inicio_em, duracao_min, motivo, observacoes, status, paciente:pacientes(nome_completo, codigo_pseudonimo)'
    )
    .gte('inicio_em', de.toISOString())
    .lt('inicio_em', ate.toISOString())
    .order('inicio_em', { ascending: true });
  return (data as ConsultaComPaciente[] | null) ?? [];
}

export async function proximaConsulta(pacienteId: string): Promise<Consulta | null> {
  const { data } = await supabase
    .from('consultas')
    .select('id, paciente_id, profissional_id, inicio_em, duracao_min, motivo, observacoes, status')
    .eq('paciente_id', pacienteId)
    .eq('status', 'agendada')
    .gte('inicio_em', new Date().toISOString())
    .order('inicio_em', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Consulta | null) ?? null;
}

export async function obterConsulta(id: string): Promise<ConsultaComPaciente | null> {
  const { data } = await supabase
    .from('consultas')
    .select(
      'id, paciente_id, profissional_id, inicio_em, duracao_min, motivo, observacoes, status, paciente:pacientes(nome_completo, codigo_pseudonimo)'
    )
    .eq('id', id)
    .maybeSingle();
  return (data as ConsultaComPaciente | null) ?? null;
}

type DadosConsulta = {
  paciente_id: string;
  inicio_em: string;
  duracao_min: number;
  motivo?: string | null;
  observacoes?: string | null;
};

export async function criarConsulta(dados: DadosConsulta): Promise<{ error: string | null }> {
  const perfil = await obterPerfilProfissional();
  if (!perfil) return { error: 'Não foi possível identificar o profissional logado.' };
  const { error } = await supabase.from('consultas').insert({
    ...dados,
    profissional_id: perfil.id,
  });
  return { error: error?.message ?? null };
}

export async function atualizarConsulta(
  id: string,
  dados: Partial<DadosConsulta> & { status?: StatusConsulta }
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('consultas').update(dados).eq('id', id);
  return { error: error?.message ?? null };
}

export async function excluirConsulta(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('consultas').delete().eq('id', id);
  return { error: error?.message ?? null };
}
