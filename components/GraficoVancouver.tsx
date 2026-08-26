import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { palette } from '@/constants/Colors';
import { VANCOUVER_MAXIMO } from '@/.lib/vancouver';

export type PontoVancouver = { data: string; total: number };

const LARGURA = 320;
const ALTURA = 160;
const MARGEM = 28;

export default function GraficoVancouver({ pontos }: { pontos: PontoVancouver[] }) {
  if (pontos.length === 0) {
    return (
      <View className="bg-superficie border border-borda rounded-xl p-4 items-center">
        <Text className="text-secundario">Sem avaliações de cicatriz (Vancouver) ainda.</Text>
      </View>
    );
  }

  const largarUtil = LARGURA - MARGEM * 2;
  const alturaUtil = ALTURA - MARGEM * 2;

  const posX = (i: number) =>
    pontos.length === 1 ? MARGEM : MARGEM + (i / (pontos.length - 1)) * largarUtil;
  const posY = (valor: number) => MARGEM + alturaUtil - (valor / VANCOUVER_MAXIMO) * alturaUtil;

  const linha = pontos.map((p, i) => `${posX(i)},${posY(p.total)}`).join(' ');

  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 items-center">
      <Svg width={LARGURA} height={ALTURA}>
        <Line
          x1={MARGEM}
          y1={MARGEM + alturaUtil}
          x2={LARGURA - MARGEM}
          y2={MARGEM + alturaUtil}
          stroke={palette.borda}
          strokeWidth={1}
        />
        <Line x1={MARGEM} y1={MARGEM} x2={MARGEM} y2={MARGEM + alturaUtil} stroke={palette.borda} strokeWidth={1} />
        <Polyline points={linha} fill="none" stroke={palette.risco} strokeWidth={2} />
        {pontos.map((p, i) => (
          <Circle key={i} cx={posX(i)} cy={posY(p.total)} r={3} fill={palette.risco} />
        ))}
      </Svg>
      <Text className="text-secundario text-xs mt-1">
        Escala de Vancouver (0-{VANCOUVER_MAXIMO}, menor é melhor)
      </Text>
    </View>
  );
}
