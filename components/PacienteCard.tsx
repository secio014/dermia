import { Text, View } from 'react-native';

import { palette } from '@/constants/Colors';
import { GRAUS_CLINICOS } from '@/.lib/scq';

export type PainelPaciente = {
  paciente_id: string;
  codigo_pseudonimo: string;
  lesao_id: string;
  regiao_corporal: string;
  scq_percentual: number | null;
  grau_clinico: string | null;
  status: string;
  data_ocorrencia: string | null;
  dias_desde_lesao: number | null;
  ultimo_atendimento: string | null;
  analises_pendentes: number;
  prioridade: number;
};

function corPrioridade(prioridade: number): string {
  if (prioridade === 1) return palette.risco;
  if (prioridade === 2) return palette.atencao;
  return palette.ok;
}

function rotuloPrioridade(prioridade: number): string {
  if (prioridade === 1) return 'Crítico';
  if (prioridade === 2) return 'Atenção';
  return 'Estável';
}

function rotuloGrau(grau: string | null): string {
  return GRAUS_CLINICOS.find((g) => g.id === grau)?.rotulo ?? 'Grau não informado';
}

export default function PacienteCard({ paciente }: { paciente: PainelPaciente }) {
  const cor = corPrioridade(paciente.prioridade);

  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 mb-3 flex-row items-center">
      <View style={{ width: 6, alignSelf: 'stretch', backgroundColor: cor, borderRadius: 3 }} className="mr-3" />
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-texto font-semibold">{paciente.codigo_pseudonimo}</Text>
          <Text style={{ color: cor }} className="text-xs font-semibold">
            {rotuloPrioridade(paciente.prioridade)}
          </Text>
        </View>
        <Text className="text-secundario text-xs mb-1">
          {paciente.regiao_corporal} · {rotuloGrau(paciente.grau_clinico)}
        </Text>
        <View className="flex-row justify-between items-center">
          <Text className="text-secundario text-xs">
            SCQ {paciente.scq_percentual ?? 0}%
            {paciente.dias_desde_lesao != null &&
              ` · ${paciente.dias_desde_lesao} ${paciente.dias_desde_lesao === 1 ? 'dia' : 'dias'}`}
          </Text>
          {paciente.analises_pendentes > 0 && (
            <Text style={{ color: palette.atencao }} className="text-xs font-semibold">
              {paciente.analises_pendentes} análise(s) pendente(s)
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
