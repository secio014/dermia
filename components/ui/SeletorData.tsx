import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/.lib/tema';

// Campo de data com calendário próprio (funciona igual em web e celular,
// no estilo do app). Valor no formato AAAA-MM-DD (string vazia = não preenchido).

const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function deISO(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

export default function SeletorData({
  valor,
  onChange,
  placeholder = 'Escolher data',
  opcional,
}: {
  valor: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  opcional?: boolean;
}) {
  const { cores } = useTema();
  const { width } = useWindowDimensions();
  const webLargo = Platform.OS === 'web' && width >= 768;
  const [aberto, setAberto] = useState(false);
  const selecionada = deISO(valor);
  const [mesRef, setMesRef] = useState(() => selecionada ?? new Date());

  const grade = useMemo(() => {
    const ano = mesRef.getFullYear();
    const mes = mesRef.getMonth();
    const primeiro = new Date(ano, mes, 1).getDay();
    const total = new Date(ano, mes + 1, 0).getDate();
    const celulas: (Date | null)[] = [];
    for (let i = 0; i < primeiro; i++) celulas.push(null);
    for (let d = 1; d <= total; d++) celulas.push(new Date(ano, mes, d));
    return celulas;
  }, [mesRef]);

  const rotulo = selecionada
    ? selecionada.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : placeholder;

  const hoje = new Date();

  function calendario(folha = false) {
    return (
      <View
        className={
          folha
            ? 'bg-superficie border-t border-borda rounded-t-3xl p-4 w-full'
            : 'bg-superficie border border-borda rounded-2xl p-4 w-[320px] max-w-full'
        }>
        {folha && (
          <View className="self-center w-10 h-1 rounded-full bg-borda mb-3" />
        )}
        <View className="flex-row items-center justify-between mb-3">
          <Pressable
            onPress={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() - 1, 1))}
            className="w-9 h-9 items-center justify-center rounded-lg">
            <Ionicons name="chevron-back" size={20} color={cores.secundario} />
          </Pressable>
          <Text className="text-texto font-semibold capitalize">
            {MESES[mesRef.getMonth()]} {mesRef.getFullYear()}
          </Text>
          <Pressable
            onPress={() => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + 1, 1))}
            className="w-9 h-9 items-center justify-center rounded-lg">
            <Ionicons name="chevron-forward" size={20} color={cores.secundario} />
          </Pressable>
        </View>

        <View className="flex-row mb-1">
          {DIAS.map((d, i) => (
            <View key={i} className="flex-1 items-center py-1">
              <Text className="text-secundario text-xs">{d}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {grade.map((dia, i) => {
            if (!dia) return <View key={i} style={{ width: `${100 / 7}%` }} className="h-10" />;
            const iso = paraISO(dia);
            const sel = iso === valor;
            const ehHoje =
              dia.getDate() === hoje.getDate() &&
              dia.getMonth() === hoje.getMonth() &&
              dia.getFullYear() === hoje.getFullYear();
            return (
              <Pressable
                key={i}
                onPress={() => {
                  onChange(iso);
                  setAberto(false);
                }}
                style={{ width: `${100 / 7}%` }}
                className="h-10 items-center justify-center">
                <View
                  className={`w-9 h-9 items-center justify-center rounded-full ${
                    sel ? 'bg-primaria' : ehHoje ? 'bg-primaria-suave' : ''
                  }`}>
                  <Text
                    className={`text-sm ${
                      sel ? 'text-white font-bold' : 'text-texto'
                    }`}>
                    {dia.getDate()}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row justify-between mt-2">
          <Pressable
            onPress={() => {
              onChange(paraISO(new Date()));
              setAberto(false);
            }}
            className="py-2 px-2">
            <Text className="text-primaria text-sm font-semibold">Hoje</Text>
          </Pressable>
          {opcional && valor ? (
            <Pressable
              onPress={() => {
                onChange('');
                setAberto(false);
              }}
              className="py-2 px-2">
              <Text className="text-secundario text-sm font-semibold">Limpar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={() => setAberto((a) => !a)}
        className="bg-superficie border border-borda rounded-xl px-4 py-3 flex-row items-center justify-between">
        <Text className={valor ? 'text-texto' : 'text-secundario'}>{rotulo}</Text>
        <Ionicons name="calendar-outline" size={18} color={cores.secundario} />
      </Pressable>

      {/* O calendário sempre abre num Modal (portal): na web do RN todo <View> é
          um stacking context próprio, então um popover absoluto ficaria preso
          atrás dos campos seguintes. Web larga = card centralizado; celular e
          web estreita = folha deslizando do rodapé. */}
      {aberto && (
        <Modal
          transparent
          animationType={webLargo ? 'fade' : 'slide'}
          onRequestClose={() => setAberto(false)}>
          <Pressable
            onPress={() => setAberto(false)}
            className={
              webLargo
                ? 'flex-1 bg-black/40 items-center justify-center px-6'
                : 'flex-1 bg-black/40 justify-end'
            }>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              className={webLargo ? undefined : 'pb-6'}>
              {calendario(!webLargo)}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
