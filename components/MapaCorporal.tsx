import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Rect, Text as SvgText } from 'react-native-svg';

import { useTema } from '@/.lib/tema';
import { REGIOES, calcularSCQ, percentualDaRegiao, type RegiaoId } from '@/.lib/scq';

type Vista = 'frente' | 'costas';

const REGIOES_POR_VISTA: Record<Vista, RegiaoId[]> = {
  frente: ['cabeca', 'braco_esq', 'braco_dir', 'tronco_anterior', 'genitalia', 'perna_esq', 'perna_dir'],
  costas: ['cabeca', 'braco_esq', 'braco_dir', 'tronco_posterior', 'perna_esq', 'perna_dir'],
};

// Retângulos posicionados num viewBox 200x360 — um boneco esquemático, não anatômico.
const GEOMETRIA: Record<
  RegiaoId,
  { x: number; y: number; w: number; h: number; rx?: number; sigla: string }
> = {
  cabeca: { x: 76, y: 8, w: 48, h: 46, rx: 22, sigla: 'C' },
  braco_esq: { x: 14, y: 62, w: 30, h: 132, rx: 15, sigla: 'BE' },
  braco_dir: { x: 156, y: 62, w: 30, h: 132, rx: 15, sigla: 'BD' },
  tronco_anterior: { x: 58, y: 60, w: 84, h: 116, rx: 14, sigla: 'TA' },
  tronco_posterior: { x: 58, y: 60, w: 84, h: 116, rx: 14, sigla: 'TP' },
  genitalia: { x: 86, y: 180, w: 28, h: 18, rx: 6, sigla: 'G' },
  perna_esq: { x: 60, y: 202, w: 36, h: 150, rx: 16, sigla: 'PE' },
  perna_dir: { x: 104, y: 202, w: 36, h: 150, rx: 16, sigla: 'PD' },
};

export default function MapaCorporal({
  value,
  onChange,
  pediatrico,
  onTogglePediatrico,
}: {
  value: RegiaoId[];
  onChange: (regioes: RegiaoId[]) => void;
  pediatrico: boolean;
  onTogglePediatrico: (pediatrico: boolean) => void;
}) {
  const { cores } = useTema();
  const [vista, setVista] = useState<Vista>('frente');
  const scq = calcularSCQ(value, pediatrico);

  function alternarRegiao(regiao: RegiaoId) {
    onChange(
      value.includes(regiao) ? value.filter((r) => r !== regiao) : [...value, regiao]
    );
  }

  return (
    <View>
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row bg-superficie border border-borda rounded-xl overflow-hidden">
          {(['frente', 'costas'] as Vista[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVista(v)}
              className={`px-4 py-2 ${vista === v ? 'bg-primaria' : ''}`}>
              <Text className={vista === v ? 'text-superficie font-semibold' : 'text-secundario'}>
                {v === 'frente' ? 'Frente' : 'Costas'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => onTogglePediatrico(!pediatrico)}
          className="flex-row bg-superficie border border-borda rounded-xl overflow-hidden">
          <View className={`px-4 py-2 ${!pediatrico ? 'bg-primaria' : ''}`}>
            <Text className={!pediatrico ? 'text-superficie font-semibold' : 'text-secundario'}>
              Adulto
            </Text>
          </View>
          <View className={`px-4 py-2 ${pediatrico ? 'bg-primaria' : ''}`}>
            <Text className={pediatrico ? 'text-superficie font-semibold' : 'text-secundario'}>
              Pediátrico
            </Text>
          </View>
        </Pressable>
      </View>

      <Text className="text-secundario text-xs mb-2 text-center">
        Toque nas regiões atingidas — {vista === 'frente' ? 'vista de frente' : 'vista de costas'}
      </Text>

      <View className="items-center bg-superficie border border-borda rounded-xl py-4">
        <Svg width={220} height={372} viewBox="0 0 200 360">
          {/* Silhueta de fundo, só pra dar forma de corpo ao boneco. */}
          <G opacity={0.5}>
            <Circle cx={100} cy={31} r={24} fill={cores.borda} />
            <Rect x={92} y={50} width={16} height={14} fill={cores.borda} />
            <Rect x={52} y={58} width={96} height={124} rx={20} fill={cores.borda} />
            <Rect x={12} y={60} width={30} height={140} rx={15} fill={cores.borda} />
            <Rect x={158} y={60} width={30} height={140} rx={15} fill={cores.borda} />
            <Rect x={58} y={196} width={38} height={158} rx={18} fill={cores.borda} />
            <Rect x={104} y={196} width={38} height={158} rx={18} fill={cores.borda} />
            <Ellipse cx={100} cy={188} rx={46} ry={16} fill={cores.borda} />
          </G>

          {REGIOES_POR_VISTA[vista].map((regiao) => {
            const g = GEOMETRIA[regiao];
            const marcada = value.includes(regiao);
            return (
              <G key={regiao} onPress={() => alternarRegiao(regiao)}>
                <Rect
                  x={g.x}
                  y={g.y}
                  width={g.w}
                  height={g.h}
                  rx={g.rx ?? 8}
                  fill={marcada ? cores.risco : cores.primariaSuave}
                  stroke={marcada ? cores.risco : cores.borda}
                  strokeWidth={marcada ? 3 : 2}
                />
                <SvgText
                  x={g.x + g.w / 2}
                  y={g.y + g.h / 2 + 4}
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="middle"
                  fill={marcada ? cores.superficie : cores.secundario}>
                  {g.sigla}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      <View className="flex-row flex-wrap gap-2 mt-3">
        {REGIOES.map((r) => {
          const marcada = value.includes(r.id);
          return (
            <Pressable
              key={r.id}
              onPress={() => alternarRegiao(r.id)}
              className={`px-3 py-1.5 rounded-lg border ${
                marcada ? 'bg-risco border-risco' : 'bg-superficie border-borda'
              }`}>
              <Text className={marcada ? 'text-superficie text-xs' : 'text-secundario text-xs'}>
                {r.rotulo} ({percentualDaRegiao(r.id, pediatrico)}%)
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-4 bg-fundo border border-borda rounded-xl py-3 items-center">
        <Text className="text-secundario text-xs mb-1">
          Superfície Corporal Queimada · {value.length}{' '}
          {value.length === 1 ? 'região' : 'regiões'}
        </Text>
        <Text className="text-texto text-3xl font-bold">{scq}%</Text>
      </View>
    </View>
  );
}
