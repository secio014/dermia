import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
const MESES_CURTOS = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];
// Faixa de anos do seletor: 100 anos atrás até 5 à frente (mais novos primeiro).
const ANOS = Array.from({ length: 106 }, (_, i) => new Date().getFullYear() + 5 - i);

type Modo = 'dias' | 'meses' | 'anos';

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

// As setas navegam por mês (dias), por ano (meses) ou de 12 em 12 anos (anos).
function passo(ref: Date, modo: Modo, dir: -1 | 1): Date {
  if (modo === 'dias') return new Date(ref.getFullYear(), ref.getMonth() + dir, 1);
  if (modo === 'meses') return new Date(ref.getFullYear() + dir, ref.getMonth(), 1);
  return new Date(ref.getFullYear() + dir * 12, ref.getMonth(), 1);
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
  const [modo, setModo] = useState<Modo>('dias');
  const selecionada = deISO(valor);
  const [mesRef, setMesRef] = useState(() => selecionada ?? new Date());

  // Sempre volta pra visão de dias ao fechar.
  useEffect(() => {
    if (!aberto) setModo('dias');
  }, [aberto]);

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
            onPress={() => setMesRef(passo(mesRef, modo, -1))}
            className="w-9 h-9 items-center justify-center rounded-lg">
            <Ionicons name="chevron-back" size={20} color={cores.secundario} />
          </Pressable>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => setModo((m) => (m === 'meses' ? 'dias' : 'meses'))}
              className={`px-2 py-1 rounded-lg ${modo === 'meses' ? 'bg-primaria-suave' : ''}`}>
              <Text className="text-texto font-semibold capitalize">{MESES[mesRef.getMonth()]}</Text>
            </Pressable>
            <Pressable
              onPress={() => setModo((m) => (m === 'anos' ? 'dias' : 'anos'))}
              className={`px-2 py-1 rounded-lg ${modo === 'anos' ? 'bg-primaria-suave' : ''}`}>
              <Text className="text-texto font-semibold">{mesRef.getFullYear()}</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => setMesRef(passo(mesRef, modo, 1))}
            className="w-9 h-9 items-center justify-center rounded-lg">
            <Ionicons name="chevron-forward" size={20} color={cores.secundario} />
          </Pressable>
        </View>

        {modo === 'anos' ? (
          <ScrollView
            style={{ maxHeight: 240 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {ANOS.map((ano) => {
              const sel = ano === mesRef.getFullYear();
              return (
                <Pressable
                  key={ano}
                  onPress={() => {
                    setMesRef(new Date(ano, mesRef.getMonth(), 1));
                    setModo('meses');
                  }}
                  style={{ width: `${100 / 3}%` }}
                  className="h-11 items-center justify-center">
                  <View className={`px-3 py-1.5 rounded-lg ${sel ? 'bg-primaria' : ''}`}>
                    <Text className={`text-sm ${sel ? 'text-white font-bold' : 'text-texto'}`}>
                      {ano}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : modo === 'meses' ? (
          <View className="flex-row flex-wrap">
            {MESES_CURTOS.map((mes, i) => {
              const sel = i === mesRef.getMonth();
              return (
                <Pressable
                  key={mes}
                  onPress={() => {
                    setMesRef(new Date(mesRef.getFullYear(), i, 1));
                    setModo('dias');
                  }}
                  style={{ width: `${100 / 3}%` }}
                  className="h-14 items-center justify-center">
                  <View className={`px-4 py-2 rounded-lg ${sel ? 'bg-primaria' : ''}`}>
                    <Text
                      className={`text-sm capitalize ${sel ? 'text-white font-bold' : 'text-texto'}`}>
                      {mes}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <>
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
          </>
        )}

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
