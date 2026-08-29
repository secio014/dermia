import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';

// Aplica a fonte Inter em todo <Text>/<TextInput> sem precisar editar cada tela.
// Mapeia o fontWeight (que o NativeWind gera a partir de font-medium/semibold/bold)
// para o arquivo Inter correspondente — no nativo o peso não troca o glifo sozinho
// quando há fontFamily custom.

function familiaPorPeso(peso: unknown): string {
  switch (String(peso)) {
    case '500':
      return 'Inter_500Medium';
    case '600':
      return 'Inter_600SemiBold';
    case '700':
    case '800':
    case '900':
    case 'bold':
      return 'Inter_700Bold';
    default:
      return 'Inter_400Regular';
  }
}

function aplicar(Componente: any) {
  if (!Componente || Componente.__inter || typeof Componente.render !== 'function') return;
  const renderOriginal = Componente.render;
  Componente.render = function (...args: any[]) {
    const props = args[0] ?? {};
    const plano = StyleSheet.flatten(props.style) || {};
    const familia = plano.fontFamily ?? familiaPorPeso(plano.fontWeight);
    args[0] = { ...props, style: [{ fontFamily: familia }, props.style] };
    return renderOriginal.apply(this, args);
  };
  Componente.__inter = true;
}

export function instalarFonteInter() {
  aplicar(RNText);
  aplicar(RNTextInput);
}
