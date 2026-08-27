import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { GRAUS_CLINICOS } from '@/.lib/scq';

export type ResultadoIA = {
  grau_sugerido?: string;
  confianca?: number;
  observacao?: string;
};

export default function ValidacaoIA({
  status,
  resultado,
  confianca,
  validacaoProfissional,
  onAceitar,
  onEditar,
  onRejeitar,
}: {
  status: string;
  resultado: ResultadoIA | null;
  confianca: number | null;
  validacaoProfissional: string | null;
  onAceitar: () => void;
  onEditar: (grauEscolhido: string) => void;
  onRejeitar: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [grauEscolhido, setGrauEscolhido] = useState(resultado?.grau_sugerido ?? '');

  if (status === 'pendente' || status === 'processando') {
    return (
      <View className="bg-superficie border border-borda rounded-xl p-4 items-center">
        <Text className="text-secundario">Análise de IA ainda não concluída.</Text>
      </View>
    );
  }

  if (status === 'erro') {
    return (
      <View className="bg-superficie border border-risco rounded-xl p-4 items-center">
        <Text className="text-risco text-center">A análise de IA falhou. Avalie manualmente.</Text>
      </View>
    );
  }

  if (validacaoProfissional) {
    return (
      <View className="bg-superficie border border-borda rounded-xl p-4">
        <Text className="text-texto font-semibold">
          Validação registrada: {validacaoProfissional}
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-superficie border border-atencao rounded-xl p-4">
      <Text className="text-atencao text-xs font-semibold mb-2">
        Sugestão de IA — validação obrigatória
      </Text>

      <Text className="text-texto font-semibold mb-1">
        Grau sugerido: {resultado?.grau_sugerido ?? 'não informado'}
      </Text>
      {confianca != null && (
        <Text className="text-secundario text-xs mb-3">Confiança: {Math.round(confianca * 100)}%</Text>
      )}

      {!editando ? (
        <View className="flex-row gap-2 mt-2">
          <Pressable
            onPress={onAceitar}
            className="flex-1 bg-ok rounded-xl py-2.5 items-center">
            <Text className="text-superficie font-semibold text-xs">Aceitar</Text>
          </Pressable>
          <Pressable
            onPress={() => setEditando(true)}
            className="flex-1 bg-superficie border border-borda rounded-xl py-2.5 items-center">
            <Text className="text-texto font-semibold text-xs">Editar</Text>
          </Pressable>
          <Pressable
            onPress={onRejeitar}
            className="flex-1 bg-superficie border border-risco rounded-xl py-2.5 items-center">
            <Text className="text-risco font-semibold text-xs">Rejeitar</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-2">
          <View className="flex-row flex-wrap gap-2 mb-3">
            {GRAUS_CLINICOS.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => setGrauEscolhido(g.id)}
                className={`px-3 py-1.5 rounded-lg border ${
                  grauEscolhido === g.id ? 'bg-primaria border-primaria' : 'bg-fundo border-borda'
                }`}>
                <Text
                  className={grauEscolhido === g.id ? 'text-superficie text-xs' : 'text-secundario text-xs'}>
                  {g.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => setEditando(false)}
              className="flex-1 bg-superficie border border-borda rounded-xl py-2.5 items-center">
              <Text className="text-texto font-semibold text-xs">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={() => grauEscolhido && onEditar(grauEscolhido)}
              disabled={!grauEscolhido}
              className="flex-1 bg-primaria rounded-xl py-2.5 items-center"
              style={{ opacity: grauEscolhido ? 1 : 0.5 }}>
              <Text className="text-superficie font-semibold text-xs">Confirmar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
