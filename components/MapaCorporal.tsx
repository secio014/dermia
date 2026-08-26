import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { palette } from '@/constants/Colors';
import { REGIOES, calcularSCQ, percentualDaRegiao, type RegiaoId } from '@/.lib/scq';

type Vista = 'frente' | 'costas';

const REGIOES_POR_VISTA: Record<Vista, RegiaoId[]> = {
  frente: ['cabeca', 'braco_esq', 'braco_dir', 'tronco_anterior', 'genitalia', 'perna_esq', 'perna_dir'],
  costas: ['cabeca', 'braco_esq', 'braco_dir', 'tronco_posterior', 'perna_esq', 'perna_dir'],
};

// Retângulos posicionados num viewBox 200x340 — um boneco esquemático, não anatômico.
const GEOMETRIA: Record<RegiaoId, { x: number; y: number; w: number; h: number; rx?: number }> = {
  cabeca: { x: 80, y: 10, w: 40, h: 40, rx: 16 },
  braco_esq: { x: 20, y: 55, w: 30, h: 130, rx: 10 },
  braco_dir: { x: 150, y: 55, w: 30, h: 130, rx: 10 },
  tronco_anterior: { x: 65, y: 55, w: 70, h: 110, rx: 8 },
  tronco_posterior: { x: 65, y: 55, w: 70, h: 110, rx: 8 },
  genitalia: { x: 90, y: 160, w: 20, h: 14, rx: 4 },
  perna_esq: { x: 65, y: 190, w: 32, h: 140, rx: 10 },
  perna_dir: { x: 103, y: 190, w: 32, h: 140, rx: 10 },
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

      <View className="items-center bg-superficie border border-borda rounded-xl py-4">
        <Svg width={200} height={340} viewBox="0 0 200 340">
          {REGIOES_POR_VISTA[vista].map((regiao) => {
            const g = GEOMETRIA[regiao];
            const marcada = value.includes(regiao);
            return (
              <Rect
                key={regiao}
                x={g.x}
                y={g.y}
                width={g.w}
                height={g.h}
                rx={g.rx ?? 6}
                fill={marcada ? palette.risco : palette.fundo}
                stroke={palette.borda}
                strokeWidth={2}
                onPress={() => alternarRegiao(regiao)}
              />
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
        <Text className="text-secundario text-xs mb-1">Superfície Corporal Queimada</Text>
        <Text className="text-texto text-3xl font-bold">{scq}%</Text>
      </View>
    </View>
  );
}
