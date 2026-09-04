import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Text, View } from 'react-native';

import { exibirTelefone } from '@/.lib/telefone';
import { useTema } from '@/.lib/tema';
import { supabase } from '@/.lib/supabase';

// Dados da clínica + do profissional responsável pelo paciente, num cartão
// compacto no topo do portal. O esquema de `clinicas` não é fixo neste projeto
// (ver dermia_schema_source_of_truth) — lê os campos de forma defensiva.

type Clinica = Record<string, unknown> | null;
type Profissional = { nome: string; papel: string } | null;

function textoClinica(c: Record<string, unknown>): {
  nome: string;
  telefone: string | null;
  endereco: string | null;
} {
  const nome =
    (c.nome as string) || (c.razao_social as string) || (c.nome_fantasia as string) || 'Sua clínica';
  const telBruto =
    (c.telefone as string) || (c.whatsapp as string) || (c.contato as string) || null;
  const endereco =
    (c.endereco as string) || (c.logradouro as string) || (c.endereco_completo as string) || null;
  return { nome, telefone: telBruto, endereco };
}

function rotuloPapel(papel: string): string {
  if (papel === 'admin' || papel === 'admin_geral') return 'Administrador(a)';
  if (papel === 'estagiario') return 'Estagiário(a)';
  return 'Fisioterapeuta';
}

export default function CartaoClinica({
  clinicaId,
  responsavelId,
}: {
  clinicaId: string | null;
  responsavelId: string | null;
}) {
  const { cores } = useTema();
  const [clinica, setClinica] = useState<Clinica>(null);
  const [responsavel, setResponsavel] = useState<Profissional>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        clinicaId
          ? supabase.from('clinicas').select('*').eq('id', clinicaId).maybeSingle()
          : Promise.resolve({ data: null }),
        responsavelId
          ? supabase.from('profissionais').select('nome, papel').eq('id', responsavelId).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!vivo) return;
      setClinica((c as Record<string, unknown>) ?? null);
      setResponsavel((p as Profissional) ?? null);
    })();
    return () => {
      vivo = false;
    };
  }, [clinicaId, responsavelId]);

  if (!clinica && !responsavel) return null;

  const info = clinica ? textoClinica(clinica) : null;
  const telefoneExibido = info?.telefone ? exibirTelefone(info.telefone.replace(/\D/g, '')) : null;

  return (
    <View className="bg-superficie border border-borda rounded-xl p-4 mb-4">
      {info && (
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons name="business-outline" size={16} color={cores.primaria} />
          <Text className="text-texto font-semibold flex-1">{info.nome}</Text>
        </View>
      )}
      {info?.endereco && (
        <Text className="text-secundario text-xs ml-6 mb-1">{info.endereco}</Text>
      )}
      {telefoneExibido && (
        <Text
          onPress={() => Linking.openURL(`tel:${info?.telefone?.replace(/\D/g, '')}`)}
          className="text-primaria text-xs font-semibold ml-6 mb-1">
          {telefoneExibido}
        </Text>
      )}
      {responsavel && (
        <View className="flex-row items-center gap-2 mt-1">
          <Ionicons name="person-outline" size={16} color={cores.secundario} />
          <Text className="text-secundario text-xs">
            Responsável: <Text className="text-texto font-semibold">{responsavel.nome}</Text> ·{' '}
            {rotuloPapel(responsavel.papel)}
          </Text>
        </View>
      )}
    </View>
  );
}
