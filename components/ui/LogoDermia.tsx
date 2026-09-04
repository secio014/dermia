import { Image } from 'react-native';

// Marca do DermIA: gota/chama (queimadura) com uma linha de pulso
// (acompanhamento clínico). Renderizada a partir do PNG
// assets/brand/dermia-mark.png (gerado de assets/brand/dermia-mark.svg).
// Usada nos cabeçalhos de todas as telas, na navegação da web e na landing.
export default function LogoDermia({ size = 22 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/brand/dermia-mark.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="DermIA"
    />
  );
}
