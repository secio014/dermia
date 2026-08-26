import { Text, View } from 'react-native';

import { palette } from '@/constants/Colors';

export type PainelPaciente = {
  paciente_id: string;
  codigo: string;
  nome: string;
  lesao_id: string | null;
  scq_percentual: number | null;
  data_lesao: string | null;
  dias_desde_lesao: number | null;
};

function prioridade(p: PainelPaciente): { cor: string; rotulo: string } {
  if (!p.lesao_id) return { cor: palette.secundario, rotulo: 'Sem lesão registrada' };
  const scq = p.scq_percentual ?? 0;
  const dias = p.dias_desde_lesao ?? 999;
  if (scq >= 20 || dias <= 3) return { cor: palette.risco, rotulo: 'Crítico' };
  if (scq >= 10 || dias <= 10) return { cor: palette.atencao, rotulo: 'Atenção' };
  return { cor: palette.ok, rotulo: 'Estável' };
}

export default function PacienteCard({ paciente }: { paciente: PainelPaciente }) {
  const { cor, rotulo } = prioridade(paciente);

  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 mb-3 flex-row items-center">
      <View style={{ width: 6, alignSelf: 'stretch', backgroundColor: cor, borderRadius: 3 }} className="mr-3" />
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-texto font-semibold">{paciente.nome}</Text>
          <Text className="text-secundario text-xs">{paciente.codigo}</Text>
        </View>
        <View className="flex-row justify-between items-center">
          <Text style={{ color: cor }} className="text-xs font-semibold">
            {rotulo}
          </Text>
          {paciente.lesao_id && (
            <Text className="text-secundario text-xs">
              SCQ {paciente.scq_percentual}% · {paciente.dias_desde_lesao}{' '}
              {paciente.dias_desde_lesao === 1 ? 'dia' : 'dias'} desde a lesão
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
