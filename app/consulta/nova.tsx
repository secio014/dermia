import { router, useLocalSearchParams } from 'expo-router';

import FormConsulta, { isoDeDataHora, type ValoresConsulta } from '@/components/agenda/FormConsulta';
import { criarConsulta } from '@/.lib/agenda';

function agoraArredondado() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function NovaConsulta() {
  const { pacienteId } = useLocalSearchParams<{ pacienteId?: string }>();
  const base = agoraArredondado();

  const inicial: ValoresConsulta = {
    paciente_id: pacienteId ?? '',
    data: base.toISOString().slice(0, 10),
    hora: base.toTimeString().slice(0, 5),
    duracao_min: 30,
    motivo: '',
    observacoes: '',
  };

  async function salvar(v: ValoresConsulta) {
    const iso = isoDeDataHora(v.data, v.hora);
    if (!iso) return 'Data ou hora inválida.';
    const { error } = await criarConsulta({
      paciente_id: v.paciente_id,
      inicio_em: iso,
      duracao_min: v.duracao_min,
      motivo: v.motivo.trim() || null,
      observacoes: v.observacoes.trim() || null,
    });
    if (error) return error;
    router.back();
    return null;
  }

  return (
    <FormConsulta
      inicial={inicial}
      pacienteTravado={!!pacienteId}
      textoBotao="Agendar consulta"
      onSubmit={salvar}
    />
  );
}
