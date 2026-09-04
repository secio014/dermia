import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import SeletorData from '@/components/ui/SeletorData';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

type PacienteOpcao = { id: string; nome_completo: string; codigo_pseudonimo: string };

export type ValoresConsulta = {
  paciente_id: string;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM
  duracao_min: number;
  motivo: string;
  observacoes: string;
};

const campo = 'bg-superficie border border-borda rounded-xl px-4 py-3 text-texto';

export function isoDeDataHora(data: string, hora: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.trim());
  const h = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m || !h) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(h[1]),
    Number(h[2])
  );
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function FormConsulta({
  inicial,
  pacienteTravado,
  textoBotao,
  onSubmit,
}: {
  inicial: ValoresConsulta;
  pacienteTravado?: boolean;
  textoBotao: string;
  onSubmit: (v: ValoresConsulta) => Promise<string | null>;
}) {
  const { cores } = useTema();
  const [v, setV] = useState<ValoresConsulta>(inicial);
  const [pacientes, setPacientes] = useState<PacienteOpcao[]>([]);
  const [buscaPac, setBuscaPac] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (pacienteTravado) return;
    supabase
      .from('pacientes')
      .select('id, nome_completo, codigo_pseudonimo')
      .order('nome_completo', { ascending: true })
      .then(({ data }) => setPacientes((data as PacienteOpcao[] | null) ?? []));
  }, [pacienteTravado]);

  const pacienteSel = useMemo(
    () => pacientes.find((p) => p.id === v.paciente_id),
    [pacientes, v.paciente_id]
  );

  const listaPac = useMemo(() => {
    const t = buscaPac.trim().toLowerCase();
    return pacientes
      .filter(
        (p) =>
          !t ||
          p.nome_completo?.toLowerCase().includes(t) ||
          p.codigo_pseudonimo?.toLowerCase().includes(t)
      )
      .slice(0, 6);
  }, [pacientes, buscaPac]);

  function set<K extends keyof ValoresConsulta>(k: K, val: ValoresConsulta[K]) {
    setV((atual) => ({ ...atual, [k]: val }));
  }

  async function enviar() {
    if (!v.paciente_id) return setErro('Escolha o paciente.');
    if (!isoDeDataHora(v.data, v.hora)) return setErro('Data ou hora inválida.');
    if (!(v.duracao_min > 0)) return setErro('Duração inválida.');
    setErro(null);
    setSalvando(true);
    const msg = await onSubmit(v);
    setSalvando(false);
    if (msg) setErro(msg);
  }

  return (
    <ScrollView
      className="flex-1 bg-fundo px-4 pt-4"
      contentContainerClassName="w-full max-w-3xl self-center"
      contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-secundario text-xs font-semibold mb-1">PACIENTE</Text>
      {pacienteTravado || pacienteSel ? (
        <View className="bg-superficie border border-borda rounded-xl px-4 py-3 mb-3">
          <Text className="text-texto font-semibold">
            {pacienteSel?.nome_completo ?? 'Paciente selecionado'}
          </Text>
          {pacienteSel?.codigo_pseudonimo ? (
            <Text className="text-secundario text-xs">{pacienteSel.codigo_pseudonimo}</Text>
          ) : null}
          {!pacienteTravado && (
            <Pressable onPress={() => set('paciente_id', '')} className="mt-1">
              <Text className="text-primaria text-xs font-semibold">Trocar</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View className="mb-3">
          <TextInput
            value={buscaPac}
            onChangeText={setBuscaPac}
            placeholder="Buscar paciente"
            placeholderTextColor={cores.secundario}
            className={campo}
          />
          {listaPac.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                set('paciente_id', p.id);
                setBuscaPac('');
              }}
              className="bg-superficie border border-borda rounded-xl px-4 py-2.5 mt-2">
              <Text className="text-texto text-sm font-semibold">{p.nome_completo}</Text>
              <Text className="text-secundario text-xs">{p.codigo_pseudonimo}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-secundario text-xs font-semibold mb-1">DATA</Text>
          <SeletorData valor={v.data} onChange={(iso) => set('data', iso)} />
        </View>
        <View className="w-28">
          <Text className="text-secundario text-xs font-semibold mb-1">HORA</Text>
          <TextInput
            value={v.hora}
            onChangeText={(t) => set('hora', t)}
            placeholder="14:00"
            placeholderTextColor={cores.secundario}
            className={campo}
          />
        </View>
      </View>

      <Text className="text-secundario text-xs font-semibold mb-1">DURAÇÃO (MIN)</Text>
      <TextInput
        value={String(v.duracao_min)}
        onChangeText={(t) => set('duracao_min', Number(t.replace(/\D/g, '')) || 0)}
        keyboardType="numeric"
        className={`${campo} mb-3`}
      />

      <Text className="text-secundario text-xs font-semibold mb-1">MOTIVO</Text>
      <TextInput
        value={v.motivo}
        onChangeText={(t) => set('motivo', t)}
        placeholder="Ex.: reavaliação, troca de curativo"
        placeholderTextColor={cores.secundario}
        className={`${campo} mb-3`}
      />

      <Text className="text-secundario text-xs font-semibold mb-1">OBSERVAÇÕES</Text>
      <TextInput
        value={v.observacoes}
        onChangeText={(t) => set('observacoes', t)}
        placeholder="Opcional"
        placeholderTextColor={cores.secundario}
        multiline
        className={`${campo} mb-4 min-h-[80px]`}
      />

      {erro && <Text className="text-risco mb-3">{erro}</Text>}

      <Pressable
        onPress={enviar}
        disabled={salvando}
        className="bg-primaria rounded-xl py-3.5 items-center">
        {salvando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold">{textoBotao}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
