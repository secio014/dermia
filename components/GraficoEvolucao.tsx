import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { palette } from '@/constants/Colors';

export type PontoEvolucao = { data: string; grauAtivo: number; grauPassivo: number };

const LARGURA = 320;
const ALTURA = 180;
const MARGEM = 28;

export default function GraficoEvolucao({ pontos }: { pontos: PontoEvolucao[] }) {
  if (pontos.length === 0) {
    return (
      <View className="bg-superficie border border-borda rounded-xl p-4 items-center">
        <Text className="text-secundario">Sem medidas suficientes para o gráfico ainda.</Text>
      </View>
    );
  }

  const max = 180; // graus, escala fixa de goniometria
  const largarUtil = LARGURA - MARGEM * 2;
  const alturaUtil = ALTURA - MARGEM * 2;

  const posX = (i: number) =>
    pontos.length === 1 ? MARGEM : MARGEM + (i / (pontos.length - 1)) * largarUtil;
  const posY = (valor: number) => MARGEM + alturaUtil - (valor / max) * alturaUtil;

  const pontosAtivo = pontos.map((p, i) => `${posX(i)},${posY(p.grauAtivo)}`).join(' ');
  const pontosPassivo = pontos.map((p, i) => `${posX(i)},${posY(p.grauPassivo)}`).join(' ');

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

        <Polyline points={pontosPassivo} fill="none" stroke={palette.secundario} strokeWidth={2} />
        <Polyline points={pontosAtivo} fill="none" stroke={palette.primaria} strokeWidth={2} />

        {pontos.map((p, i) => (
          <Circle key={`a${i}`} cx={posX(i)} cy={posY(p.grauAtivo)} r={3} fill={palette.primaria} />
        ))}
        {pontos.map((p, i) => (
          <Circle key={`p${i}`} cx={posX(i)} cy={posY(p.grauPassivo)} r={3} fill={palette.secundario} />
        ))}
      </Svg>
      <View className="flex-row gap-4 mt-2">
        <View className="flex-row items-center gap-1">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primaria }} />
          <Text className="text-secundario text-xs">Ativo</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.secundario }} />
          <Text className="text-secundario text-xs">Passivo</Text>
        </View>
      </View>
    </View>
  );
}
