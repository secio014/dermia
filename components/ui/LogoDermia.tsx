import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// Marca do DermIA: gota/chama (queimadura) com uma linha de pulso
// (acompanhamento clínico). Mesmo desenho de assets/brand/dermia-mark.svg.
// Usada nos cabeçalhos de todas as telas e na navegação da web.
export default function LogoDermia({ size = 22 }: { size?: number }) {
  // id único por instância — dois <LinearGradient> com o mesmo id brigam na web.
  const grad = `chama-${useId().replace(/:/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Defs>
        <LinearGradient id={grad} x1="128" y1="72" x2="392" y2="452" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#F0546B" />
          <Stop offset="1" stopColor="#B0121F" />
        </LinearGradient>
      </Defs>
      <Path
        d="M256 48 C 256 48, 96 208, 96 320 a 160 160 0 1 0 320 0 C 416 208, 256 48, 256 48 Z"
        fill={`url(#${grad})`}
      />
      <Path
        d="M150 322 h60 l26 -70 l40 150 l30 -96 l20 46 h56"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={24}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
