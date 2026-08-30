import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTema } from '@/.lib/tema';

/**
 * Botão de alternância rápida claro/escuro para os cabeçalhos.
 * Um toque troca entre os dois temas fixos (o modo "Sistema" continua
 * disponível na tela de Ajustes / barra lateral da web). O ícone mostra o
 * tema para o qual o toque vai levar: lua no claro, sol no escuro.
 */
export default function BotaoTema({ size = 22 }: { size?: number }) {
  const { esquema, cores, escolher } = useTema();
  const vaiParaEscuro = esquema !== 'dark';

  return (
    <Pressable
      onPress={() => escolher(vaiParaEscuro ? 'dark' : 'light')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={vaiParaEscuro ? 'Ativar modo escuro' : 'Ativar modo claro'}
      style={{ padding: 6 }}>
      <Ionicons
        name={vaiParaEscuro ? 'moon-outline' : 'sunny-outline'}
        size={size}
        color={cores.secundario}
      />
    </Pressable>
  );
}
