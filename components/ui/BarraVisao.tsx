import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePapelEfetivo } from '@/.lib/acesso';
import { definirVisao } from '@/.lib/visao';
import { useTema } from '@/.lib/tema';

const ROTULO: Record<string, string> = {
  admin: 'Admin da clínica',
  fisioterapeuta: 'Fisioterapeuta',
  estagiario: 'Estagiário',
  paciente: 'Paciente',
};

/**
 * Faixa fixa no topo enquanto um admin_geral está usando o "Ver como". Deixa
 * claro que a visão é simulada e dá um jeito rápido de voltar ao normal.
 */
export default function BarraVisao() {
  const { simulando } = usePapelEfetivo();
  const { cores } = useTema();

  if (!simulando) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: cores.primaria,
      }}>
      <Ionicons name="eye-outline" size={15} color="#FFFFFF" />
      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
        Vendo como {ROTULO[simulando] ?? simulando} — visão de demonstração
      </Text>
      <Pressable
        onPress={() => definirVisao(null)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 3,
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
        <Ionicons name="close" size={13} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Sair</Text>
      </Pressable>
    </View>
  );
}
